import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  CalendarClock,
  ChevronRight,
  FileWarning,
  ShieldAlert,
  Sparkles,
  User,
  Wrench
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  conversationSummary,
  formatDuration,
  loadCitationSources
} from '@/lib/admin/conversations';
import { caseCodeFromUuid, relativeTime, sentimentClass } from '@/lib/admin/format';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { TranscriptActions } from './TranscriptActions';

export const dynamic = 'force-dynamic';

type Msg = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  lang: string | null;
  sentiment: string | null;
  sentiment_score: number | null;
  llm_provider: string | null;
  latency_ms: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  retrieved_chunk_ids: string[] | null;
  pii_detected: boolean;
  created_at: string;
};

type Group =
  | { kind: 'turn'; message: Msg; gapMs: number }
  | { kind: 'tools'; messages: Msg[]; gapMs: number };

function groupMessages(messages: Msg[]): Group[] {
  const groups: Group[] = [];
  let prevTs: number | null = null;
  let toolBuffer: Msg[] = [];
  let toolBufferStartTs: number | null = null;

  function flushTools() {
    if (toolBuffer.length === 0) return;
    const gap = prevTs != null && toolBufferStartTs != null ? toolBufferStartTs - prevTs : 0;
    groups.push({ kind: 'tools', messages: toolBuffer, gapMs: Math.max(0, gap) });
    if (toolBuffer.length > 0) {
      prevTs = new Date(toolBuffer[toolBuffer.length - 1].created_at).getTime();
    }
    toolBuffer = [];
    toolBufferStartTs = null;
  }

  for (const m of messages) {
    const ts = new Date(m.created_at).getTime();
    if (m.role === 'system' || m.role === 'tool') {
      if (toolBuffer.length === 0) toolBufferStartTs = ts;
      toolBuffer.push(m);
    } else {
      flushTools();
      const gap = prevTs != null ? ts - prevTs : 0;
      groups.push({ kind: 'turn', message: m, gapMs: Math.max(0, gap) });
      prevTs = ts;
    }
  }
  flushTools();
  return groups;
}

export default async function ConversationDetail({ params }: { params: { id: string } }) {
  const sb = createClient();

  const { data: conv } = await sb
    .from('conversations')
    .select(
      'id, session_id, channel, lang, resident_name, overall_sentiment, started_at, last_activity_at, status'
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!conv) notFound();

  const { data: messagesRaw } = await sb
    .from('messages')
    .select(
      'id, role, content, lang, sentiment, sentiment_score, llm_provider, latency_ms, tokens_in, tokens_out, retrieved_chunk_ids, pii_detected, created_at'
    )
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });

  const messages: Msg[] = (messagesRaw ?? []) as Msg[];
  const allChunkIds = messages.flatMap((m) => m.retrieved_chunk_ids ?? []);
  const [sources, summary] = await Promise.all([
    loadCitationSources(allChunkIds),
    conversationSummary(
      conv.id as string,
      conv.started_at as string,
      conv.last_activity_at as string,
      (conv.status as string) ?? 'active'
    )
  ]);

  const groups = groupMessages(messages);
  const title =
    conv.resident_name ?? `Anonymous resident #${(conv.session_id as string).slice(0, 6).toUpperCase()}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/admin/conversations"
          title="Back (Esc)"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to conversations
        </Link>
        <TranscriptActions
          conversationId={conv.id as string}
          summary={{
            session_id: conv.session_id as string,
            resident_name: (conv.resident_name as string | null) ?? null,
            channel: conv.channel as string,
            lang: conv.lang as string,
            status: (conv.status as string) ?? 'active',
            started_at: conv.started_at as string,
            last_activity_at: conv.last_activity_at as string
          }}
          messages={messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            created_at: m.created_at,
            sentiment: m.sentiment,
            llm_provider: m.llm_provider,
            latency_ms: m.latency_ms,
            tokens_in: m.tokens_in,
            tokens_out: m.tokens_out
          }))}
        />
      </div>

      <header className="rounded-2xl border border-border bg-surface-2 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Session transcript
        </p>
        <h1 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">{title}</h1>
        <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
          {conv.session_id}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded bg-surface px-1.5 py-0.5 uppercase tracking-wider">
            {conv.channel}
          </span>
          <span className="rounded bg-surface px-1.5 py-0.5 uppercase tracking-wider">
            {conv.lang}
          </span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
              summary.status === 'closed'
                ? 'bg-muted text-muted-foreground'
                : 'bg-success/15 text-success'
            )}
          >
            {summary.status}
          </span>
          <span>started {relativeTime(conv.started_at as string)}</span>
          <span>·</span>
          <span>last activity {relativeTime(conv.last_activity_at as string)}</span>
          {conv.overall_sentiment && (
            <span
              className={cn(
                'ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                sentimentClass[conv.overall_sentiment as string] ?? sentimentClass.neutral
              )}
            >
              overall: {conv.overall_sentiment as string}
            </span>
          )}
        </div>
      </header>

      {/* Summary stat block */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Turns"
          value={`${summary.user_turns} / ${summary.total_turns}`}
          hint="user / total"
        />
        <StatCard
          label="Tokens"
          value={`${summary.tokens_in.toLocaleString()} ↑ / ${summary.tokens_out.toLocaleString()} ↓`}
          hint="in / out"
        />
        <StatCard label="Duration" value={formatDuration(summary.duration_ms)} hint="end − start" />
        <StatCard
          label="Outcomes"
          value={
            summary.linked_request || summary.linked_appointment
              ? `${summary.linked_request ? 'SR' : ''}${
                  summary.linked_request && summary.linked_appointment ? ' + ' : ''
                }${summary.linked_appointment ? 'Appt' : ''}`
              : '—'
          }
          hint="created from chat"
        />
      </section>

      {(summary.linked_request || summary.linked_appointment) && (
        <section className="flex flex-wrap gap-2">
          {summary.linked_request && (
            <Link
              href={`/admin/requests/${summary.linked_request.id}`}
              className="group inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
                <FileWarning className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-semibold text-primary">
                  {caseCodeFromUuid(summary.linked_request.id)}
                </p>
                <p className="truncate text-xs text-foreground">{summary.linked_request.title}</p>
              </div>
              <ArrowUpRight className="ml-1 h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
            </Link>
          )}
          {summary.linked_appointment && (
            <Link
              href={`/admin/requests`}
              className="group inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold">
                <CalendarClock className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {summary.linked_appointment.appointment_type.replace('_', ' ')}
                </p>
                <p className="truncate text-xs text-foreground">
                  {new Date(summary.linked_appointment.slot_start).toLocaleString()}
                </p>
              </div>
              <ArrowUpRight className="ml-1 h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
            </Link>
          )}
        </section>
      )}

      {/* Messages */}
      <div className="space-y-3">
        {groups.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface-2 p-6 text-center text-sm text-muted-foreground">
            No messages recorded.
          </p>
        )}
        {groups.map((g, idx) => {
          if (g.kind === 'tools') {
            return <ToolGroup key={`tools-${idx}`} messages={g.messages} gapMs={g.gapMs} />;
          }
          return <TurnCard key={g.message.id} message={g.message} gapMs={g.gapMs} sources={sources} />;
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function gapLabel(ms: number): string | null {
  if (ms < 30_000) return null;
  if (ms < 60_000) return `+${Math.round(ms / 1000)}s gap`;
  if (ms < 3_600_000) return `+${Math.round(ms / 60_000)}m gap`;
  return `+${Math.round(ms / 3_600_000)}h gap`;
}

function TurnCard({
  message: m,
  gapMs,
  sources
}: {
  message: Msg;
  gapMs: number;
  sources: Map<string, { document_id: string; document_title: string }>;
}) {
  const gap = gapLabel(gapMs);
  const cited = Array.from(
    new Map(
      (m.retrieved_chunk_ids ?? [])
        .map((id) => sources.get(id))
        .filter((s): s is { document_id: string; document_title: string } => !!s)
        .map((s) => [s.document_id, s])
    ).values()
  );

  return (
    <article
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
          <span title={new Date(m.created_at).toLocaleString()}>{relativeTime(m.created_at)}</span>
          {gap && (
            <span className="rounded-full bg-surface-2 px-1.5 normal-case tracking-normal text-muted-foreground">
              {gap}
            </span>
          )}
          {m.llm_provider && m.llm_provider !== 'none' && (
            <span className="rounded bg-surface-2 px-1.5 normal-case tracking-normal text-muted-foreground">
              via {m.llm_provider}
            </span>
          )}
          {m.latency_ms != null && (
            <span className="normal-case tracking-normal">· {m.latency_ms}ms</span>
          )}
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
          {m.pii_detected && (
            <span
              title="PII detected in this message"
              className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-1.5 py-0.5 normal-case tracking-normal text-destructive"
            >
              <ShieldAlert className="h-3 w-3" />
              PII
            </span>
          )}
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{m.content}</p>
        {cited.length > 0 && (
          <details className="group mt-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">
                {cited.length} source{cited.length === 1 ? '' : 's'}
              </span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 transition group-open:rotate-90" />
            </summary>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {cited.map((s) => (
                <li key={s.document_id}>
                  <Link
                    href={`/admin/knowledge/${s.document_id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-foreground transition hover:border-primary/40 hover:text-primary"
                  >
                    {s.document_title}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </article>
  );
}

function ToolGroup({ messages, gapMs }: { messages: Msg[]; gapMs: number }) {
  const gap = gapLabel(gapMs);
  return (
    <details className="group rounded-2xl border border-dashed border-border bg-surface-2/60 px-4 py-2 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground hover:text-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Wrench className="h-3 w-3" />
        </span>
        <span className="font-medium">
          {messages.length} tool step{messages.length === 1 ? '' : 's'}
        </span>
        {gap && (
          <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {gap}
          </span>
        )}
        <ChevronRight className="ml-auto h-3.5 w-3.5 transition group-open:rotate-90" />
      </summary>
      <ul className="mt-2 space-y-2">
        {messages.map((m) => (
          <li key={m.id} className="rounded-lg bg-surface p-2">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>{m.role}</span>
              <span>·</span>
              <span>{relativeTime(m.created_at)}</span>
            </div>
            <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] text-foreground">
              {m.content}
            </pre>
          </li>
        ))}
      </ul>
    </details>
  );
}
