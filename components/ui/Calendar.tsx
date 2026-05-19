'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  value: string | null; // ISO date YYYY-MM-DD
  onChange: (next: string) => void;
  /** Disable weekends. Default true (business-day-only). */
  weekendsDisabled?: boolean;
  /** Min selectable date inclusive. Default = today. */
  minDate?: Date;
  /** Max selectable date inclusive. Default = today + 60 days. */
  maxDate?: Date;
  /** Locale for month / weekday labels. Default browser locale. */
  locale?: string;
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}
function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export function Calendar({
  value,
  onChange,
  weekendsDisabled = true,
  minDate,
  maxDate,
  locale
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const effectiveMin = (minDate ?? today);
  const effectiveMax =
    maxDate ?? new Date(today.getFullYear(), today.getMonth(), today.getDate() + 60);

  // Visible month: start at the selected date's month, else today's month.
  const initial = value ? new Date(value + 'T00:00:00') : today;
  const [visibleMonth, setVisibleMonth] = useState<Date>(startOfMonth(initial));
  const [direction, setDirection] = useState<1 | -1>(1);

  const weekdayShort = (i: number) => {
    const ref = new Date(2024, 6, 7 + i); // 2024-07-07 was Sunday
    return ref.toLocaleDateString(locale, { weekday: 'narrow' });
  };
  const monthLabel = visibleMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  function go(delta: -1 | 1) {
    setDirection(delta);
    setVisibleMonth((m) => addMonths(m, delta));
  }

  // Build the 6-row grid for this month
  const first = visibleMonth;
  const firstDow = first.getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), i));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const canPrev = startOfMonth(effectiveMin) < visibleMonth;
  const canNext = addMonths(visibleMonth, 1) <= startOfMonth(effectiveMax);

  function quickPick(d: Date) {
    if (d.getMonth() !== visibleMonth.getMonth() || d.getFullYear() !== visibleMonth.getFullYear()) {
      setDirection(d > visibleMonth ? 1 : -1);
      setVisibleMonth(startOfMonth(d));
    }
    onChange(ymd(d));
  }

  function nextBusinessDay(from: Date): Date {
    const d = new Date(from);
    do {
      d.setDate(d.getDate() + 1);
    } while (isWeekend(d));
    return d;
  }

  const todayBusiness = weekendsDisabled && isWeekend(today) ? nextBusinessDay(today) : today;
  const tomorrow = nextBusinessDay(todayBusiness);

  return (
    <div className="w-72 rounded-2xl border border-border bg-popover p-3 shadow-glass">
      {/* Header with month nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => canPrev && go(-1)}
          disabled={!canPrev}
          aria-label="Previous month"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-2 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize text-foreground">{monthLabel}</span>
        <button
          type="button"
          onClick={() => canNext && go(1)}
          disabled={!canNext}
          aria-label="Next month"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-2 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Quick chips */}
      <div className="mt-2.5 flex gap-1.5">
        <button
          type="button"
          onClick={() => quickPick(todayBusiness)}
          className="inline-flex h-7 items-center rounded-full border border-border bg-surface px-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isWeekend(today) ? 'Next biz day' : 'Today'}
        </button>
        <button
          type="button"
          onClick={() => quickPick(tomorrow)}
          className="inline-flex h-7 items-center rounded-full border border-border bg-surface px-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Tomorrow
        </button>
      </div>

      {/* Weekday header */}
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span key={i}>{weekdayShort(i)}</span>
        ))}
      </div>

      {/* Day grid (animated month transitions) */}
      <div className="relative mt-1 overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={`${visibleMonth.getFullYear()}-${visibleMonth.getMonth()}`}
            initial={{ opacity: 0, x: direction * 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="grid grid-cols-7 gap-1"
            role="grid"
            aria-label={monthLabel}
          >
            {cells.map((d, idx) => {
              if (!d) return <span key={`b-${idx}`} className="h-8" aria-hidden="true" />;
              const iso = ymd(d);
              const disabled =
                d < effectiveMin ||
                d > effectiveMax ||
                (weekendsDisabled && isWeekend(d));
              const selected = value === iso;
              const isToday = isSameDay(d, today);
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  aria-selected={selected}
                  aria-disabled={disabled}
                  disabled={disabled}
                  onClick={() => onChange(iso)}
                  className={cn(
                    'relative h-8 rounded-md text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    selected
                      ? 'bg-primary text-primary-foreground shadow-soft'
                      : disabled
                        ? 'cursor-not-allowed text-muted-foreground/40'
                        : 'text-foreground hover:bg-primary/10 hover:text-primary'
                  )}
                >
                  {d.getDate()}
                  {isToday && !selected && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-1 mx-auto h-1 w-1 rounded-full bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
