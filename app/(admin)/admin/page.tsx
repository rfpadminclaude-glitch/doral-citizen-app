import { CalendarClock, FileWarning, MessageSquare, ThumbsUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { AttentionPanel } from '@/components/admin/AttentionPanel';
import { SentimentDonut } from '@/components/admin/SentimentDonut';
import { SparklineCard } from '@/components/admin/SparklineCard';
import { TodaysAppointments } from '@/components/admin/TodaysAppointments';
import {
  dashboardActivityFeed,
  dashboardKpis,
  openHighPriorityRequests,
  sentimentTrend,
  todaysAppointments
} from '@/lib/admin/analytics';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const KPI_ICON: Record<string, { icon: React.ReactNode; tone: 'primary' | 'secondary' | 'gold' | 'destructive' }> = {
  conversations: { icon: <MessageSquare className="h-4 w-4" />, tone: 'primary' },
  service_requests: { icon: <FileWarning className="h-4 w-4" />, tone: 'destructive' },
  appointments: { icon: <CalendarClock className="h-4 w-4" />, tone: 'gold' },
  feedback: { icon: <ThumbsUp className="h-4 w-4" />, tone: 'secondary' }
};

const COMPLAINT_TYPES = ['code_violation', 'complaint', 'pothole'];

function greetingKey(): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' | 'greetingNight' {
  const h = new Date().getHours();
  if (h < 6) return 'greetingNight';
  if (h < 12) return 'greetingMorning';
  if (h < 17) return 'greetingAfternoon';
  if (h < 22) return 'greetingEvening';
  return 'greetingNight';
}

async function todaysCounts(): Promise<{ convs: number; complaints: number }> {
  const sb = createAdminClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const [{ count: convs }, { count: complaints }] = await Promise.all([
    sb
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', start),
    sb
      .from('service_requests')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start)
      .in('request_type', COMPLAINT_TYPES)
  ]);
  return { convs: convs ?? 0, complaints: complaints ?? 0 };
}

export default async function AdminDashboard() {
  const sb = createClient();
  const {
    data: { user }
  } = await sb.auth.getUser();
  const { data: admin } = user
    ? await sb.from('admin_users').select('display_name').eq('auth_id', user.id).maybeSingle()
    : { data: null };

  const t = await getTranslations('admin.dashboard');

  const [kpis, activity, sentiment, openReqs, todayAppts, today] = await Promise.all([
    dashboardKpis(),
    dashboardActivityFeed(12),
    sentimentTrend(7),
    openHighPriorityRequests(5),
    todaysAppointments(),
    todaysCounts()
  ]);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const firstName = admin?.display_name?.split(' ')[0] ?? 'Admin';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero — greeting + today's summary line */}
      <header className="rounded-2xl border border-border bg-gradient-to-br from-surface-2 to-surface p-5 shadow-soft/40 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          {dateLabel}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
          {t(greetingKey())}, {firstName} 👋
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('todaySummary', { convs: today.convs, complaints: today.complaints })}
        </p>
      </header>

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

      {/* Needs attention + Today's appointments — cards size to content */}
      <section className="grid items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttentionPanel
            requests={openReqs}
            title={t('needsAttentionTitle')}
            kicker={t('needsAttentionKicker')}
            emptyLabel={t('needsAttentionEmpty')}
          />
        </div>
        <div className="lg:col-span-1">
          <TodaysAppointments
            appointments={todayAppts}
            title={t('todaysAppointmentsTitle')}
            kicker={t('todaysAppointmentsKicker')}
            emptyLabel={t('todaysAppointmentsEmpty')}
          />
        </div>
      </section>

      {/* Activity feed + sentiment donut — cards size to content */}
      <section className="grid items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed
            events={activity}
            title={t('activityTitle')}
            kicker={t('activityKicker')}
          />
        </div>
        <div className="lg:col-span-1">
          <SentimentDonut data={sentiment} />
        </div>
      </section>
    </div>
  );
}
