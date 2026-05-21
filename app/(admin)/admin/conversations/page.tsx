import { listConversations, PAGE_SIZE, type ConvFilters } from '@/lib/admin/conversations';
import { ConversationsClient } from './ConversationsClient';

export const dynamic = 'force-dynamic';

function pickStr<T extends string>(value: string | string[] | undefined, allowed: T[]): T | undefined {
  if (typeof value !== 'string') return undefined;
  return (allowed as string[]).includes(value) ? (value as T) : undefined;
}

export default async function ConversationsPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters: ConvFilters = {
    q: typeof searchParams.q === 'string' ? searchParams.q : undefined,
    channel: pickStr(searchParams.channel, ['web', 'sms', 'whatsapp', 'facebook', 'all']),
    lang: pickStr(searchParams.lang, ['en', 'es', 'all']),
    sentiment: pickStr(searchParams.sentiment, [
      'positive',
      'neutral',
      'negative',
      'frustrated',
      'urgent',
      'all'
    ]),
    status: pickStr(searchParams.status, ['active', 'closed', 'all']),
    from: typeof searchParams.from === 'string' ? searchParams.from : undefined,
    to: typeof searchParams.to === 'string' ? searchParams.to : undefined,
    page:
      typeof searchParams.page === 'string' && /^\d+$/.test(searchParams.page)
        ? Math.max(1, parseInt(searchParams.page, 10))
        : 1
  };

  const result = await listConversations(filters);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Resident sessions
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Conversations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every resident chat session, newest first. Filter and click a row to read the transcript.
        </p>
      </header>

      <ConversationsClient
        rows={result.rows}
        total={result.total}
        page={result.page}
        pageSize={PAGE_SIZE}
        filters={{
          q: filters.q ?? '',
          channel: filters.channel ?? 'all',
          lang: filters.lang ?? 'all',
          sentiment: filters.sentiment ?? 'all',
          status: filters.status ?? 'all',
          from: filters.from ?? '',
          to: filters.to ?? ''
        }}
      />
    </div>
  );
}
