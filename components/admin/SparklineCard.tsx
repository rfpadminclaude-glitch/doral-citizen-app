'use client';

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  total: number;
  delta: number; // percentage
  spark: number[];
  icon: React.ReactNode;
  tone?: 'primary' | 'secondary' | 'gold' | 'destructive';
  /** When set, the entire card is rendered as a Link to this URL. */
  href?: string;
};

const TONE_BG: Record<NonNullable<Props['tone']>, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  gold: 'bg-gold/15 text-gold',
  destructive: 'bg-destructive/15 text-destructive'
};

const TONE_STROKE: Record<NonNullable<Props['tone']>, string> = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  gold: 'hsl(var(--gold))',
  destructive: 'hsl(var(--destructive))'
};

export function SparklineCard({ label, total, delta, spark, icon, tone = 'primary', href }: Props) {
  const stroke = TONE_STROKE[tone];
  const data = spark.map((v, i) => ({ i, v }));
  const isPos = delta > 0;
  const isNeg = delta < 0;
  const card = (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface-2 p-4 shadow-soft/40 transition',
        href ? 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft' : 'hover:shadow-soft'
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', TONE_BG[tone])}>
          {icon}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
            isPos
              ? 'bg-success/15 text-success'
              : isNeg
                ? 'bg-destructive/15 text-destructive'
                : 'bg-muted text-muted-foreground'
          )}
          aria-label={`${delta >= 0 ? '+' : ''}${delta}% vs previous 7 days`}
        >
          {isPos ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : isNeg ? (
            <ArrowDownRight className="h-3 w-3" />
          ) : (
            <ArrowRight className="h-3 w-3" />
          )}
          {isPos ? '+' : ''}
          {delta}%
        </span>
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-3xl font-semibold tabular-nums text-foreground">{total}</p>
      <div className="mt-2 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={stroke}
              strokeWidth={1.6}
              fill={`url(#spark-${tone})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">last 7 days</p>
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
