import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { listNeighborhoods } from '@/lib/geo/neighborhoods';
import { CitizensClient } from './CitizensClient';

export const dynamic = 'force-dynamic';

export default async function CitizensPage() {
  const sb = createClient();

  const [{ data: citizens }, { data: requestRows }] = await Promise.all([
    sb
      .from('citizens')
      .select(
        'id, name, phone, email, address_line, lat, lng, neighborhood_slug, source, created_at'
      )
      .order('name', { ascending: true })
      .limit(500),
    sb.from('service_requests').select('citizen_id').not('citizen_id', 'is', null).limit(5000)
  ]);

  const t = await getTranslations('admin.citizens');
  const neighborhoods = listNeighborhoods();

  const counts = new Map<string, number>();
  for (const r of requestRows ?? []) {
    if (!r.citizen_id) continue;
    counts.set(r.citizen_id, (counts.get(r.citizen_id) ?? 0) + 1);
  }

  const rows = (citizens ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address_line: c.address_line,
    lat: c.lat,
    lng: c.lng,
    neighborhood_slug: c.neighborhood_slug,
    source: c.source,
    created_at: c.created_at,
    request_count: counts.get(c.id) ?? 0
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {t('subtitleKicker')}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Link
          href="/admin/citizens/new"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="h-4 w-4" />
          {t('newCitizen')}
        </Link>
      </header>

      <CitizensClient rows={rows} neighborhoods={neighborhoods} />
    </div>
  );
}
