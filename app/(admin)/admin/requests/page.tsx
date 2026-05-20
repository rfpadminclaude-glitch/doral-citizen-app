import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { RequestsClient } from './RequestsClient';

export const dynamic = 'force-dynamic';

export default async function ServiceRequestsPage() {
  const sb = createClient();
  const { data: requests } = await sb
    .from('service_requests')
    .select(
      'id, request_type, title, description, status, priority, resident_name, resident_contact, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  const t = await getTranslations('admin.requests');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          {t('subtitleKicker')}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <RequestsClient
        rows={(requests ?? []).map((r) => ({
          id: r.id,
          request_type: r.request_type,
          title: r.title,
          description: r.description,
          status: r.status as 'new' | 'in_progress' | 'resolved' | 'closed',
          priority: r.priority as 'low' | 'normal' | 'high' | 'urgent',
          resident_name: r.resident_name,
          resident_contact: r.resident_contact,
          created_at: r.created_at,
          updated_at: r.updated_at
        }))}
      />
    </div>
  );
}
