'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Copy,
  ExternalLink,
  FileWarning,
  Library,
  Megaphone,
  MessageSquare,
  MoreVertical,
  ThumbsUp
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { relativeTime } from '@/lib/admin/format';
import type { ActivityEvent } from '@/lib/admin/analytics';
import { cn } from '@/lib/utils';

const ICON: Record<ActivityEvent['type'], { icon: React.ReactNode; tone: string }> = {
  conversation: {
    icon: <MessageSquare className="h-5 w-5" />,
    tone: 'bg-primary/10 text-primary'
  },
  service_request: {
    icon: <FileWarning className="h-5 w-5" />,
    tone: 'bg-destructive/15 text-destructive'
  },
  appointment: {
    icon: <CalendarClock className="h-5 w-5" />,
    tone: 'bg-gold/15 text-gold'
  },
  feedback: {
    icon: <ThumbsUp className="h-5 w-5" />,
    tone: 'bg-success/15 text-success'
  },
  announcement: {
    icon: <Megaphone className="h-5 w-5" />,
    tone: 'bg-secondary/15 text-secondary'
  },
  document: {
    icon: <Library className="h-5 w-5" />,
    tone: 'bg-muted text-muted-foreground'
  }
};

type Filter = 'all' | 'appointments' | 'complaints' | 'other';

// Service-request subtypes that count as a "complaint" for filtering purposes.
const COMPLAINT_SUBTYPES = new Set(['code_violation', 'complaint', 'pothole']);

function bucketOf(e: ActivityEvent): Exclude<Filter, 'all'> {
  if (e.type === 'appointment') return 'appointments';
  if (e.type === 'service_request' && e.subtype && COMPLAINT_SUBTYPES.has(e.subtype)) {
    return 'complaints';
  }
  return 'other';
}

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'complaints', label: 'Complaints' },
  { key: 'other', label: 'Other' }
];

export function ActivityFeed({
  events,
  title = 'Latest activity',
  kicker = 'Across the assistant',
  initialFilter = 'all',
  viewAllHref,
  viewAllLabel = 'View all',
  className
}: {
  events: ActivityEvent[];
  title?: string;
  kicker?: string;
  initialFilter?: Filter;
  /** When set, renders a "View all →" link in the header (no nested-link issue since rows are inner Links). */
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
}) {
  const [filter, setFilter] = useState<Filter>(initialFilter);

  const counts = useMemo(() => {
    const c: Record<Exclude<Filter, 'all'>, number> = {
      appointments: 0,
      complaints: 0,
      other: 0
    };
    for (const e of events) c[bucketOf(e)] += 1;
    return c;
  }, [events]);

  const filtered =
    filter === 'all' ? events : events.filter((e) => bucketOf(e) === filter);

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-2xl border border-border bg-surface-2 p-5 shadow-soft/40',
        className
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {kicker}
          </p>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {events.length}
          </span>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            >
              {viewAllLabel}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </header>

      {/* Filter chips */}
      <div
        role="radiogroup"
        aria-label="Filter activity"
        className="mt-3 flex flex-wrap items-center gap-1.5"
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const n = f.key === 'all' ? events.length : counts[f.key];
          return (
            <button
              key={f.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setFilter(f.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {f.label}
              <span
                className={cn(
                  'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold',
                  active ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted-foreground'
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <li className="col-span-full rounded-xl bg-surface px-3 py-8 text-center text-xs text-muted-foreground">
            {events.length === 0
              ? 'No activity yet. Run the resident chat to populate.'
              : 'No items match this filter.'}
          </li>
        )}
        {filtered.map((e) => {
          const meta = ICON[e.type];
          const subtypeLabel = (e.subtype ?? e.type).replace(/_/g, ' ');
          return (
            <li key={e.id} className="group relative h-full">
              {e.href && (
                <Link
                  href={e.href}
                  aria-label={`Open ${e.title}`}
                  className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              )}
              <article
                className={cn(
                  'pointer-events-none relative h-full rounded-2xl border border-border bg-surface-2 p-4 transition',
                  e.href && 'group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-soft'
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      meta.tone
                    )}
                  >
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1 pr-7">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{e.title}</p>
                    {e.subtitle && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {e.subtitle}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-surface px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {subtypeLabel}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {relativeTime(e.at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pointer-events-auto absolute right-2 top-2 z-10">
                  <ActivityCardMenu event={e} />
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ActivityCardMenu({ event }: { event: ActivityEvent }) {
  const showConversationLink =
    !!event.conversation_id && event.type !== 'conversation';
  const hasAnyItem = !!event.href || showConversationLink;
  if (!hasAnyItem) return null;

  function copyLink() {
    if (!event.href) return;
    const absolute =
      typeof window !== 'undefined'
        ? new URL(event.href, window.location.origin).toString()
        : event.href;
    void navigator.clipboard?.writeText(absolute);
  }

  function openInNewTab() {
    if (!event.href) return;
    window.open(event.href, '_blank', 'noopener,noreferrer');
  }

  const itemClass =
    'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground outline-none transition data-[highlighted]:bg-surface data-[highlighted]:text-foreground focus:bg-surface';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="More actions"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-surface/80 text-muted-foreground opacity-0 transition hover:bg-surface hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[200px] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-soft"
        >
          {event.href && (
            <DropdownMenu.Item asChild>
              <Link href={event.href} className={itemClass}>
                <ArrowUpRight className="h-3.5 w-3.5" />
                Open
              </Link>
            </DropdownMenu.Item>
          )}
          {event.href && (
            <DropdownMenu.Item onSelect={openInNewTab} className={itemClass}>
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab
            </DropdownMenu.Item>
          )}
          {event.href && (
            <DropdownMenu.Item onSelect={copyLink} className={itemClass}>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </DropdownMenu.Item>
          )}
          {showConversationLink && (
            <>
              {event.href && (
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
              )}
              <DropdownMenu.Item asChild>
                <Link
                  href={`/admin/conversations/${event.conversation_id}`}
                  className={itemClass}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  View related conversation
                </Link>
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
