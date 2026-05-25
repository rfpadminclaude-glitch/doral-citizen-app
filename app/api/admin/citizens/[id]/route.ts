import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guards';
import { deleteCitizen, updateCitizen } from '@/lib/geo/citizens';
import { tagNeighborhood } from '@/lib/geo/neighborhoods';
import { geocode } from '@/lib/geo/nominatim';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin({ allowViewer: true });
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sb = createAdminClient();
  const { data, error } = await sb
    .from('citizens')
    .select('id, name, phone, email, address_line, lat, lng, neighborhood_slug, source, notes, created_at, updated_at')
    .eq('id', params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: requests } = await sb
    .from('service_requests')
    .select('id, title, request_type, status, priority, lat, lng, created_at')
    .eq('citizen_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ citizen: data, requests: requests ?? [] });
}

const PatchBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  address_line: z.string().trim().nullable().optional(),
  lat: z.number().finite().nullable().optional(),
  lng: z.number().finite().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  regeocode: z.boolean().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin({ allowViewer: false });
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let parsed;
  try {
    parsed = PatchBody.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid payload', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patch = { ...parsed.data };
  delete (patch as any).regeocode;

  // If the caller asked us to regeocode and provided an address but no coords,
  // resolve them server-side.
  if (parsed.data.regeocode && parsed.data.address_line && (parsed.data.lat == null || parsed.data.lng == null)) {
    const hit = await geocode(parsed.data.address_line);
    if (hit) {
      patch.lat = hit.lat;
      patch.lng = hit.lng;
    }
  }

  // Whenever lat/lng change, retag neighborhood.
  if (patch.lat != null && patch.lng != null) {
    (patch as any).neighborhood_slug = tagNeighborhood(patch.lat, patch.lng);
  } else if (patch.lat === null || patch.lng === null) {
    (patch as any).neighborhood_slug = null;
  }

  const result = await updateCitizen(params.id, patch);
  if (!result.ok) {
    const status = result.code === 'conflict' ? 409 : 500;
    return NextResponse.json({ error: result.code, detail: result.message }, { status });
  }

  const admin = createAdminClient();
  await admin.from('audit_log').insert({
    actor_type: 'admin',
    actor_id: auth.adminId,
    action: 'citizen.updated',
    entity_type: 'citizen',
    entity_id: params.id,
    metadata: { fields: Object.keys(patch) }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin({ allowViewer: false });
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const result = await deleteCitizen(params.id);
  if (!result.ok) {
    return NextResponse.json({ error: 'delete failed', detail: result.message }, { status: 500 });
  }

  const admin = createAdminClient();
  await admin.from('audit_log').insert({
    actor_type: 'admin',
    actor_id: auth.adminId,
    action: 'citizen.deleted',
    entity_type: 'citizen',
    entity_id: params.id,
    metadata: { unlinked_requests: result.unlinkedRequests }
  });

  return NextResponse.json({ ok: true, unlinkedRequests: result.unlinkedRequests });
}
