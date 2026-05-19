import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  message_id: z.string().uuid(),
  conversation_id: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional()
});

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

  // Verify the message exists and pull its conversation_id (don't trust the client).
  const { data: msg, error: msgErr } = await sb
    .from('messages')
    .select('id, conversation_id, role')
    .eq('id', parsed.data.message_id)
    .maybeSingle();
  if (msgErr || !msg) {
    return NextResponse.json({ error: 'message not found' }, { status: 404 });
  }
  if (msg.role !== 'assistant') {
    return NextResponse.json({ error: 'feedback only on assistant messages' }, { status: 400 });
  }

  const { data: row, error } = await sb
    .from('feedback_ratings')
    .insert({
      message_id: msg.id,
      conversation_id: msg.conversation_id,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null
    })
    .select('id, created_at')
    .single();

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }

  await sb.from('audit_log').insert({
    actor_type: 'resident',
    action: 'feedback.submitted',
    entity_type: 'message',
    entity_id: msg.id,
    metadata: { rating: parsed.data.rating, has_comment: !!parsed.data.comment }
  });

  return NextResponse.json({ ok: true, id: row.id });
}
