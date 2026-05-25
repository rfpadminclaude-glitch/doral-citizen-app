'use client';

import { Activity, CheckCircle2, CircleDashed, ListTodo } from 'lucide-react';
import type { Neighborhood } from '@/lib/geo/neighborhoods';
import type { GisFilters, NeighborhoodStats } from './types';

type Props = {
  stats: NeighborhoodStats | null;
  filters: GisFilters;
  neighborhoods: Neighborhood[];
};

export function NeighborhoodKpiStrip({ stats, filters, neighborhoods }: Props) {
  const scope = filters.neighborhood
    ? stats?.neighborhoods.find((n) => n.slug === filters.neighborhood)
    : stats?.overall;

  const scopeLabel = filters.neighborhood
    ? neighborhoods.find((n) => n.slug === filters.neighborhood)?.name ?? 'Neighborhood'
    : 'All neighborhoods';

  const total = scope?.total ?? 0;
  const pending = scope?.pending ?? 0;
  const inProgress = scope?.in_progress ?? 0;
  const completed = scope?.completed ?? 0;

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-surface-2 p-4 shadow-soft">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Scope
        </p>
        <p className="text-sm font-semibold text-foreground">{scopeLabel}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <KpiCard
          icon={<ListTodo className="h-3.5 w-3.5" />}
          label="Total"
          value={total}
          tone="primary"
        />
        <KpiCard
          icon={<CircleDashed className="h-3.5 w-3.5" />}
          label="Pending"
          value={pending}
          tone="red"
        />
        <KpiCard
          icon={<Activity className="h-3.5 w-3.5" />}
          label="In progress"
          value={inProgress}
          tone="amber"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Completed"
          value={completed}
          tone="green"
        />
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'primary' | 'red' | 'amber' | 'green';
}) {
  const styles: Record<typeof tone, string> = {
    primary: 'bg-primary/10 text-primary',
    red: 'bg-red-500/10 text-red-500',
    amber: 'bg-amber-500/10 text-amber-500',
    green: 'bg-green-500/10 text-green-500'
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-2.5">
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${styles[tone]}`}>
          {icon}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-1 text-xl font-semibold text-foreground tabular-nums">{value}</div>
    </div>
  );
}
