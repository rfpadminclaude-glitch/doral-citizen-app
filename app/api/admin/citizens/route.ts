import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guards';
import { createCitizen } from '@/lib/geo/citizens';
import { tagNeighborhood } from '@/lib/geo/neighborhoods';
import { geocode } from '@/lib/geo/nominatim';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ListQuery = z.object({
  q: z.string().optional(),
  neighborhood: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
  offset: z.coerce.number().min(0).optional()
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin({ allowViewer: true });
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = ListQuery.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const limit = params.limit ?? 200;
  const offset = params.offset ?? 0;

  const sb = createAdminClient();
  let q = sb
    .from('citizens')
    .select('id, name, phone, email, address_line, lat, lng, neighborhood_slug, source, created_at, updated_at', {
      count: 'exact'
    })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (params.neighborhood) q = q.eq('neighborhood_slug', params.neighborhood);
  if (params.q) {
    const needle = `%${params.q}%`;
    q = q.or(`name.ilike.${needle},email.ilike.${needle},phone.ilike.${needle},address_line.ilike.${needle}`);
  }

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ citizens: data ?? [], total: count ?? 0 });
}

const CreateBody = z
  .object({
    name: z.string().trim().min(1).max(200),
    phone: z.string().trim().optional().nullable(),
    email: z.string().trim().email().optional().nullable(),
    address_line: z.string().trim().optional().nullable(),
    lat: z.number().finite().optional().nullable(),
    lng: z.number().finite().optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable()
  })
  .refine((b) => (b.phone && b.phone.length > 0) || (b.email && b.email.length > 0), {
    message: 'phone or email is required'
  });

export async function POST(req: NextRequest) {
  const auth = await requireAdmin({ allowViewer: false });
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body;
  try {
    body = CreateBody.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.success) {
    return NextResponse.json(
      { error: 'invalid payload', issues: body.error.flatten() },
      { status: 400 }
    );
  }

  let { lat, lng } = body.data;
  let address_line = body.data.address_line ?? null;

  // If no coords were supplied but we have an address, geocode it server-side.
  if ((lat == null || lng == null) && address_line) {
    const hit = await geocode(address_line);
    if (hit) {
      lat = hit.lat;
      lng = hit.lng;
      if (!address_line || address_line.length < hit.display_name.length / 2) {
        address_line = hit.display_name;
      }
    }
  }

  const neighborhood_slug =
    lat != null && lng != null ? tagNeighborhood(lat, lng) : null;

  const result = await createCitizen({
    name: body.data.name,
    phone: body.data.phone ?? null,
    email: body.data.email ?? null,
    address_line,
    lat: lat ?? null,
    lng: lng ?? null,
    neighborhood_slug
  });

  if (!result.ok) {
    const status = result.code === 'conflict' ? 409 : result.code === 'invalid' ? 400 : 500;
    return NextResponse.json({ error: result.code, detail: result.message }, { status });
  }

  const admin = createAdminClient();
  await admin.from('audit_log').insert({
    actor_type: 'admin',
    actor_id: auth.adminId,
    action: 'citizen.created',
    entity_type: 'citizen',
    entity_id: result.id,
    metadata: { name: body.data.name, neighborhood_slug }
  });

  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
