import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin/guards';
import { geocode } from '@/lib/geo/nominatim';
import { tagNeighborhood } from '@/lib/geo/neighborhoods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ address: z.string().trim().min(3).max(500) });

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

  const hit = await geocode(parsed.data.address);
  if (!hit) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    lat: hit.lat,
    lng: hit.lng,
    display_name: hit.display_name,
    neighborhood_slug: tagNeighborhood(hit.lat, hit.lng)
  });
}
