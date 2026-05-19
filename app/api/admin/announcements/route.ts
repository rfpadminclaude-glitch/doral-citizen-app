import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  title_en: z.string().min(1).max(200),
  title_es: z.string().min(1).max(200),
  body_en: z.string().min(1).max(2000),
  body_es: z.string().min(1).max(2000),
  severity: z.enum(['info', 'warning', 'urgent']).default('info'),
  expires_at: z.string().datetime().nullable().optional(),
  channels: z.array(z.enum(['web', 'sms', 'push'])).default(['web'])
});

export async function POST(req: NextRequest) {
  const sb = createClient();
  const {
    data: { user }
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: admin } = await sb
    .from('admin_users')
    .select('id, role')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (!admin || admin.role === 'viewer') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

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

  const a = createAdminClient();
  const { data: row, error } = await a
    .from('announcements')
    .insert({
      title_en: parsed.data.title_en,
      title_es: parsed.data.title_es,
      body_en: parsed.data.body_en,
      body_es: parsed.data.body_es,
      severity: parsed.data.severity,
      publish_at: new Date().toISOString(),
      expires_at: parsed.data.expires_at ?? null,
      channels: parsed.data.channels,
      created_by: admin.id
    })
    .select('id, title_en, title_es, severity, publish_at, expires_at')
    .single();

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }

  await a.from('audit_log').insert({
    actor_type: 'admin',
    actor_id: admin.id,
    action: 'announcement.published',
    entity_type: 'announcement',
    entity_id: row.id,
    metadata: {
      title_en: row.title_en,
      severity: row.severity,
      channels: parsed.data.channels
    }
  });

  return NextResponse.json({ ok: true, ...row });
}
