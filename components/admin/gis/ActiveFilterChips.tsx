'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Neighborhood } from '@/lib/geo/neighborhoods';
import type { GisFilters, RequestStatus, RequestType } from './types';
import { cn } from '@/lib/utils';
import { useMounted } from '@/lib/hooks/useMounted';

type RemoveKind =
  | { kind: 'status'; value: RequestStatus }
  | { kind: 'type'; value: RequestType }
  | { kind: 'neighborhood' }
  | { kind: 'from' }
  | { kind: 'to' }
  | { kind: 'source' };

type Props = {
  filters: GisFilters;
  neighborhoods: Neighborhood[];
  onRemove: (target: RemoveKind) => void;
  onClearAll: () => void;
  locale?: string;
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

function formatDate(iso: string, mounted: boolean): string {
  // Until the client has mounted, render a deterministic ISO slice to avoid
  // hydration mismatches from locale-dependent toLocaleDateString output.
  if (!mounted) return iso.slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActiveFilterChips({
  filters,
  neighborhoods,
  onRemove,
  onClearAll
}: Props) {
  const t = useTranslations('admin.filters');
  const mounted = useMounted();
  const sourceActive = filters.source === 'demo' || filters.source === 'real';
  const hasAny =
    filters.statuses.length > 0 ||
    filters.types.length > 0 ||
    filters.neighborhood ||
    filters.from ||
    filters.to ||
    sourceActive;
  if (!hasAny) return null;

  const neighborhoodName = filters.neighborhood
    ? neighborhoods.find((n) => n.slug === filters.neighborhood)?.name ?? filters.neighborhood
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface-2 px-3 py-2 text-xs">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('activeFiltersLabel')}
      </span>

      {filters.statuses.map((s) => (
        <Chip
          key={`status-${s}`}
          label={t(STATUS_KEY[s])}
          removeLabel={t('removeFilter')}
          onRemove={() => onRemove({ kind: 'status', value: s })}
        />
      ))}
      {filters.types.map((rt) => (
        <Chip
          key={`type-${rt}`}
          label={t(TYPE_KEY[rt])}
          removeLabel={t('removeFilter')}
          onRemove={() => onRemove({ kind: 'type', value: rt })}
        />
      ))}
      {neighborhoodName && (
        <Chip
          label={neighborhoodName}
          removeLabel={t('removeFilter')}
          onRemove={() => onRemove({ kind: 'neighborhood' })}
        />
      )}
      {filters.from && (
        <Chip
          label={`${t('dateFrom')} ${formatDate(filters.from, mounted)}`}
          removeLabel={t('removeFilter')}
          onRemove={() => onRemove({ kind: 'from' })}
        />
      )}
      {filters.to && (
        <Chip
          label={`${t('dateTo')} ${formatDate(filters.to, mounted)}`}
          removeLabel={t('removeFilter')}
          onRemove={() => onRemove({ kind: 'to' })}
        />
      )}
      {sourceActive && (
        <Chip
          label={filters.source === 'demo' ? t('sourceChipDemo') : t('sourceChipReal')}
          removeLabel={t('removeFilter')}
          onRemove={() => onRemove({ kind: 'source' })}
        />
      )}

      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium text-destructive transition hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
      >
        <X className="h-3 w-3" />
        {t('clearAll')}
      </button>
    </div>
  );
}

function Chip({
  label,
  removeLabel,
  onRemove
}: {
  label: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 py-0.5 pl-2.5 pr-1 font-medium text-primary motion-safe:animate-in motion-safe:fade-in-50'
      )}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-primary/70 transition hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
