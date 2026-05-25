'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { NeighborhoodStats } from './types';

type Props = {
  stats: NeighborhoodStats | null;
  loading: boolean;
};

type Mode = 'total' | 'status';

export function NeighborhoodBarChart({ stats, loading }: Props) {
  const [mode, setMode] = useState<Mode>('status');
  const rows = stats?.neighborhoods ?? [];

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-4 shadow-soft">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Per-neighborhood breakdown
          </p>
          <h3 className="text-sm font-semibold text-foreground">
            {mode === 'status' ? 'Completed vs pending by area' : 'Total requests by area'}
          </h3>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-[11px]">
          <Toggle active={mode === 'status'} onClick={() => setMode('status')}>
            By status
          </Toggle>
          <Toggle active={mode === 'total'} onClick={() => setMode('total')}>
            Total
          </Toggle>
        </div>
      </header>

      <div className="h-[260px] w-full">
        {loading && rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={rows}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              barCategoryGap={6}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid rgba(148,163,184,0.4)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {mode === 'status' ? (
                <>
                  <Bar dataKey="pending" stackId="s" fill="#ef4444" name="Pending" />
                  <Bar dataKey="in_progress" stackId="s" fill="#f59e0b" name="In progress" />
                  <Bar dataKey="completed" stackId="s" fill="#22c55e" name="Completed" />
                </>
              ) : (
                <Bar dataKey="total" fill="#0ea5e9" name="Total requests" />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function Toggle({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-md px-2 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ' +
        (active ? 'bg-primary/15 font-semibold text-primary' : 'text-muted-foreground hover:text-foreground')
      }
    >
      {children}
    </button>
  );
}
