import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id;
  // Accept either a real UUID or our legacy `sess_*` fallback.
  if (!UUID_RE.test(sessionId) && !sessionId.startsWith('sess_')) {
    return NextResponse.json({ error: 'invalid session id' }, { status: 400 });
  }

  const sb = createAdminClient();

  const { data: conv, error: convErr } = await sb
    .from('conversations')
    .select('id, session_id, lang, started_at, last_activity_at')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });
  if (!conv) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: messages, error: msgErr } = await sb
    .from('messages')
    .select(
      'id, role, content, lang, sentiment, sentiment_score, llm_provider, created_at'
    )
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

  return NextResponse.json({
    conversation: conv,
    messages: messages ?? []
  });
}
