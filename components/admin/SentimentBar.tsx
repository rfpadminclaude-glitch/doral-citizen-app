'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo } from 'react';
import type { SentimentDay } from '@/lib/admin/analytics';
import { cn } from '@/lib/utils';

type Props = {
  data: SentimentDay[];
  title?: string;
  kicker?: string;
  href?: string;
};

type Segment = {
  key: 'positive' | 'neutral' | 'negative';
  label: string;
  value: number;
  pct: number;
  color: string;
};

export function SentimentBar({
  data,
  title = 'Sentiment mix',
  kicker = 'Last 7 days',
  href
}: Props) {
  const segments = useMemo<Segment[]>(() => {
    const totals = data.reduce(
      (acc, d) => ({
        positive: acc.positive + d.positive,
        neutral: acc.neutral + d.neutral,
        negative: acc.negative + d.negative
      }),
      { positive: 0, neutral: 0, negative: 0 }
    );
    const grand = totals.positive + totals.neutral + totals.negative;
    const pct = (n: number) => (grand > 0 ? (n / grand) * 100 : 0);
    return [
      {
        key: 'positive',
        label: 'Positive',
        value: totals.positive,
        pct: pct(totals.positive),
        color: 'hsl(var(--success))'
      },
      {
        key: 'neutral',
        label: 'Neutral',
        value: totals.neutral,
        pct: pct(totals.neutral),
        color: 'hsl(var(--muted-foreground))'
      },
      {
        key: 'negative',
        label: 'Negative',
        value: totals.negative,
        pct: pct(totals.negative),
        color: 'hsl(var(--destructive))'
      }
    ];
  }, [data]);

  const grand = segments.reduce((s, x) => s + x.value, 0);

  const card = (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface-2 p-5 shadow-soft/40 transition',
        href && 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft'
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {kicker}
          </p>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{grand} replies</span>
      </header>

      {/* Stacked bar */}
      <div
        className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-surface"
        role="img"
        aria-label={segments
          .filter((s) => s.value > 0)
          .map((s) => `${s.label} ${Math.round(s.pct)} percent`)
          .join(', ')}
      >
        {grand === 0 ? (
          <div className="h-full w-full bg-muted" aria-hidden="true" />
        ) : (
          segments.map((s) => (
            <motion.div
              key={s.key}
              initial={{ width: 0 }}
              animate={{ width: `${s.pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ backgroundColor: s.color }}
              className="h-full"
              title={`${s.label}: ${s.value} (${Math.round(s.pct)}%)`}
              aria-hidden="true"
            />
          ))
        )}
      </div>

      {/* Legend */}
      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            <span className="text-foreground">{s.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {Math.round(s.pct)}%
              <span className="ml-1 opacity-60">· {s.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {card}
    </Link>
  ) : (
    card
  );
}
