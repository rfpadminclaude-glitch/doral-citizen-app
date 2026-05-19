'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  Heart,
  MessageSquare,
  ThumbsUp,
  TrendingUp
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type {
  DailyCount,
  DeflectionStats,
  FeedbackStats,
  IntentRow,
  SentimentDay
} from '@/lib/admin/analytics';

type Props = {
  volume: DailyCount[];
  intents: IntentRow[];
  sentiment: SentimentDay[];
  deflection: DeflectionStats;
  feedback: FeedbackStats;
};

const PRIMARY = 'hsl(var(--primary))';
const SECONDARY = 'hsl(var(--secondary))';
const GOLD = 'hsl(var(--gold))';
const DESTRUCTIVE = 'hsl(var(--destructive))';
const MUTED = 'hsl(var(--muted-foreground))';

const tickStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const cardClass =
  'rounded-2xl border border-border bg-surface-2 p-5 shadow-soft/40 transition hover:shadow-soft';

function shortDay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric'
  });
}

export function AnalyticsClient({ volume, intents, sentiment, deflection, feedback }: Props) {
  const volumeData = volume.map((v) => ({ ...v, label: shortDay(v.day) }));
  const sentimentData = sentiment.map((s) => ({ ...s, label: shortDay(s.day) }));
  const deflectionPct = Math.round(deflection.rate * 100);
  const csatPct = Math.round(feedback.csat * 100);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Volume — top-left */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={cardClass}
        aria-label="Conversation volume"
      >
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Conversation volume
              </p>
              <h3 className="text-sm font-semibold text-foreground">Last 7 days</h3>
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {volume.reduce((s, v) => s + v.count, 0)} total
          </span>
        </header>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12
                }}
                cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
              />
              <Bar dataKey="count" fill={PRIMARY} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* Top intents — top-right */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className={cardClass}
        aria-label="Top intents"
      >
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Top intents
              </p>
              <h3 className="text-sm font-semibold text-foreground">What residents asked about</h3>
            </div>
          </div>
        </header>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={intents} layout="vertical" margin={{ left: 12, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                dataKey="label"
                type="category"
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12
                }}
                cursor={{ fill: 'hsl(var(--secondary) / 0.1)' }}
              />
              <Bar dataKey="count" fill={SECONDARY} radius={[0, 8, 8, 0]}>
                {intents.map((_, i) => (
                  <Cell
                    key={i}
                    fill={[SECONDARY, PRIMARY, GOLD, DESTRUCTIVE, SECONDARY, PRIMARY][i % 6]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* Sentiment trend — bottom-left */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className={cardClass}
        aria-label="Sentiment trend"
      >
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sentiment trend
              </p>
              <h3 className="text-sm font-semibold text-foreground">Last 7 days, assistant messages</h3>
            </div>
          </div>
        </header>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sentimentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="positive"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="neutral"
                stroke={MUTED}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="negative"
                stroke={DESTRUCTIVE}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* Deflection KPI + CSAT mini — bottom-right */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className={cardClass}
        aria-label="Deflection and feedback"
      >
        <header className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Heart className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Outcomes
            </p>
            <h3 className="text-sm font-semibold text-foreground">Deflection and feedback</h3>
          </div>
        </header>

        <div className="grid h-56 grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Deflection big number */}
          <div className="flex flex-col justify-center rounded-xl bg-surface px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Deflection rate
            </p>
            <p className="mt-1 text-5xl font-bold tabular-nums text-primary">
              {deflectionPct}
              <span className="ml-1 text-2xl text-muted-foreground">%</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {deflection.resolved} of {deflection.total} sessions resolved without a service request
            </p>
          </div>

          {/* CSAT mini */}
          <div className="flex flex-col justify-center rounded-xl bg-surface px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              CSAT (👍 / 👎)
            </p>
            <p className="mt-1 flex items-baseline gap-2 text-4xl font-bold tabular-nums text-gold">
              {csatPct}
              <span className="text-xl text-muted-foreground">%</span>
            </p>
            <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {feedback.up}
              </span>
              <span>·</span>
              <span>{feedback.total} rated</span>
            </p>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
