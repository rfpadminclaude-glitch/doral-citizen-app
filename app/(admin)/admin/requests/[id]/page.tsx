import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { RequestDetailClient, type AuditEntry, type RequestDetail } from './RequestDetailClient';

export const dynamic = 'force-dynamic';

export default async function ServiceRequestDetailPage({
  params
}: {
  params: { id: string };
}) {
  const sb = createClient();

  const { data: req } = await sb
    .from('service_requests')
    .select(
      'id, request_type, title, description, status, priority, resident_name, resident_contact, created_at, updated_at'
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!req) notFound();

  // Activity history — audit_log rows scoped to this request, newest first.
  const { data: audit } = await sb
    .from('audit_log')
    .select('id, action, metadata, created_at')
    .eq('entity_type', 'service_request')
    .eq('entity_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const t = await getTranslations('admin.requests');

  const detail: RequestDetail = {
    id: req.id,
    request_type: req.request_type,
    title: req.title,
    description: req.description,
    status: req.status as RequestDetail['status'],
    priority: req.priority as RequestDetail['priority'],
    resident_name: req.resident_name,
    resident_contact: req.resident_contact,
    created_at: req.created_at,
    updated_at: req.updated_at
  };

  const history: AuditEntry[] = (audit ?? []).map((a) => ({
    id: a.id,
    action: a.action,
    metadata: (a.metadata ?? {}) as Record<string, unknown>,
    created_at: a.created_at
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          {t('detailHeading')}
        </p>
      </header>
      <RequestDetailClient request={detail} history={history} />
    </div>
  );
}
