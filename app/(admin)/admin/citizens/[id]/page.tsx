import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { listNeighborhoods } from '@/lib/geo/neighborhoods';
import { CitizenDetailClient } from './CitizenDetailClient';

export const dynamic = 'force-dynamic';

export default async function CitizenDetailPage({ params }: { params: { id: string } }) {
  const sb = createClient();

  const { data: citizen } = await sb
    .from('citizens')
    .select(
      'id, name, phone, email, address_line, lat, lng, neighborhood_slug, source, notes, created_at, updated_at'
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!citizen) notFound();

  const { data: requests } = await sb
    .from('service_requests')
    .select('id, title, request_type, status, priority, created_at')
    .eq('citizen_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const t = await getTranslations('admin.citizens');

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link
        href="/admin/citizens"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:underline"
      >
        <ArrowLeft className="h-3 w-3" />
        {t('backToList')}
      </Link>

      <CitizenDetailClient
        citizen={citizen}
        requests={requests ?? []}
        neighborhoods={listNeighborhoods()}
      />
    </div>
  );
}
