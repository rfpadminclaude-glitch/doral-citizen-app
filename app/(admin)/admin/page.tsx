import {
  ArrowRight,
  CalendarClock,
  FileWarning,
  MessageSquare,
  ThumbsUp,
  Library,
  Megaphone,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { SentimentDonut } from '@/components/admin/SentimentDonut';
import { SparklineCard } from '@/components/admin/SparklineCard';
import { dashboardActivityFeed, dashboardKpis, sentimentTrend } from '@/lib/admin/analytics';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}

const QUICK_ACTIONS: Array<{
  label: string;
  href: string;
  icon: React.ReactNode;
  tone: string;
}> = [
  {
    label: 'Compose announcement',
    href: '/admin/announcements',
    icon: <Megaphone className="h-4 w-4" />,
    tone: 'bg-primary/10 text-primary'
  },
  {
    label: 'Knowledge base',
    href: '/admin/knowledge',
    icon: <Library className="h-4 w-4" />,
    tone: 'bg-secondary/10 text-secondary'
  },
  {
    label: 'Live conversations',
    href: '/admin/conversations',
    icon: <MessageSquare className="h-4 w-4" />,
    tone: 'bg-gold/15 text-gold'
  },
  {
    label: 'Full analytics',
    href: '/admin/analytics',
    icon: <Sparkles className="h-4 w-4" />,
    tone: 'bg-accent/10 text-accent'
  }
];

const KPI_ICON: Record<string, { icon: React.ReactNode; tone: 'primary' | 'secondary' | 'gold' | 'destructive' }> = {
  conversations: { icon: <MessageSquare className="h-4 w-4" />, tone: 'primary' },
  service_requests: { icon: <FileWarning className="h-4 w-4" />, tone: 'destructive' },
  appointments: { icon: <CalendarClock className="h-4 w-4" />, tone: 'gold' },
  feedback: { icon: <ThumbsUp className="h-4 w-4" />, tone: 'secondary' }
};

export default async function AdminDashboard() {
  const sb = createClient();
  const {
    data: { user }
  } = await sb.auth.getUser();
  const { data: admin } = user
    ? await sb.from('admin_users').select('display_name').eq('auth_id', user.id).maybeSingle()
    : { data: null };

  const [kpis, activity, sentiment] = await Promise.all([
    dashboardKpis(),
    dashboardActivityFeed(8),
    sentimentTrend(7)
  ]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Greeting + quick actions */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {today}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
            {greeting()}, {admin?.display_name?.split(' ')[0] ?? 'Admin'} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live snapshot of the Doral citizen assistant.
          </p>
        </div>
      </header>

      {/* Quick actions */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-2 rounded-2xl border border-border bg-surface-2 px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.tone}`}>
              {a.icon}
            </span>
            <span className="flex-1 truncate text-sm font-medium text-foreground">{a.label}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>

      {/* KPI sparkline cards */}
      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <SparklineCard
            key={k.key}
            label={k.label}
            total={k.total}
            delta={k.delta}
            spark={k.spark}
            icon={KPI_ICON[k.key].icon}
            tone={KPI_ICON[k.key].tone}
          />
        ))}
      </section>

      {/* Sentiment donut + activity feed */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SentimentDonut data={sentiment} />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed events={activity} />
        </div>
      </section>
    </div>
  );
}
