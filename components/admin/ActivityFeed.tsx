'use client';

import {
  CalendarClock,
  FileWarning,
  Library,
  Megaphone,
  MessageSquare,
  ThumbsUp
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { relativeTime } from '@/lib/admin/format';
import type { ActivityEvent } from '@/lib/admin/analytics';
import { cn } from '@/lib/utils';

const ICON: Record<ActivityEvent['type'], { icon: React.ReactNode; tone: string }> = {
  conversation: {
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    tone: 'bg-primary/10 text-primary'
  },
  service_request: {
    icon: <FileWarning className="h-3.5 w-3.5" />,
    tone: 'bg-destructive/15 text-destructive'
  },
  appointment: {
    icon: <CalendarClock className="h-3.5 w-3.5" />,
    tone: 'bg-gold/15 text-gold'
  },
  feedback: {
    icon: <ThumbsUp className="h-3.5 w-3.5" />,
    tone: 'bg-success/15 text-success'
  },
  announcement: {
    icon: <Megaphone className="h-3.5 w-3.5" />,
    tone: 'bg-secondary/15 text-secondary'
  },
  document: {
    icon: <Library className="h-3.5 w-3.5" />,
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
  initialFilter = 'all'
}: {
  events: ActivityEvent[];
  title?: string;
  kicker?: string;
  initialFilter?: Filter;
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
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface-2 p-5 shadow-soft/40">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {kicker}
          </p>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {events.length}
        </span>
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

      <ul className="mt-3 flex-1 space-y-2">
        {filtered.length === 0 && (
          <li className="rounded-lg bg-surface px-3 py-6 text-center text-xs text-muted-foreground">
            {events.length === 0
              ? 'No activity yet. Run the resident chat to populate.'
              : 'No items match this filter.'}
          </li>
        )}
        {filtered.map((e) => {
          const meta = ICON[e.type];
          const row = (
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                  meta.tone
                )}
              >
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{e.title}</p>
                {e.subtitle && (
                  <p className="truncate text-[11px] text-muted-foreground">{e.subtitle}</p>
                )}
              </div>
              <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                {relativeTime(e.at)}
              </span>
            </div>
          );
          return e.href ? (
            <li key={e.id}>
              <Link
                href={e.href}
                className="block rounded-lg bg-surface px-3 py-2 transition hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {row}
              </Link>
            </li>
          ) : (
            <li key={e.id} className="rounded-lg bg-surface px-3 py-2">
              {row}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
