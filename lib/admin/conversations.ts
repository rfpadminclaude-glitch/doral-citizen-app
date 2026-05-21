import { createClient } from '@/lib/supabase/server';

export const PAGE_SIZE = 25;

export type ConvFilters = {
  q?: string;
  channel?: 'web' | 'sms' | 'whatsapp' | 'facebook' | 'all';
  lang?: 'en' | 'es' | 'all';
  sentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'urgent' | 'all';
  status?: 'active' | 'closed' | 'all';
  from?: string;
  to?: string;
  page?: number;
};

export type ConvRow = {
  id: string;
  session_id: string;
  channel: string;
  lang: string;
  resident_name: string | null;
  overall_sentiment: string | null;
  status: string;
  last_activity_at: string | null;
  msg_count: number;
  preview: string | null;
  has_request: boolean;
  has_appointment: boolean;
};

export type ListResult = {
  rows: ConvRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listConversations(filters: ConvFilters): Promise<ListResult> {
  const sb = createClient();
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  let query = sb
    .from('conversations')
    .select(
      'id, session_id, channel, lang, resident_name, overall_sentiment, status, last_activity_at',
      { count: 'exact' }
    )
    .order('last_activity_at', { ascending: false });

  if (filters.channel && filters.channel !== 'all') {
    query = query.eq('channel', filters.channel);
  }
  if (filters.lang && filters.lang !== 'all') {
    query = query.eq('lang', filters.lang);
  }
  if (filters.sentiment && filters.sentiment !== 'all') {
    query = query.eq('overall_sentiment', filters.sentiment);
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.from) {
    query = query.gte('last_activity_at', new Date(filters.from).toISOString());
  }
  if (filters.to) {
    const end = new Date(filters.to);
    end.setHours(23, 59, 59, 999);
    query = query.lte('last_activity_at', end.toISOString());
  }
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim();
    query = query.or(`resident_name.ilike.%${q}%,session_id.ilike.%${q}%`);
  }

  const { data: convs, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const ids = (convs ?? []).map((c) => c.id as string);
  if (ids.length === 0) {
    return { rows: [], total: count ?? 0, page, pageSize: PAGE_SIZE };
  }

  const [msgsRes, srRes, apptRes] = await Promise.all([
    sb
      .from('messages')
      .select('conversation_id, role, content, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: true }),
    sb.from('service_requests').select('conversation_id').in('conversation_id', ids),
    sb.from('appointments').select('conversation_id').in('conversation_id', ids)
  ]);

  const countByConv = new Map<string, number>();
  const previewByConv = new Map<string, string>();
  for (const m of msgsRes.data ?? []) {
    const cid = m.conversation_id as string;
    countByConv.set(cid, (countByConv.get(cid) ?? 0) + 1);
    if (!previewByConv.has(cid) && m.role === 'user' && (m.content as string)?.trim()) {
      previewByConv.set(cid, m.content as string);
    }
  }
  const hasRequest = new Set((srRes.data ?? []).map((r) => r.conversation_id as string));
  const hasAppointment = new Set((apptRes.data ?? []).map((r) => r.conversation_id as string));

  const rows: ConvRow[] = (convs ?? []).map((c) => ({
    id: c.id as string,
    session_id: c.session_id as string,
    channel: c.channel as string,
    lang: c.lang as string,
    resident_name: (c.resident_name as string | null) ?? null,
    overall_sentiment: (c.overall_sentiment as string | null) ?? null,
    status: (c.status as string) ?? 'active',
    last_activity_at: (c.last_activity_at as string | null) ?? null,
    msg_count: countByConv.get(c.id as string) ?? 0,
    preview: previewByConv.get(c.id as string) ?? null,
    has_request: hasRequest.has(c.id as string),
    has_appointment: hasAppointment.has(c.id as string)
  }));

  return { rows, total: count ?? rows.length, page, pageSize: PAGE_SIZE };
}

export type ConversationSummary = {
  user_turns: number;
  total_turns: number;
  tokens_in: number;
  tokens_out: number;
  duration_ms: number;
  status: string;
  linked_request: { id: string; title: string } | null;
  linked_appointment: { id: string; appointment_type: string; slot_start: string } | null;
};

export async function conversationSummary(
  convId: string,
  startedAt: string,
  lastActivityAt: string,
  status: string
): Promise<ConversationSummary> {
  const sb = createClient();
  const [msgsRes, srRes, apptRes] = await Promise.all([
    sb
      .from('messages')
      .select('role, tokens_in, tokens_out')
      .eq('conversation_id', convId),
    sb
      .from('service_requests')
      .select('id, title')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from('appointments')
      .select('id, appointment_type, slot_start')
      .eq('conversation_id', convId)
      .order('slot_start', { ascending: true })
      .limit(1)
      .maybeSingle()
  ]);

  let user_turns = 0;
  let total_turns = 0;
  let tokens_in = 0;
  let tokens_out = 0;
  for (const m of msgsRes.data ?? []) {
    const role = m.role as string;
    if (role === 'user' || role === 'assistant') total_turns += 1;
    if (role === 'user') user_turns += 1;
    tokens_in += (m.tokens_in as number) ?? 0;
    tokens_out += (m.tokens_out as number) ?? 0;
  }

  const duration_ms = Math.max(
    0,
    new Date(lastActivityAt).getTime() - new Date(startedAt).getTime()
  );

  return {
    user_turns,
    total_turns,
    tokens_in,
    tokens_out,
    duration_ms,
    status,
    linked_request: srRes.data
      ? { id: srRes.data.id as string, title: srRes.data.title as string }
      : null,
    linked_appointment: apptRes.data
      ? {
          id: apptRes.data.id as string,
          appointment_type: apptRes.data.appointment_type as string,
          slot_start: apptRes.data.slot_start as string
        }
      : null
  };
}

export type CitationSource = {
  chunk_id: string;
  document_id: string;
  document_title: string;
};

export async function loadCitationSources(chunkIds: string[]): Promise<Map<string, CitationSource>> {
  const unique = Array.from(new Set(chunkIds.filter(Boolean)));
  const map = new Map<string, CitationSource>();
  if (unique.length === 0) return map;
  const sb = createClient();
  const { data } = await sb
    .from('document_chunks')
    .select('id, document_id, documents(id, title, source_url)')
    .in('id', unique);
  type DocRef = { id: string; title: string | null; source_url: string };
  for (const row of (data ?? []) as unknown as Array<{
    id: string;
    document_id: string;
    documents: DocRef | DocRef[] | null;
  }>) {
    const doc = Array.isArray(row.documents) ? row.documents[0] : row.documents;
    const title = doc?.title?.trim() || doc?.source_url || 'Untitled source';
    map.set(row.id, {
      chunk_id: row.id,
      document_id: row.document_id,
      document_title: title
    });
  }
  return map;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}
