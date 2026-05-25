'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  GeoJSON,
  LayerGroup,
  LayersControl,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap
} from 'react-leaflet';
import doralGeo from '@/public/geo/doral-neighborhoods.json';
import type { Neighborhood } from '@/lib/geo/neighborhoods';
import {
  STATUS_COLOR,
  STATUS_LABEL,
  TYPE_LABEL,
  type CitizenPoint,
  type RequestFeature,
  type RequestFeatureCollection,
  type RequestStatus
} from './types';

const CENTER: [number, number] = [25.819, -80.353];
const DEFAULT_ZOOM = 13;

type Props = {
  neighborhoods: Neighborhood[];
  requests: RequestFeatureCollection;
  citizens: CitizenPoint[];
  heatPoints: Array<[number, number, number]>;
  activeNeighborhood: string | null;
  popupActionLabel?: string;
  popupActionHref?: (id: string) => string;
};

export function MapCanvas({
  neighborhoods,
  requests,
  citizens,
  heatPoints,
  activeNeighborhood,
  popupActionLabel,
  popupActionHref
}: Props) {
  // Neighborhood polygon style — highlight the active one.
  const polygonStyle = useMemo(
    () => (feature: any) => {
      const isActive = activeNeighborhood && feature?.properties?.slug === activeNeighborhood;
      return {
        color: isActive ? '#0ea5e9' : '#64748b',
        weight: isActive ? 2.5 : 1.25,
        fillColor: isActive ? '#0ea5e9' : '#94a3b8',
        fillOpacity: isActive ? 0.18 : 0.06,
        dashArray: isActive ? undefined : '4 4'
      };
    },
    [activeNeighborhood]
  );

  // Force GeoJSON to re-style when activeNeighborhood changes — react-leaflet
  // memoizes the layer otherwise.
  const geoKey = `geo-${activeNeighborhood ?? 'all'}`;

  return (
    <div className="relative">
      <MapContainer
        center={CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        style={{ height: 600, width: '100%' }}
        attributionControl
      >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      <LayersControl position="topright">
        <LayersControl.Overlay name="Neighborhoods" checked>
          <GeoJSON
            key={geoKey}
            data={doralGeo as any}
            style={polygonStyle as any}
            onEachFeature={(feature: any, layer) => {
              const name = feature?.properties?.name ?? 'Unnamed';
              layer.bindTooltip(name, { sticky: true });
            }}
          />
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Service requests" checked>
          <LayerGroup>
            {requests.features.map((f) => (
              <RequestMarker
                key={f.id}
                feature={f}
                popupActionLabel={popupActionLabel}
                popupActionHref={popupActionHref}
              />
            ))}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Citizen pins">
          <LayerGroup>
            {citizens.map((c) => (
              <CitizenMarker key={c.id} citizen={c} />
            ))}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Heatmap">
          <HeatLayer points={heatPoints} />
        </LayersControl.Overlay>
      </LayersControl>

      <PanToNeighborhood neighborhoods={neighborhoods} activeSlug={activeNeighborhood} />
    </MapContainer>
    <StatusLegend />
    </div>
  );
}

function StatusLegend() {
  const t = useTranslations('admin.filters');
  const items: Array<{ status: RequestStatus; key: 'statusNew' | 'statusInProgress' | 'statusResolved' }> = [
    { status: 'new', key: 'statusNew' },
    { status: 'in_progress', key: 'statusInProgress' },
    { status: 'resolved', key: 'statusResolved' }
  ];
  return (
    <div
      className="pointer-events-none absolute bottom-3 right-3 z-[400] rounded-xl border border-border bg-surface/95 px-3 py-2 text-[11px] shadow-soft backdrop-blur"
      aria-hidden="true"
    >
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('mapLegendStatus')}
      </p>
      <ul className="space-y-0.5">
        {items.map(({ status, key }) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: STATUS_COLOR[status] }}
            />
            <span className="text-foreground">{t(key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------

function statusIcon(status: RequestStatus) {
  const color = STATUS_COLOR[status];
  const html = `
    <span style="
      position:relative;
      display:inline-block;
      width:22px;height:22px;border-radius:50%;
      background:${color};
      border:3px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.4), 0 0 0 1px ${color}40;
    "></span>`;
  return L.divIcon({
    html,
    className: 'gis-status-marker',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10]
  });
}

const HOUSE_ICON = L.divIcon({
  html: `
    <span style="
      display:inline-block;
      width:10px;height:10px;border-radius:2px;
      background:#94a3b8;
      border:1.5px solid #fff;
      box-shadow:0 1px 1px rgba(0,0,0,0.25);
    "></span>`,
  className: 'gis-citizen-marker',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

function RequestMarker({
  feature,
  popupActionLabel,
  popupActionHref
}: {
  feature: RequestFeature;
  popupActionLabel?: string;
  popupActionHref?: (id: string) => string;
}) {
  const [lng, lat] = feature.geometry.coordinates;
  const p = feature.properties;
  const icon = useMemo(() => statusIcon(p.status), [p.status]);
  const actionHref = popupActionHref && popupActionLabel ? popupActionHref(p.id) : null;
  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup>
        <div style={{ minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#0ea5e9', letterSpacing: 0.4 }}>
            {p.case_code}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{p.title}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {TYPE_LABEL[p.request_type] ?? p.request_type} · {STATUS_LABEL[p.status]}
          </div>
          {p.address_line && (
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{p.address_line}</div>
          )}
          {p.resident_name && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
              Reported by {p.resident_name}
            </div>
          )}
          {actionHref && (
            <a
              href={actionHref}
              style={{
                display: 'inline-block',
                marginTop: 8,
                fontSize: 11,
                fontWeight: 600,
                color: '#0ea5e9',
                textDecoration: 'underline'
              }}
            >
              {popupActionLabel} →
            </a>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

function CitizenMarker({ citizen }: { citizen: CitizenPoint }) {
  return (
    <Marker position={[citizen.lat, citizen.lng]} icon={HOUSE_ICON}>
      <Popup>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{citizen.name}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          {citizen.neighborhood_slug ?? 'Doral'}
        </div>
      </Popup>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// Heat layer — leaflet.heat plugin, attached imperatively.
// ---------------------------------------------------------------------------

function HeatLayer({ points }: { points: Array<[number, number, number]> }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    let cancelled = false;
    let layer: L.Layer | null = null;

    (async () => {
      // Dynamic import: leaflet.heat attaches to the global L when imported.
      // Importing it inside useEffect keeps it off the SSR path.
      await import('leaflet.heat');
      if (cancelled) return;

      // @ts-expect-error — leaflet.heat extends L at runtime
      layer = L.heatLayer(points, {
        radius: 25,
        blur: 18,
        maxZoom: 17
      });
      layer.addTo(map);
      layerRef.current = layer;
    })();

    return () => {
      cancelled = true;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}

// ---------------------------------------------------------------------------
// Pan-to-neighborhood when the active filter changes.
// ---------------------------------------------------------------------------

function PanToNeighborhood({
  neighborhoods,
  activeSlug
}: {
  neighborhoods: Neighborhood[];
  activeSlug: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!activeSlug) {
      map.flyTo(CENTER, DEFAULT_ZOOM, { duration: 0.6 });
      return;
    }
    const target = neighborhoods.find((n) => n.slug === activeSlug);
    if (target) {
      map.flyTo([target.centroid.lat, target.centroid.lng], 15, { duration: 0.6 });
    }
  }, [activeSlug, map, neighborhoods]);
  return null;
}
