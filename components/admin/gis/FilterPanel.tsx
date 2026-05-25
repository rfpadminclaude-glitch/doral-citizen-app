'use client';

import { Filter, RotateCcw, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Neighborhood } from '@/lib/geo/neighborhoods';
import {
  REQUEST_STATUSES,
  REQUEST_TYPES,
  type GisFilters,
  type RequestStatus,
  type RequestType
} from './types';
import { cn } from '@/lib/utils';

type Props = {
  filters: GisFilters;
  neighborhoods: Neighborhood[];
  onChange: (next: GisFilters) => void;
};

const STATUS_KEY: Record<RequestStatus, 'statusNew' | 'statusInProgress' | 'statusResolved' | 'statusClosed'> = {
  new: 'statusNew',
  in_progress: 'statusInProgress',
  resolved: 'statusResolved',
  closed: 'statusClosed'
};

const TYPE_KEY: Record<RequestType, string> = {
  permit: 'typePermit',
  code_violation: 'typeCodeViolation',
  park_issue: 'typeParkIssue',
  general: 'typeGeneral',
  pothole: 'typePothole',
  inspection: 'typeInspection',
  complaint: 'typeComplaint'
};

function countActive(filters: GisFilters): number {
  let n = 0;
  if (filters.types.length) n += filters.types.length;
  if (filters.statuses.length) n += filters.statuses.length;
  if (filters.neighborhood) n += 1;
  if (filters.from) n += 1;
  if (filters.to) n += 1;
  return n;
}

// Parse a yyyy-mm-dd value from <input type="date"> as local time so the
// chosen day spans 00:00–23:59:59.999 in the user's timezone, not UTC.
function localDayStart(yyyyMmDd: string): string | undefined {
  if (!yyyyMmDd) return undefined;
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
function localDayEnd(yyyyMmDd: string): string | undefined {
  if (!yyyyMmDd) return undefined;
  const d = new Date(`${yyyyMmDd}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function FilterPanel({ filters, neighborhoods, onChange }: Props) {
  const t = useTranslations('admin.filters');
  const activeCount = countActive(filters);
  const hasFilters = activeCount > 0;

  function toggleType(type: RequestType) {
    const set = new Set(filters.types);
    if (set.has(type)) set.delete(type);
    else set.add(type);
    onChange({ ...filters, types: Array.from(set) });
  }
  function toggleStatus(s: RequestStatus) {
    const set = new Set(filters.statuses);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    onChange({ ...filters, statuses: Array.from(set) });
  }
  function reset() {
    onChange({ types: [], statuses: [], neighborhood: null, from: undefined, to: undefined });
  }

  const neighborhoodCount = filters.neighborhood ? 1 : 0;
  const dateCount = (filters.from ? 1 : 0) + (filters.to ? 1 : 0);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface-2 p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t('title')}</h3>
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium text-destructive transition hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            <X className="h-3 w-3" />
            {t('clearN', { count: activeCount })}
          </button>
        ) : (
          <button
            type="button"
            onClick={reset}
            aria-label={t('reset')}
            title={t('reset')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Section title={t('neighborhood')} count={neighborhoodCount}>
        <select
          value={filters.neighborhood ?? ''}
          onChange={(e) => onChange({ ...filters, neighborhood: e.target.value || null })}
          className={cn(
            'block w-full rounded-lg border bg-surface px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            filters.neighborhood ? 'border-primary/60' : 'border-border'
          )}
        >
          <option value="">{t('allNeighborhoods')}</option>
          {neighborhoods.map((n) => (
            <option key={n.slug} value={n.slug}>
              {n.name}
            </option>
          ))}
        </select>
      </Section>

      <Section title={t('status')} count={filters.statuses.length}>
        <div className="flex flex-wrap gap-1.5">
          {REQUEST_STATUSES.map((s) => (
            <Pill
              key={s}
              label={t(STATUS_KEY[s])}
              active={filters.statuses.includes(s)}
              onClick={() => toggleStatus(s)}
            />
          ))}
        </div>
      </Section>

      <Section title={t('category')} count={filters.types.length}>
        <div className="flex flex-wrap gap-1.5">
          {REQUEST_TYPES.map((rt) => (
            <Pill
              key={rt}
              label={t(TYPE_KEY[rt])}
              active={filters.types.includes(rt)}
              onClick={() => toggleType(rt)}
            />
          ))}
        </div>
      </Section>

      <Section title={t('dateRange')} count={dateCount}>
        <div className="grid grid-cols-2 gap-1.5">
          <label className="block">
            <span className="sr-only">{t('dateFrom')}</span>
            <input
              type="date"
              value={filters.from?.slice(0, 10) ?? ''}
              onChange={(e) => onChange({ ...filters, from: localDayStart(e.target.value) })}
              aria-label={t('dateFrom')}
              className={cn(
                'w-full rounded-lg border bg-surface px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                filters.from ? 'border-primary/60' : 'border-border'
              )}
            />
          </label>
          <label className="block">
            <span className="sr-only">{t('dateTo')}</span>
            <input
              type="date"
              value={filters.to?.slice(0, 10) ?? ''}
              onChange={(e) => onChange({ ...filters, to: localDayEnd(e.target.value) })}
              aria-label={t('dateTo')}
              className={cn(
                'w-full rounded-lg border bg-surface px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                filters.to ? 'border-primary/60' : 'border-border'
              )}
            />
          </label>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  children
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        {count > 0 && (
          <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Pill({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}
