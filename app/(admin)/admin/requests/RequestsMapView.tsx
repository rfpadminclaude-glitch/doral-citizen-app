'use client';

import dynamic from 'next/dynamic';
import { CircleDot, MapPinOff, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Neighborhood } from '@/lib/geo/neighborhoods';
import { useMounted } from '@/lib/hooks/useMounted';
import { ActiveFilterChips } from '@/components/admin/gis/ActiveFilterChips';
import { FilterPanel } from '@/components/admin/gis/FilterPanel';
import { NeighborhoodKpiStrip } from '@/components/admin/gis/NeighborhoodKpiStrip';
import { NeighborhoodBarChart } from '@/components/admin/gis/NeighborhoodBarChart';
import {
  REQUEST_STATUSES,
  REQUEST_TYPES,
  STATUS_COLOR,
  STATUS_LABEL,
  TYPE_LABEL,
  type GisFilters,
  type NeighborhoodStats,
  type RequestFeature,
  type RequestFeatureCollection,
  type RequestStatus,
  type RequestType
} from '@/components/admin/gis/types';
import { cn } from '@/lib/utils';
import type { RequestRow } from './RequestsClient';

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

const POLL_INTERVAL_MS = 30_000;

type Props = {
  rows: RequestRow[];
  neighborhoods: Neighborhood[];
  filters: GisFilters;
  onFiltersChange: (next: GisFilters) => void;
};

function rowsToInitialFeatureCollection(rows: RequestRow[]): RequestFeatureCollection {
  const features: RequestFeature[] = [];
  for (const r of rows) {
    if (r.lat == null || r.lng == null) continue;
    features.push({
      type: 'Feature',
      id: r.id,
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
      properties: {
        id: r.id,
        case_code: `SR-${r.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
        title: r.title,
        request_type: r.request_type as RequestType,
        status: r.status,
        priority: r.priority,
        neighborhood_slug: r.neighborhood_slug,
        address_line: r.address_line,
        created_at: r.created_at,
        resident_name: r.resident_name
      }
    });
  }
  return { type: 'FeatureCollection', features };
}

function formatLastUpdated(ts: number | null, mounted: boolean): string {
  if (!ts || !mounted) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function RequestsMapView({ rows, neighborhoods, filters, onFiltersChange }: Props) {
  const t = useTranslations('admin.requests');
  const tFilters = useTranslations('admin.filters');
  const mounted = useMounted();

  // Seed map state from the server-rendered rows so the first paint is instant.
  const initialFeatures = useMemo(() => rowsToInitialFeatureCollection(rows), [rows]);
  const [requests, setRequests] = useState<RequestFeatureCollection>(initialFeatures);
  const [heatPoints, setHeatPoints] = useState<Array<[number, number, number]>>([]);
  const [stats, setStats] = useState<NeighborhoodStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshError, setRefreshError] = useState(false);
  const [live, setLive] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState<{ kind: 'success' | 'info' | 'error'; text: string } | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.types.length) p.set('type', filters.types.join(','));
    if (filters.statuses.length) p.set('status', filters.statuses.join(','));
    if (filters.neighborhood) p.set('neighborhood', filters.neighborhood);
    if (filters.from) p.set('from', filters.from);
    if (filters.to) p.set('to', filters.to);
    if (filters.source && filters.source !== 'all') p.set('source', filters.source);
    return p.toString();
  }, [filters]);

  const refetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = queryString ? `?${queryString}` : '';
      const [rRes, hRes, sRes] = await Promise.all([
        fetch(`/api/gis/requests${qs}`, { cache: 'no-store' }),
        fetch(`/api/gis/heatmap-points${qs}`, { cache: 'no-store' }),
        fetch(`/api/gis/neighborhood-stats${qs}`, { cache: 'no-store' })
      ]);
      if (!rRes.ok || !hRes.ok || !sRes.ok) {
        setRefreshError(true);
        return;
      }
      const [r, h, s] = await Promise.all([rRes.json(), hRes.json(), sRes.json()]);
      if (r?.features) setRequests(r);
      if (Array.isArray(h?.points)) setHeatPoints(h.points);
      if (s?.neighborhoods) setStats(s);
      setLastUpdated(Date.now());
      setRefreshError(false);
    } catch {
      setRefreshError(true);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  // Always refetch when filters change.
  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  const loadDemoSet = useCallback(async () => {
    setDemoLoading(true);
    setDemoMessage(null);
    try {
      const resp = await fetch('/api/admin/demo/load', { method: 'POST' });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setDemoMessage({ kind: 'error', text: data?.detail || data?.error || t('addDemoError') });
        return;
      }
      if (!data.added || data.added === 0) {
        setDemoMessage({ kind: 'info', text: t('addDemoAlreadyBalanced') });
      } else {
        setDemoMessage({
          kind: 'success',
          text: t('addDemoSuccess', {
            count: data.added,
            pending: data.by_status?.pending ?? 0,
            inProgress: data.by_status?.in_progress ?? 0,
            completed: data.by_status?.completed ?? 0
          })
        });
        await refetchAll();
      }
      window.setTimeout(() => setDemoMessage(null), 3500);
    } catch (e) {
      setDemoMessage({ kind: 'error', text: t('addDemoError') });
    } finally {
      setDemoLoading(false);
    }
  }, [refetchAll, t]);

  // Live polling — pause when document is hidden, resume when visible.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!live) return;

    function start() {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        if (!document.hidden) refetchAll();
      }, POLL_INTERVAL_MS);
    }
    function stop() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    function onVisibility() {
      if (document.hidden) {
        stop();
      } else {
        // Catch up immediately when returning to the tab, then resume polling.
        refetchAll();
        start();
      }
    }

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [live, refetchAll]);

  const statusCounts = useMemo(() => {
    const out: Record<RequestStatus, number> = {
      new: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0
    };
    for (const f of requests.features) out[f.properties.status] += 1;
    return out;
  }, [requests]);

  const categoryCounts = useMemo(() => {
    const out: Partial<Record<RequestType, number>> = {};
    for (const f of requests.features) {
      const k = f.properties.request_type;
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  }, [requests]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <FilterPanel filters={filters} neighborhoods={neighborhoods} onChange={onFiltersChange} />

          <div className="space-y-3 rounded-2xl border border-border bg-surface-2 p-4 shadow-soft">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('dataCardTitle')}
            </p>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CircleDot
                  className={cn(
                    'h-3.5 w-3.5',
                    live ? 'text-success' : 'text-muted-foreground',
                    live && 'animate-pulse'
                  )}
                  aria-hidden
                />
                <h3 className="text-sm font-semibold text-foreground">
                  {live ? t('mapLiveOn') : t('mapLiveOff')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLive((v) => !v)}
                aria-pressed={live}
                title={t('mapLiveTooltip')}
                className={cn(
                  'relative h-5 w-9 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  live ? 'border-success bg-success/30' : 'border-border bg-surface'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-foreground transition-transform',
                    live ? 'translate-x-4 bg-success' : 'translate-x-0.5'
                  )}
                />
                <span className="sr-only">{live ? t('mapLiveOn') : t('mapLiveOff')}</span>
              </button>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tFilters('sourceLabel')}
              </p>
              <div
                role="tablist"
                aria-label={tFilters('sourceLabel')}
                className="inline-flex w-full rounded-full border border-border bg-surface p-0.5"
              >
                {(['all', 'demo', 'real'] as const).map((s) => {
                  const active = (filters.source ?? 'all') === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() =>
                        onFiltersChange({ ...filters, source: s === 'all' ? undefined : s })
                      }
                      className={cn(
                        'flex-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {s === 'all'
                        ? tFilters('sourceAll')
                        : s === 'demo'
                        ? tFilters('sourceDemo')
                        : tFilters('sourceReal')}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{tFilters('sourceHint')}</p>
            </div>

            <div>
              <button
                type="button"
                onClick={loadDemoSet}
                disabled={demoLoading}
                className={cn(
                  'inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-wait'
                )}
              >
                <Plus className={cn('h-3.5 w-3.5', demoLoading && 'animate-spin')} />
                {demoLoading ? t('addDemoLoading') : t('addDemoBtn')}
              </button>
              {demoMessage && (
                <p
                  className={cn(
                    'mt-2 rounded-md px-2 py-1 text-[11px]',
                    demoMessage.kind === 'success' && 'bg-success/10 text-success',
                    demoMessage.kind === 'info' && 'bg-surface text-muted-foreground',
                    demoMessage.kind === 'error' && 'bg-destructive/10 text-destructive'
                  )}
                  role="status"
                >
                  {demoMessage.text}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {t('mapLastUpdated')}: <span suppressHydrationWarning>{formatLastUpdated(lastUpdated, mounted)}</span>
              </span>
              <button
                type="button"
                onClick={refetchAll}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                aria-label={t('mapRefreshing')}
              >
                <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
              </button>
            </div>
            {refreshError && (
              <p className="rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                {t('mapRefreshError')}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface-2 p-4 shadow-soft">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('mapStatusTitle')}
            </h3>
            <dl className="mt-2 space-y-1.5">
              {REQUEST_STATUSES.map((s) => (
                <div key={s} className="flex items-center justify-between gap-2 text-xs">
                  <dt className="flex items-center gap-1.5 text-foreground">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: STATUS_COLOR[s] }}
                    />
                    {STATUS_LABEL[s]}
                  </dt>
                  <dd className="font-mono font-semibold text-foreground">{statusCounts[s]}</dd>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                <dt className="text-muted-foreground">{t('mapShowing')}</dt>
                <dd className="font-mono font-semibold text-foreground">{requests.features.length}</dd>
              </div>
            </dl>
          </div>

          <NeighborhoodKpiStrip stats={stats} filters={filters} neighborhoods={neighborhoods} />

          <div className="rounded-2xl border border-border bg-surface-2 p-4 shadow-soft">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('mapCategoryTitle')}
            </h3>
            <dl className="mt-2 space-y-1">
              {REQUEST_TYPES.map((type) => {
                const n = categoryCounts[type] ?? 0;
                if (n === 0) return null;
                return (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <dt className="text-foreground">{TYPE_LABEL[type]}</dt>
                    <dd className="font-mono font-semibold text-foreground">{n}</dd>
                  </div>
                );
              })}
              {Object.values(categoryCounts).every((n) => !n) && (
                <p className="text-xs text-muted-foreground">{t('mapCategoryEmpty')}</p>
              )}
            </dl>
          </div>
        </aside>

        <div className="space-y-3">
          <ActiveFilterChips
            filters={filters}
            neighborhoods={neighborhoods}
            onRemove={(target) => {
              if (target.kind === 'status') {
                onFiltersChange({
                  ...filters,
                  statuses: filters.statuses.filter((x) => x !== target.value)
                });
              } else if (target.kind === 'type') {
                onFiltersChange({
                  ...filters,
                  types: filters.types.filter((x) => x !== target.value)
                });
              } else if (target.kind === 'neighborhood') {
                onFiltersChange({ ...filters, neighborhood: null });
              } else if (target.kind === 'from') {
                onFiltersChange({ ...filters, from: undefined });
              } else if (target.kind === 'to') {
                onFiltersChange({ ...filters, to: undefined });
              } else if (target.kind === 'source') {
                onFiltersChange({ ...filters, source: undefined });
              }
            }}
            onClearAll={() =>
              onFiltersChange({
                types: [],
                statuses: [],
                neighborhood: null,
                from: undefined,
                to: undefined,
                source: undefined
              })
            }
          />

          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-soft">
            {loading && lastUpdated !== null && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-[400] h-1 motion-safe:animate-pulse bg-primary/70"
              />
            )}
            <MapCanvas
              neighborhoods={neighborhoods}
              requests={requests}
              citizens={[]}
              heatPoints={heatPoints}
              activeNeighborhood={filters.neighborhood}
              popupActionLabel={t('viewDetails')}
              popupActionHref={(id) => `/admin/requests/${id}`}
            />
            {requests.features.length === 0 && !loading && (
              <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
                <div className="pointer-events-auto max-w-sm rounded-2xl border border-border bg-surface/95 p-5 text-center shadow-glass backdrop-blur">
                  <MapPinOff className="mx-auto h-8 w-8 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold text-foreground">
                    {tFilters('mapEmptyTitle')}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">{tFilters('mapEmptyHint')}</p>
                  <button
                    type="button"
                    onClick={() =>
                      onFiltersChange({
                        types: [],
                        statuses: [],
                        neighborhood: null,
                        from: undefined,
                        to: undefined,
                        source: undefined
                      })
                    }
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {tFilters('reset')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <NeighborhoodBarChart stats={stats} loading={loading} />
    </div>
  );
}
