import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin/guards';
import { reverseGeocode } from '@/lib/geo/nominatim';
import { tagNeighborhood } from '@/lib/geo/neighborhoods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  lat: z.number().finite(),
  lng: z.number().finite()
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin({ allowViewer: true });
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const { lat, lng } = parsed.data;
  const hit = await reverseGeocode(lat, lng);
  const neighborhood_slug = tagNeighborhood(lat, lng);

  return NextResponse.json({
    ok: true,
    lat,
    lng,
    display_name: hit?.display_name ?? null,
    neighborhood_slug
  });
}
