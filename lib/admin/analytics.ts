/**
 * Server-side analytics queries for /admin/analytics.
 *
 * Pure async functions returning typed payloads. The page component fetches
 * everything in parallel. All queries use the service-role admin client
 * (bypasses RLS) — the page itself is admin-gated upstream.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export type DailyCount = { day: string; count: number };
export type SentimentDay = {
  day: string;
  positive: number;
  neutral: number;
  negative: number;
};
export type IntentRow = { intent: string; label: string; count: number };
export type DeflectionStats = {
  total: number;
  resolved: number;
  rate: number; // 0..1
};
export type FeedbackStats = {
  up: number;
  down: number;
  total: number;
  csat: number; // 0..1
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function buildDayBuckets(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    out.push(isoDay(d));
  }
  return out;
}

// ============================================================================
// Volume per day
// ============================================================================
export async function volumeByDay(days = 7): Promise<DailyCount[]> {
  const sb = createAdminClient();
  const since = daysAgoIso(days - 1);
  const { data } = await sb
    .from('conversations')
    .select('id, started_at')
    .gte('started_at', since);

  const counts = new Map<string, number>(buildDayBuckets(days).map((d) => [d, 0]));
  for (const c of data ?? []) {
    const day = isoDay(new Date(c.started_at as string));
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([day, count]) => ({ day, count }));
}

// ============================================================================
// Top intents — derived from service_requests + appointments + general chat
// ============================================================================
const INTENT_LABEL: Record<string, string> = {
  permit: 'Permits',
  code_violation: 'Code violations',
  park_issue: 'Parks',
  general: 'General requests',
  appointment: 'Appointments',
  general_chat: 'Information'
};

export async function topIntents(days = 7): Promise<IntentRow[]> {
  const sb = createAdminClient();
  const since = daysAgoIso(days - 1);

  const [{ data: srs }, { data: appts }, { data: convs }, { data: msgs }] = await Promise.all([
    sb.from('service_requests').select('request_type, created_at').gte('created_at', since),
    sb.from('appointments').select('id, created_at').gte('created_at', since),
    sb.from('conversations').select('id, started_at').gte('started_at', since),
    sb.from('messages').select('conversation_id').eq('role', 'user').gte('created_at', since)
  ]);

  const buckets = new Map<string, number>();
  for (const r of srs ?? []) {
    const k = (r.request_type as string) ?? 'general';
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  buckets.set('appointment', appts?.length ?? 0);

  // "general_chat" = conversations that produced messages but no SR/appointment
  const convsWithAction = new Set<string>([
    ...(srs ?? []).map((r) => r.request_type as string).map(() => ''), // placeholder
    ...(appts ?? []).map(() => '')
  ]);
  const totalChatOnly = Math.max(
    0,
    (convs?.length ?? 0) - ((srs?.length ?? 0) + (appts?.length ?? 0))
  );
  buckets.set('general_chat', totalChatOnly);
  void convsWithAction;
  void msgs;

  return Array.from(buckets.entries())
    .map(([intent, count]) => ({
      intent,
      label: INTENT_LABEL[intent] ?? intent,
      count
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

// ============================================================================
// Sentiment trend per day
// ============================================================================
export async function sentimentTrend(days = 7): Promise<SentimentDay[]> {
  const sb = createAdminClient();
  const since = daysAgoIso(days - 1);
  const { data } = await sb
    .from('messages')
    .select('sentiment, created_at')
    .eq('role', 'assistant')
    .gte('created_at', since)
    .not('sentiment', 'is', null);

  const map = new Map<string, SentimentDay>(
    buildDayBuckets(days).map((d) => [d, { day: d, positive: 0, neutral: 0, negative: 0 }])
  );

  for (const m of data ?? []) {
    const day = isoDay(new Date(m.created_at as string));
    if (!map.has(day)) continue;
    const bucket = map.get(day)!;
    const s = m.sentiment as string;
    if (s === 'positive') bucket.positive += 1;
    else if (s === 'frustrated' || s === 'negative' || s === 'urgent') bucket.negative += 1;
    else bucket.neutral += 1;
  }

  return Array.from(map.values());
}

// ============================================================================
// Deflection rate — % of conversations that did NOT escalate to a service request
// ============================================================================
export async function deflectionRate(days = 7): Promise<DeflectionStats> {
  const sb = createAdminClient();
  const since = daysAgoIso(days - 1);
  const [{ data: convs }, { data: srs }] = await Promise.all([
    sb.from('conversations').select('id').gte('started_at', since),
    sb.from('service_requests').select('conversation_id').gte('created_at', since)
  ]);

  const total = convs?.length ?? 0;
  const escalated = new Set((srs ?? []).map((r) => r.conversation_id as string)).size;
  const resolved = Math.max(0, total - escalated);
  const rate = total > 0 ? resolved / total : 0;
  return { total, resolved, rate };
}

// ============================================================================
// Dashboard helpers
// ============================================================================
export type SparklineKpi = {
  key: 'conversations' | 'service_requests' | 'appointments' | 'feedback';
  label: string;
  total: number;
  spark: number[];
  prevTotal: number;
  delta: number;
};

export async function dashboardKpis(): Promise<SparklineKpi[]> {
  const sb = createAdminClient();
  const since14 = daysAgoIso(13);
  const cutoff = daysAgoIso(6);

  const [{ data: convs }, { data: srs }, { data: appts }, { data: feedback }] = await Promise.all([
    sb.from('conversations').select('started_at').gte('started_at', since14),
    sb.from('service_requests').select('created_at').gte('created_at', since14),
    sb.from('appointments').select('created_at').gte('created_at', since14),
    sb.from('feedback_ratings').select('created_at').gte('created_at', since14)
  ]);

  function bucketize(rows: Array<Record<string, unknown>>, field: string): SparklineKpi {
    const buckets = new Map<string, number>(buildDayBuckets(7).map((d) => [d, 0]));
    let prev = 0;
    let cur = 0;
    for (const r of rows ?? []) {
      const v = r[field] as string | undefined;
      if (!v) continue;
      const at = new Date(v);
      if (Number.isNaN(at.getTime())) continue;
      const day = isoDay(at);
      if (at.toISOString() >= cutoff) {
        cur += 1;
        if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
      } else {
        prev += 1;
      }
    }
    const spark = Array.from(buckets.values());
    const delta = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
    return { key: 'conversations', label: '', total: cur, spark, prevTotal: prev, delta };
  }

  return [
    { ...bucketize((convs ?? []) as Array<Record<string, unknown>>, 'started_at'), key: 'conversations', label: 'Conversations' },
    { ...bucketize((srs ?? []) as Array<Record<string, unknown>>, 'created_at'), key: 'service_requests', label: 'Service requests' },
    { ...bucketize((appts ?? []) as Array<Record<string, unknown>>, 'created_at'), key: 'appointments', label: 'Appointments' },
    { ...bucketize((feedback ?? []) as Array<Record<string, unknown>>, 'created_at'), key: 'feedback', label: 'Feedback' }
  ];
}

export type ActivityEvent = {
  id: string;
  type: 'conversation' | 'service_request' | 'appointment' | 'feedback' | 'announcement' | 'document';
  /** Refinement of `type` — e.g. for service_request, the request_type ('pothole', 'permit', etc.) */
  subtype?: string;
  title: string;
  subtitle?: string;
  at: string;
  /** Optional href to deep-link from the activity row */
  href?: string;
};

export async function dashboardActivityFeed(limit = 8): Promise<ActivityEvent[]> {
  const sb = createAdminClient();
  const [{ data: convs }, { data: srs }, { data: appts }, { data: fb }, { data: ann }] = await Promise.all([
    sb.from('conversations').select('id, session_id, resident_name, lang, started_at').order('started_at', { ascending: false }).limit(limit),
    sb.from('service_requests').select('id, request_type, title, resident_name, created_at').order('created_at', { ascending: false }).limit(limit),
    sb.from('appointments').select('id, appointment_type, resident_name, slot_start, created_at').order('created_at', { ascending: false }).limit(limit),
    sb.from('feedback_ratings').select('id, rating, comment, created_at').order('created_at', { ascending: false }).limit(limit),
    sb.from('announcements').select('id, title_en, severity, publish_at').order('publish_at', { ascending: false }).limit(limit)
  ]);

  const events: ActivityEvent[] = [];
  for (const c of convs ?? []) {
    events.push({
      id: `c_${c.id}`,
      type: 'conversation',
      title: (c.resident_name as string | null) ?? `Anonymous #${(c.session_id as string).slice(0, 6).toUpperCase()}`,
      subtitle: `started a ${c.lang} chat`,
      at: c.started_at as string
    });
  }
  for (const s of srs ?? []) {
    events.push({
      id: `s_${s.id}`,
      type: 'service_request',
      subtype: s.request_type as string,
      title: (s.title as string) ?? 'Service request',
      subtitle: `${s.resident_name ?? 'Anonymous'} · ${s.request_type}`,
      at: s.created_at as string,
      href: `/admin/requests/${s.id}`
    });
  }
  for (const a of appts ?? []) {
    events.push({
      id: `a_${a.id}`,
      type: 'appointment',
      subtype: a.appointment_type as string,
      title: `${(a.appointment_type as string).replace('_', ' ')} appointment`,
      subtitle: `${a.resident_name ?? 'Anonymous'} · ${new Date(a.slot_start as string).toLocaleString()}`,
      at: a.created_at as string
    });
  }
  for (const f of fb ?? []) {
    events.push({
      id: `f_${f.id}`,
      type: 'feedback',
      title: `${(f.rating as number) >= 4 ? '👍' : '👎'} feedback received`,
      subtitle: (f.comment as string | null) ?? undefined,
      at: f.created_at as string
    });
  }
  for (const a of ann ?? []) {
    events.push({
      id: `n_${a.id}`,
      type: 'announcement',
      title: a.title_en as string,
      subtitle: `${a.severity} announcement published`,
      at: a.publish_at as string
    });
  }

  return events.sort((x, y) => (x.at < y.at ? 1 : -1)).slice(0, limit);
}

// ============================================================================
// Needs-attention helpers (dashboard)
// ============================================================================

export type OpenRequest = {
  id: string;
  title: string;
  request_type: string;
  status: 'new' | 'in_progress';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  resident_name: string | null;
  created_at: string;
};

/**
 * Open service requests at high or urgent priority — the queue staff should
 * tackle first. Sorted urgent-then-high, oldest-first within each bucket so
 * the rows that have been waiting longest float up.
 */
export async function openHighPriorityRequests(limit = 5): Promise<OpenRequest[]> {
  const sb = createAdminClient();
  const { data } = await sb
    .from('service_requests')
    .select('id, title, request_type, status, priority, resident_name, created_at')
    .in('status', ['new', 'in_progress'])
    .in('priority', ['high', 'urgent'])
    .order('created_at', { ascending: true })
    .limit(limit * 2); // fetch more than needed so the JS sort has headroom

  const order: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  return (data ?? [])
    .sort((a, b) => (order[a.priority as string] ?? 9) - (order[b.priority as string] ?? 9))
    .slice(0, limit) as OpenRequest[];
}

export type TodayAppointment = {
  id: string;
  appointment_type: string;
  slot_start: string;
  resident_name: string | null;
  confirmation_code: string;
};

/**
 * Booked appointments whose slot_start falls within today's local-day window.
 * Uses the server's local date to define the window so it matches what the
 * staff sees on their wall clock. Returned sorted earliest-first.
 */
export async function todaysAppointments(): Promise<TodayAppointment[]> {
  const sb = createAdminClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const { data } = await sb
    .from('appointments')
    .select('id, appointment_type, slot_start, resident_name, confirmation_code, status')
    .gte('slot_start', start.toISOString())
    .lt('slot_start', end.toISOString())
    .eq('status', 'booked')
    .order('slot_start', { ascending: true });
  return (data ?? []) as TodayAppointment[];
}

// ============================================================================
// Feedback breakdown
// ============================================================================
export async function feedbackBreakdown(days = 7): Promise<FeedbackStats> {
  const sb = createAdminClient();
  const since = daysAgoIso(days - 1);
  const { data } = await sb
    .from('feedback_ratings')
    .select('rating')
    .gte('created_at', since);
  let up = 0;
  let down = 0;
  for (const r of data ?? []) {
    const v = r.rating as number;
    if (v >= 4) up += 1;
    else if (v <= 2) down += 1;
  }
  const total = up + down;
  const csat = total > 0 ? up / total : 0;
  return { up, down, total, csat };
}
