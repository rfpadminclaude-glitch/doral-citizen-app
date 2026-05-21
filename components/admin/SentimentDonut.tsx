'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { SentimentDay } from '@/lib/admin/analytics';

type Props = {
  data: SentimentDay[];
};

const COLORS = {
  positive: 'hsl(var(--success))',
  neutral: 'hsl(var(--muted-foreground))',
  negative: 'hsl(var(--destructive))'
};

export function SentimentDonut({ data }: Props) {
  const totals = data.reduce(
    (acc, d) => ({
      positive: acc.positive + d.positive,
      neutral: acc.neutral + d.neutral,
      negative: acc.negative + d.negative
    }),
    { positive: 0, neutral: 0, negative: 0 }
  );
  const grand = totals.positive + totals.neutral + totals.negative;
  const slices = [
    { name: 'Positive', value: totals.positive, key: 'positive' as const },
    { name: 'Neutral', value: totals.neutral, key: 'neutral' as const },
    { name: 'Negative', value: totals.negative, key: 'negative' as const }
  ];

  const pct = (n: number) => (grand > 0 ? Math.round((n / grand) * 100) : 0);

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5 shadow-soft/40">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sentiment mix
          </p>
          <h3 className="text-sm font-semibold text-foreground">Last 7 days</h3>
        </div>
        <span className="text-xs text-muted-foreground">{grand} replies</span>
      </header>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={2}
                stroke="none"
              >
                {slices.map((s) => (
                  <Cell key={s.key} fill={COLORS[s.key]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums text-foreground">{pct(totals.positive)}%</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">positive</span>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[s.key] }} />
                <span className="text-foreground">{s.name}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">
                {s.value} <span className="opacity-60">· {pct(s.value)}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
