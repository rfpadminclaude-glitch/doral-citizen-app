import { ArrowLeft, Bot, User } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { relativeTime, sentimentClass } from '@/lib/admin/format';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ConversationDetail({ params }: { params: { id: string } }) {
  const sb = createClient();

  const { data: conv } = await sb
    .from('conversations')
    .select('id, session_id, channel, lang, resident_name, overall_sentiment, started_at, last_activity_at, status')
    .eq('id', params.id)
    .maybeSingle();

  if (!conv) notFound();

  const { data: messages } = await sb
    .from('messages')
    .select(
      'id, role, content, lang, sentiment, sentiment_score, llm_provider, latency_ms, tokens_in, tokens_out, created_at'
    )
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/conversations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to conversations
        </Link>
      </div>

      {/* Header */}
      <header className="rounded-2xl border border-border bg-surface-2 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Session transcript
        </p>
        <h1 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">
          {conv.resident_name ?? `Anonymous resident #${conv.session_id.slice(0, 6).toUpperCase()}`}
        </h1>
        <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
          {conv.session_id}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded bg-surface px-1.5 py-0.5 uppercase tracking-wider">{conv.channel}</span>
          <span className="rounded bg-surface px-1.5 py-0.5 uppercase tracking-wider">{conv.lang}</span>
          <span>started {relativeTime(conv.started_at)}</span>
          <span>·</span>
          <span>last activity {relativeTime(conv.last_activity_at)}</span>
          {conv.overall_sentiment && (
            <span
              className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                sentimentClass[conv.overall_sentiment] ?? sentimentClass.neutral
              }`}
            >
              overall: {conv.overall_sentiment}
            </span>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="space-y-3">
        {(messages ?? []).length === 0 && (
          <p className="rounded-2xl border border-border bg-surface-2 p-6 text-center text-sm text-muted-foreground">
            No messages recorded.
          </p>
        )}
        {(messages ?? [])
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => (
            <article
              key={m.id}
              className={cn(
                'flex gap-3 rounded-2xl border border-border bg-surface p-4',
                m.role === 'user' && 'bg-surface-2'
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  m.role === 'user' ? 'bg-muted text-foreground' : 'bg-primary/10 text-primary'
                )}
                aria-hidden="true"
              >
                {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>{m.role}</span>
                  <span>·</span>
                  <span>{new Date(m.created_at).toLocaleString()}</span>
                  {m.llm_provider && m.llm_provider !== 'none' && (
                    <span className="rounded bg-surface-2 px-1.5 text-muted-foreground">
                      via {m.llm_provider}
                    </span>
                  )}
                  {m.latency_ms != null && <span>· {m.latency_ms}ms</span>}
                  {m.sentiment && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 normal-case tracking-normal',
                        sentimentClass[m.sentiment] ?? sentimentClass.neutral
                      )}
                    >
                      {m.sentiment}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{m.content}</p>
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}
