import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Status = z.enum(['new', 'in_progress', 'resolved', 'closed']);
const Priority = z.enum(['low', 'normal', 'high', 'urgent']);

const Body = z
  .object({
    status: Status.optional(),
    priority: Priority.optional(),
    notes: z.string().trim().min(1).max(2000).optional()
  })
  .refine(
    (b) => b.status !== undefined || b.priority !== undefined || b.notes !== undefined,
    { message: 'one of status / priority / notes is required' }
  );

async function assertAdmin(): Promise<
  { adminId: string; role: string } | { error: string; status: number }
> {
  const sb = createClient();
  const {
    data: { user }
  } = await sb.auth.getUser();
  if (!user) return { error: 'unauthenticated', status: 401 };
  const { data: admin } = await sb
    .from('admin_users')
    .select('id, role')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (!admin || admin.role === 'viewer') {
    return { error: 'forbidden', status: 403 };
  }
  return { adminId: admin.id, role: admin.role };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid payload', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Load current row so the audit log can record the from→to transition.
  const { data: before } = await admin
    .from('service_requests')
    .select('id, status, priority, title')
    .eq('id', params.id)
    .maybeSingle();
  if (!before) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Build the update set — only include fields that changed.
  const update: Record<string, unknown> = {};
  if (parsed.data.status && parsed.data.status !== before.status) {
    update.status = parsed.data.status;
  }
  if (parsed.data.priority && parsed.data.priority !== before.priority) {
    update.priority = parsed.data.priority;
  }
  if (Object.keys(update).length > 0) {
    const { error: updErr } = await admin
      .from('service_requests')
      .update(update)
      .eq('id', params.id);
    if (updErr) {
      return NextResponse.json(
        { error: 'update failed', detail: updErr.message },
        { status: 500 }
      );
    }
  }

  // Audit-log entries — one per real change, plus one for any note added.
  // The audit log is the canonical history; we don't add a notes column.
  const audits: Array<{
    actor_type: string;
    actor_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: Record<string, unknown>;
  }> = [];

  if (update.status) {
    audits.push({
      actor_type: 'admin',
      actor_id: auth.adminId,
      action: 'service_request.status_changed',
      entity_type: 'service_request',
      entity_id: before.id,
      metadata: { from: before.status, to: update.status, title: before.title }
    });
  }
  if (update.priority) {
    audits.push({
      actor_type: 'admin',
      actor_id: auth.adminId,
      action: 'service_request.priority_changed',
      entity_type: 'service_request',
      entity_id: before.id,
      metadata: { from: before.priority, to: update.priority, title: before.title }
    });
  }
  if (parsed.data.notes) {
    audits.push({
      actor_type: 'admin',
      actor_id: auth.adminId,
      action: 'service_request.note_added',
      entity_type: 'service_request',
      entity_id: before.id,
      metadata: { note: parsed.data.notes, title: before.title }
    });
  }
  if (audits.length > 0) {
    await admin.from('audit_log').insert(audits);
  }

  // Return the freshly-updated row so the client can replace its local copy.
  const { data: after } = await admin
    .from('service_requests')
    .select('id, status, priority, updated_at')
    .eq('id', params.id)
    .single();

  return NextResponse.json({ ok: true, request: after });
}
