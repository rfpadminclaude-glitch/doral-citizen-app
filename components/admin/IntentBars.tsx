'use client';

import Link from 'next/link';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { IntentRow } from '@/lib/admin/analytics';
import { cn } from '@/lib/utils';

type Props = {
  data: IntentRow[];
  title: string;
  kicker: string;
  href?: string;
  className?: string;
};

// Mapping intent code → tailwind HSL var so each bar gets its semantic color.
const INTENT_COLOR: Record<string, string> = {
  permit: 'hsl(var(--primary))',
  code_violation: 'hsl(var(--accent))',
  park_issue: 'hsl(var(--secondary))',
  general: 'hsl(var(--gold))',
  appointment: 'hsl(var(--gold))',
  general_chat: 'hsl(var(--muted-foreground))',
  pothole: 'hsl(var(--accent))',
  inspection: 'hsl(var(--secondary))',
  complaint: 'hsl(var(--destructive))'
};

const FALLBACK_COLOR = 'hsl(var(--primary))';

export function IntentBars({ data, title, kicker, href, className }: Props) {
  // Recharts paints bars top-down; reverse so the top intent is at the top
  // visually. Use the label for the Y-axis category.
  const series = data.map((d) => ({
    label: d.label,
    count: d.count,
    intent: d.intent
  }));

  const body = (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-border bg-surface-2 p-5 shadow-soft/40 transition',
        href && 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft',
        className
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {kicker}
          </p>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {data.length}
        </span>
      </header>

      <div className="mt-4 w-full" style={{ height: Math.max(160, series.length * 32) }}>
        {series.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl bg-surface px-4 py-8 text-center text-xs text-muted-foreground">
            No intent data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={series}
              layout="vertical"
              margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              barCategoryGap={8}
            >
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--primary) / 0.06)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12,
                  padding: '6px 10px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
              />
              <Bar
                dataKey="count"
                radius={[0, 8, 8, 0]}
                isAnimationActive
                animationDuration={650}
                animationEasing="ease-out"
              >
                {series.map((d) => (
                  <Cell key={d.intent} fill={INTENT_COLOR[d.intent] ?? FALLBACK_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {body}
    </Link>
  ) : (
    body
  );
}
