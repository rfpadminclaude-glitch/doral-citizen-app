/**
 * Server-only Nominatim (OpenStreetMap) geocoder.
 *
 * Results are cached in public.geocode_cache so repeat addresses don't
 * hit the upstream API. All calls are clamped to the Doral viewbox so
 * a typo like "10001 NW 50th" can't accidentally land in Texas.
 *
 * Attribution required by OSM:
 *   © OpenStreetMap contributors — https://openstreetmap.org/copyright
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { nominatimGate } from './rate-limit';

export type GeocodeResult = {
  lat: number;
  lng: number;
  display_name: string;
  normalized_address: string;
  cached: boolean;
};

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
// Doral bounding box: min_lng, min_lat, max_lng, max_lat
// (Nominatim viewbox order: left, top, right, bottom = west, north, east, south)
const DORAL_VIEWBOX = '-80.40,25.86,-80.30,25.78';
const USER_AGENT = 'Doral-Citizen-App/0.1 (admin@cityofdoral.demo)';

function normalize(address: string): string {
  return address.trim().replace(/\s+/g, ' ');
}

export async function geocode(address: string): Promise<GeocodeResult | null> {
  const normalized = normalize(address);
  if (!normalized) return null;

  const sb = createAdminClient();

  // 1) Cache lookup
  const { data: cached } = await sb
    .from('geocode_cache')
    .select('id, lat, lng, display_name, normalized_address, hit_count')
    .ilike('input_address', normalized)
    .maybeSingle();

  if (cached && cached.lat != null && cached.lng != null) {
    await sb
      .from('geocode_cache')
      .update({
        hit_count: (cached.hit_count ?? 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', cached.id);

    return {
      lat: cached.lat,
      lng: cached.lng,
      display_name: cached.display_name ?? normalized,
      normalized_address: cached.normalized_address ?? normalized,
      cached: true
    };
  }

  // 2) Upstream call (rate-limited)
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'us');
  url.searchParams.set('viewbox', DORAL_VIEWBOX);
  url.searchParams.set('bounded', '1');
  url.searchParams.set('q', normalized);

  const raw = await nominatimGate(async () => {
    const resp = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    });
    if (!resp.ok) {
      throw new Error(`nominatim ${resp.status}`);
    }
    return (await resp.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      [k: string]: unknown;
    }>;
  }).catch((e) => {
    console.error('[nominatim] request failed', e);
    return null;
  });

  if (!raw || raw.length === 0) {
    return null;
  }

  const hit = raw[0];
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  await sb.from('geocode_cache').insert({
    input_address: normalized,
    normalized_address: hit.display_name,
    lat,
    lng,
    display_name: hit.display_name,
    raw: hit as any,
    provider: 'nominatim',
    hit_count: 1
  });

  return {
    lat,
    lng,
    display_name: hit.display_name,
    normalized_address: hit.display_name,
    cached: false
  };
}

export type ReverseGeocodeResult = {
  display_name: string;
  cached: boolean;
};

function reverseCacheKey(lat: number, lng: number): string {
  return `reverse:${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const sb = createAdminClient();
  const key = reverseCacheKey(lat, lng);

  const { data: cached } = await sb
    .from('geocode_cache')
    .select('id, display_name, hit_count')
    .ilike('input_address', key)
    .maybeSingle();

  if (cached?.display_name) {
    await sb
      .from('geocode_cache')
      .update({
        hit_count: (cached.hit_count ?? 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', cached.id);
    return { display_name: cached.display_name, cached: true };
  }

  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('zoom', '18');

  const raw = await nominatimGate(async () => {
    const resp = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
    });
    if (!resp.ok) throw new Error(`nominatim ${resp.status}`);
    return (await resp.json()) as { display_name?: string; [k: string]: unknown };
  }).catch((e) => {
    console.error('[nominatim] reverse failed', e);
    return null;
  });

  const display_name = raw?.display_name;
  if (!display_name) return null;

  await sb.from('geocode_cache').insert({
    input_address: key,
    normalized_address: display_name,
    lat,
    lng,
    display_name,
    raw: raw as any,
    provider: 'nominatim-reverse',
    hit_count: 1
  });

  return { display_name, cached: false };
}
