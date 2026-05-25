/**
 * Server-side neighborhood tagging via point-in-polygon over the static
 * GeoJSON in public/geo/doral-neighborhoods.json.
 *
 * tagNeighborhood() walks features in file order and returns the FIRST
 * match, so feature order in the JSON acts as a priority tiebreaker for
 * overlapping polygons.
 */
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import doralGeoRaw from '@/public/geo/doral-neighborhoods.json';

type NeighborhoodFeature = {
  type: 'Feature';
  properties: { slug: string; name: string; centroid: [number, number] };
  geometry: { type: 'Polygon'; coordinates: number[][][] };
};

const FEATURES = (doralGeoRaw as unknown as { features: NeighborhoodFeature[] }).features;

export type Neighborhood = {
  slug: string;
  name: string;
  centroid: { lat: number; lng: number };
};

export function tagNeighborhood(lat: number, lng: number): string | null {
  const p = point([lng, lat]);
  for (const f of FEATURES) {
    if (booleanPointInPolygon(p, f as any)) {
      return f.properties.slug;
    }
  }
  return null;
}

export function listNeighborhoods(): Neighborhood[] {
  return FEATURES.map((f) => ({
    slug: f.properties.slug,
    name: f.properties.name,
    centroid: { lat: f.properties.centroid[1], lng: f.properties.centroid[0] }
  }));
}

export function neighborhoodBySlug(slug: string): Neighborhood | null {
  const f = FEATURES.find((x) => x.properties.slug === slug);
  if (!f) return null;
  return {
    slug: f.properties.slug,
    name: f.properties.name,
    centroid: { lat: f.properties.centroid[1], lng: f.properties.centroid[0] }
  };
}
