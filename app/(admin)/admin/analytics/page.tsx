import {
  deflectionRate,
  feedbackBreakdown,
  sentimentTrend,
  topIntents,
  volumeByDay
} from '@/lib/admin/analytics';
import { AnalyticsClient } from './AnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const [volume, intents, sentiment, deflection, feedback] = await Promise.all([
    volumeByDay(7),
    topIntents(7),
    sentimentTrend(7),
    deflectionRate(7),
    feedbackBreakdown(7)
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Insights
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live snapshot of resident interactions across the last 7 days. Updates in real time as new
          conversations and feedback arrive.
        </p>
      </header>

      <AnalyticsClient
        volume={volume}
        intents={intents}
        sentiment={sentiment}
        deflection={deflection}
        feedback={feedback}
      />
    </div>
  );
}
