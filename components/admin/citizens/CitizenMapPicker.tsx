'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents
} from 'react-leaflet';
import doralGeo from '@/public/geo/doral-neighborhoods.json';
import type { Neighborhood } from '@/lib/geo/neighborhoods';

const CENTER: [number, number] = [25.819, -80.353];
const DEFAULT_ZOOM = 13;

const PIN_ICON = L.divIcon({
  html: `
    <span style="
      display:inline-block;
      width:18px;height:18px;border-radius:50%;
      background:#0ea5e9;
      border:3px solid #fff;
      box-shadow:0 1px 3px rgba(0,0,0,0.4);
    "></span>`,
  className: 'citizen-picker-pin',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

type LatLng = { lat: number; lng: number };

type Props = {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  neighborhoods: Neighborhood[];
  height?: number;
};

export function CitizenMapPicker({ value, onChange, height = 360 }: Props) {
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : CENTER}
      zoom={value ? 15 : DEFAULT_ZOOM}
      scrollWheelZoom
      style={{ height, width: '100%' }}
      attributionControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      <GeoJSON
        data={doralGeo as any}
        style={() => ({
          color: '#94a3b8',
          weight: 1,
          fillColor: '#94a3b8',
          fillOpacity: 0.05,
          dashArray: '4 4'
        })}
        interactive={false}
      />

      <ClickHandler onClick={onChange} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={PIN_ICON}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              onChange({ lat, lng });
            }
          }}
        />
      )}
      <FlyTo value={value} />
    </MapContainer>
  );
}

function ClickHandler({ onClick }: { onClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

function FlyTo({ value }: { value: LatLng | null }) {
  const map = useMap();
  const target = useMemo(() => value, [value?.lat, value?.lng]);
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { duration: 0.4 });
  }, [target, map]);
  return null;
}
