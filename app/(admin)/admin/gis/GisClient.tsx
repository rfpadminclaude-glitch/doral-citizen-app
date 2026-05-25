'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Neighborhood } from '@/lib/geo/neighborhoods';
import type { GisFilters, RequestFeatureCollection, CitizenPoint, NeighborhoodStats } from '@/components/admin/gis/types';
import { FilterPanel } from '@/components/admin/gis/FilterPanel';
import { NeighborhoodKpiStrip } from '@/components/admin/gis/NeighborhoodKpiStrip';
import { NeighborhoodBarChart } from '@/components/admin/gis/NeighborhoodBarChart';

const MapCanvas = dynamic(
  () => import('@/components/admin/gis/MapCanvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] w-full items-center justify-center rounded-2xl border border-border bg-surface-2 text-sm text-muted-foreground">
        Loading map…
      </div>
    )
  }
);

const DEFAULT_FILTERS: GisFilters = {
  types: [],
  statuses: [],
  neighborhood: null,
  from: undefined,
  to: undefined
};

export function GisClient({ neighborhoods }: { neighborhoods: Neighborhood[] }) {
  const [filters, setFilters] = useState<GisFilters>(DEFAULT_FILTERS);

  const [requests, setRequests] = useState<RequestFeatureCollection>({
    type: 'FeatureCollection',
    features: []
  });
  const [heatPoints, setHeatPoints] = useState<Array<[number, number, number]>>([]);
  const [stats, setStats] = useState<NeighborhoodStats | null>(null);
  const [citizens, setCitizens] = useState<CitizenPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.types.length) p.set('type', filters.types.join(','));
    if (filters.statuses.length) p.set('status', filters.statuses.join(','));
    if (filters.neighborhood) p.set('neighborhood', filters.neighborhood);
    if (filters.from) p.set('from', filters.from);
    if (filters.to) p.set('to', filters.to);
    return p.toString();
  }, [filters]);

  const refetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = queryString ? `?${queryString}` : '';
      const [rRes, hRes, sRes, cRes] = await Promise.all([
        fetch(`/api/gis/requests${qs}`, { cache: 'no-store' }),
        fetch(`/api/gis/heatmap-points${qs}`, { cache: 'no-store' }),
        fetch(`/api/gis/neighborhood-stats${qs}`, { cache: 'no-store' }),
        fetch(
          `/api/gis/citizens${
            filters.neighborhood ? `?neighborhood=${filters.neighborhood}` : ''
          }`,
          { cache: 'no-store' }
        )
      ]);
      const [r, h, s, c] = await Promise.all([
        rRes.json(),
        hRes.json(),
        sRes.json(),
        cRes.json()
      ]);
      if (r?.features) setRequests(r);
      if (Array.isArray(h?.points)) setHeatPoints(h.points);
      if (s?.neighborhoods) setStats(s);
      if (Array.isArray(c?.citizens)) setCitizens(c.citizens);
    } finally {
      setLoading(false);
    }
  }, [queryString, filters.neighborhood]);

  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <FilterPanel
          filters={filters}
          neighborhoods={neighborhoods}
          onChange={setFilters}
        />
        <NeighborhoodKpiStrip stats={stats} filters={filters} neighborhoods={neighborhoods} />
      </aside>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-soft">
          <MapCanvas
            neighborhoods={neighborhoods}
            requests={requests}
            citizens={citizens}
            heatPoints={heatPoints}
            activeNeighborhood={filters.neighborhood}
          />
        </div>
        <NeighborhoodBarChart stats={stats} loading={loading} />
      </div>
    </div>
  );
}
