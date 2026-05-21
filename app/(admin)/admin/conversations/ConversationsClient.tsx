'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  MessageSquare,
  Search,
  User,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Select } from '@/components/ui/Select';
import { relativeTime, sentimentClass } from '@/lib/admin/format';
import { cn } from '@/lib/utils';

export type FilterState = {
  q: string;
  channel: 'web' | 'sms' | 'whatsapp' | 'facebook' | 'all';
  lang: 'en' | 'es' | 'all';
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'urgent' | 'all';
  status: 'active' | 'closed' | 'all';
  from: string;
  to: string;
};

type Row = {
  id: string;
  session_id: string;
  channel: string;
  lang: string;
  resident_name: string | null;
  overall_sentiment: string | null;
  status: string;
  last_activity_at: string | null;
  msg_count: number;
  preview: string | null;
  has_request: boolean;
  has_appointment: boolean;
};

const CHANNEL_OPTIONS = [
  { value: 'all', label: 'All channels' },
  { value: 'web', label: 'Web' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' }
] as const;

const LANG_OPTIONS = [
  { value: 'all', label: 'All languages' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' }
] as const;

const SENTIMENT_OPTIONS = [
  { value: 'all', label: 'Any sentiment' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
  { value: 'frustrated', label: 'Frustrated' },
  { value: 'urgent', label: 'Urgent' }
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' }
] as const;

function anonLabel(sessionId: string): string {
  return `Anonymous resident #${sessionId.slice(0, 6).toUpperCase()}`;
}

function buildHref(
  pathname: string,
  filters: FilterState,
  page: number,
  overrides: Partial<FilterState & { page: number }> = {}
): string {
  const merged = { ...filters, page, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set('q', merged.q);
  if (merged.channel && merged.channel !== 'all') params.set('channel', merged.channel);
  if (merged.lang && merged.lang !== 'all') params.set('lang', merged.lang);
  if (merged.sentiment && merged.sentiment !== 'all') params.set('sentiment', merged.sentiment);
  if (merged.status && merged.status !== 'all') params.set('status', merged.status);
  if (merged.from) params.set('from', merged.from);
  if (merged.to) params.set('to', merged.to);
  if (merged.page > 1) params.set('page', String(merged.page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function pagerWindow(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, 'ellipsis', total];
  if (current >= total - 3) return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
}

export function ConversationsClient({
  rows,
  total,
  page,
  pageSize,
  filters: initialFilters
}: {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  filters: FilterState;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [query, setQuery] = useState(initialFilters.q);

  useEffect(() => {
    setFilters(initialFilters);
    setQuery(initialFilters.q);
  }, [initialFilters]);

  function commit(next: FilterState, nextPage = 1) {
    router.push(buildHref(pathname, next, nextPage));
  }

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    commit(next, 1);
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = { ...filters, q: query };
    setFilters(next);
    commit(next, 1);
  }

  function clearAll() {
    const cleared: FilterState = {
      q: '',
      channel: 'all',
      lang: 'all',
      sentiment: 'all',
      status: 'all',
      from: '',
      to: ''
    };
    setFilters(cleared);
    setQuery('');
    commit(cleared, 1);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const activeChips: Array<{ key: keyof FilterState; label: string }> = [];
  if (filters.channel !== 'all') activeChips.push({ key: 'channel', label: `Channel: ${filters.channel}` });
  if (filters.lang !== 'all') activeChips.push({ key: 'lang', label: `Lang: ${filters.lang}` });
  if (filters.sentiment !== 'all') activeChips.push({ key: 'sentiment', label: `Sentiment: ${filters.sentiment}` });
  if (filters.status !== 'all') activeChips.push({ key: 'status', label: `Status: ${filters.status}` });
  if (filters.from) activeChips.push({ key: 'from', label: `From: ${filters.from}` });
  if (filters.to) activeChips.push({ key: 'to', label: `To: ${filters.to}` });
  if (filters.q) activeChips.push({ key: 'q', label: `“${filters.q}”` });

  return (
    <>
      <div className="space-y-3">
        <form
          onSubmit={onSearchSubmit}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 focus-within:border-primary"
        >
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or session id…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search conversations"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                const next = { ...filters, q: '' };
                setFilters(next);
                commit(next, 1);
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select
            value={filters.channel}
            onChange={(v) => updateFilter('channel', v)}
            options={CHANNEL_OPTIONS as unknown as { value: FilterState['channel']; label: string }[]}
            ariaLabel="Filter by channel"
          />
          <Select
            value={filters.lang}
            onChange={(v) => updateFilter('lang', v)}
            options={LANG_OPTIONS as unknown as { value: FilterState['lang']; label: string }[]}
            ariaLabel="Filter by language"
          />
          <Select
            value={filters.sentiment}
            onChange={(v) => updateFilter('sentiment', v)}
            options={SENTIMENT_OPTIONS as unknown as { value: FilterState['sentiment']; label: string }[]}
            ariaLabel="Filter by sentiment"
          />
          <Select
            value={filters.status}
            onChange={(v) => updateFilter('status', v)}
            options={STATUS_OPTIONS as unknown as { value: FilterState['status']; label: string }[]}
            ariaLabel="Filter by status"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted-foreground focus-within:border-primary">
            <span className="shrink-0 uppercase tracking-wider">From</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => updateFilter('from', e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
              aria-label="Filter by activity from date"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted-foreground focus-within:border-primary">
            <span className="shrink-0 uppercase tracking-wider">To</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => updateFilter('to', e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
              aria-label="Filter by activity to date"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {total === 0
              ? 'No conversations'
              : `Showing ${(clampedPage - 1) * pageSize + 1}–${Math.min(clampedPage * pageSize, total)} of ${total}`}
          </span>
          {activeChips.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => {
                    const cleared: FilterState = {
                      ...filters,
                      [chip.key]:
                        chip.key === 'q' || chip.key === 'from' || chip.key === 'to'
                          ? ''
                          : ('all' as FilterState[typeof chip.key])
                    };
                    setFilters(cleared);
                    if (chip.key === 'q') setQuery('');
                    commit(cleared, 1);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-foreground hover:border-primary/40"
                >
                  {chip.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">No conversations match</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Adjust the filters or clear them to see all sessions.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {rows.map((c) => {
                const name = c.resident_name ?? anonLabel(c.session_id);
                const isAnon = !c.resident_name;
                return (
                  <motion.li
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Link
                      href={`/admin/conversations/${c.id}`}
                      className="flex items-start gap-3 px-4 py-3 transition hover:bg-surface focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                          isAnon ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                        )}
                      >
                        {isAnon ? <MessageSquare className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'truncate text-sm font-medium',
                              isAnon ? 'text-muted-foreground' : 'text-foreground'
                            )}
                          >
                            {name}
                          </span>
                          <span className="rounded bg-surface px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {c.channel}
                          </span>
                          <span className="rounded bg-surface px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {c.lang}
                          </span>
                          {c.overall_sentiment && (
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                                sentimentClass[c.overall_sentiment] ?? sentimentClass.neutral
                              )}
                            >
                              {c.overall_sentiment}
                            </span>
                          )}
                          {c.status === 'closed' && (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              closed
                            </span>
                          )}
                          {c.has_request && (
                            <span
                              title="Linked service request"
                              className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive"
                            >
                              <FileWarning className="h-3 w-3" />
                              SR
                            </span>
                          )}
                          {c.has_appointment && (
                            <span
                              title="Linked appointment"
                              className="inline-flex items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-gold"
                            >
                              <CalendarClock className="h-3 w-3" />
                              Appt
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          {c.session_id}
                        </p>
                        {c.preview && (
                          <p className="mt-1 line-clamp-1 text-xs text-foreground/80">
                            “{c.preview}”
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {relativeTime(c.last_activity_at)} · {c.msg_count} msgs
                        </p>
                      </div>
                      <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-1"
        >
          <PagerLink
            disabled={clampedPage <= 1}
            href={buildHref(pathname, filters, Math.max(1, clampedPage - 1))}
            ariaLabel="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </PagerLink>
          {pagerWindow(clampedPage, totalPages).map((slot, idx) =>
            slot === 'ellipsis' ? (
              <span
                key={`e-${idx}`}
                className="px-2 text-xs text-muted-foreground"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <PagerLink
                key={slot}
                href={buildHref(pathname, filters, slot)}
                active={slot === clampedPage}
                ariaLabel={`Page ${slot}`}
              >
                {slot}
              </PagerLink>
            )
          )}
          <PagerLink
            disabled={clampedPage >= totalPages}
            href={buildHref(pathname, filters, Math.min(totalPages, clampedPage + 1))}
            ariaLabel="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </PagerLink>
        </nav>
      )}
    </>
  );
}

function PagerLink({
  href,
  active,
  disabled,
  ariaLabel,
  children
}: {
  href: string;
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-label={ariaLabel}
        aria-disabled="true"
        className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border bg-surface px-2 text-xs font-medium text-muted-foreground opacity-50"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-surface text-foreground hover:border-primary/40'
      )}
    >
      {children}
    </Link>
  );
}
