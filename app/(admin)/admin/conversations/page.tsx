import { createClient } from '@/lib/supabase/server';
import { ConversationsClient } from './ConversationsClient';

export const dynamic = 'force-dynamic';

export default async function ConversationsPage() {
  const sb = createClient();

  // Fetch the conversations first, then scope the message-count query to
  // just those IDs. The previous implementation did `select('conversation_id')`
  // with no filter, which on a busy production DB would scan every message
  // row in the table on every page load (effectively an N+1 in disguise).
  const { data: conversations } = await sb
    .from('conversations')
    .select(
      'id, session_id, channel, lang, resident_name, overall_sentiment, last_activity_at, started_at'
    )
    .order('last_activity_at', { ascending: false })
    .limit(200);

  const ids = (conversations ?? []).map((c) => c.id);
  const { data: counts } = ids.length
    ? await sb.from('messages').select('conversation_id').in('conversation_id', ids)
    : { data: [] as Array<{ conversation_id: string }> };

  const countByConv = new Map<string, number>();
  for (const m of counts ?? []) {
    countByConv.set(m.conversation_id, (countByConv.get(m.conversation_id) ?? 0) + 1);
  }

  const rows = (conversations ?? []).map((c) => ({
    id: c.id,
    session_id: c.session_id,
    channel: c.channel,
    lang: c.lang,
    resident_name: c.resident_name as string | null,
    overall_sentiment: c.overall_sentiment as string | null,
    last_activity_at: c.last_activity_at as string | null,
    msg_count: countByConv.get(c.id) ?? 0
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Resident sessions
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Conversations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every resident chat session, newest first. Click a row to read the full transcript.
        </p>
      </header>

      <ConversationsClient rows={rows} />
    </div>
  );
}
