'use client';

import { Mail, MapPin, Phone, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Neighborhood } from '@/lib/geo/neighborhoods';
import { cn } from '@/lib/utils';

export type CitizenRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address_line: string | null;
  lat: number | null;
  lng: number | null;
  neighborhood_slug: string | null;
  source: string | null;
  created_at: string;
  request_count: number;
};

export function CitizensClient({
  rows,
  neighborhoods
}: {
  rows: CitizenRow[];
  neighborhoods: Neighborhood[];
}) {
  const t = useTranslations('admin.citizens');
  const [query, setQuery] = useState('');
  const [neighborhood, setNeighborhood] = useState<string>('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (neighborhood && r.neighborhood_slug !== neighborhood) return false;
      if (!q) return true;
      const hay = `${r.name} ${r.email ?? ''} ${r.phone ?? ''} ${r.address_line ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, neighborhood]);

  const totalMapped = rows.filter((r) => r.lat != null && r.lng != null).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={t('kpiTotal')} value={rows.length} />
        <Kpi label={t('kpiMapped')} value={totalMapped} />
        <Kpi label={t('kpiNeighborhoods')} value={neighborhoods.length} />
        <Kpi
          label={t('kpiWithRequests')}
          value={rows.filter((r) => r.request_count > 0).length}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="block w-full rounded-full border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>
        <select
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          aria-label={t('filterNeighborhood')}
          className="rounded-full border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="">{t('allNeighborhoods')}</option>
          {neighborhoods.map((n) => (
            <option key={n.slug} value={n.slug}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-2 p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold text-foreground">{t('empty')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">{t('colName')}</th>
                <th className="px-4 py-2.5">{t('colContact')}</th>
                <th className="px-4 py-2.5">{t('colAddress')}</th>
                <th className="px-4 py-2.5">{t('colNeighborhood')}</th>
                <th className="px-4 py-2.5 text-right">{t('colRequests')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const neighborhoodName =
                  c.neighborhood_slug
                    ? neighborhoods.find((n) => n.slug === c.neighborhood_slug)?.name ?? c.neighborhood_slug
                    : '—';
                return (
                  <tr
                    key={c.id}
                    className="group border-b border-border/60 last:border-0 transition hover:bg-surface/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/citizens/${c.id}`}
                        className="font-medium text-foreground transition group-hover:text-primary focus-visible:outline-none focus-visible:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3" /> {c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </div>
                      )}
                      {!c.email && !c.phone && <span>—</span>}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-xs text-muted-foreground">
                      <div className="flex items-start gap-1.5">
                        <MapPin
                          className={cn(
                            'mt-0.5 h-3 w-3 shrink-0',
                            c.lat != null && c.lng != null ? 'text-success' : 'text-muted-foreground'
                          )}
                          aria-hidden
                        />
                        <span className="truncate">{c.address_line ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">{neighborhoodName}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          'inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-xs font-medium',
                          c.request_count > 0
                            ? 'bg-primary/10 text-primary'
                            : 'bg-surface text-muted-foreground'
                        )}
                      >
                        {c.request_count}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
