import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  conversation_session_id: z.string().min(1),
  request_type: z.enum([
    'permit',
    'code_violation',
    'park_issue',
    'general',
    'pothole',
    'inspection',
    'complaint'
  ]),
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(2000),
  resident_name: z.string().min(1).max(160),
  resident_contact: z.string().min(3).max(160),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional()
});

function caseCode(uuid: string): string {
  // Short, human-friendly: "SR-" + first 6 chars of UUID uppercased.
  return `SR-${uuid.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
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

  const sb = createAdminClient();

  // Find or null the conversation FK.
  const { data: conv } = await sb
    .from('conversations')
    .select('id')
    .eq('session_id', parsed.data.conversation_session_id)
    .maybeSingle();

  const { data: sr, error } = await sb
    .from('service_requests')
    .insert({
      conversation_id: conv?.id ?? null,
      request_type: parsed.data.request_type,
      title: parsed.data.title,
      description: parsed.data.description,
      status: 'new',
      priority: parsed.data.priority ?? 'normal',
      resident_name: parsed.data.resident_name,
      resident_contact: parsed.data.resident_contact
    })
    .select('id, status, request_type, title, created_at')
    .single();

  if (error || !sr) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }

  await sb.from('audit_log').insert({
    actor_type: 'resident',
    action: 'service_request.created',
    entity_type: 'service_request',
    entity_id: sr.id,
    metadata: {
      request_type: sr.request_type,
      session_id: parsed.data.conversation_session_id
    }
  });

  return NextResponse.json({
    id: sr.id,
    case_code: caseCode(sr.id),
    status: sr.status,
    request_type: sr.request_type,
    created_at: sr.created_at
  });
}
