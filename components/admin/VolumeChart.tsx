'use client';

import { TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyCount } from '@/lib/admin/analytics';
import { cn } from '@/lib/utils';

type Props = {
  data: DailyCount[];
  title: string;
  kicker: string;
  href?: string;
  className?: string;
};

function shortDay(iso: string): string {
  // Format ISO YYYY-MM-DD as "May 21" — short, locale-aware.
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function VolumeChart({ data, title, kicker, href, className }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const peak = data.reduce((m, d) => (d.count > m ? d.count : m), 0);
  const series = data.map((d) => ({ day: shortDay(d.day), count: d.count, raw: d.day }));

  const body = (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface-2 p-5 shadow-soft/40 transition',
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
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          <TrendingUp className="h-3 w-3" />
          {total}
        </span>
      </header>

      <div className="mt-4 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="volume-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={28}
              domain={[0, Math.max(peak, 4)]}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                fontSize: 12,
                padding: '6px 10px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
              cursor={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.4, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#volume-grad)"
              activeDot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
              isAnimationActive
              animationDuration={650}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
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
