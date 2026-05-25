import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guards';
import { listNeighborhoods, tagNeighborhood } from '@/lib/geo/neighborhoods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_PER_STATUS = 10;

const TITLES: Record<string, string[]> = {
  pothole: [
    'Pothole near intersection',
    'Big pothole on the street',
    'Pavement damage',
    'Sinkhole forming'
  ],
  code_violation: [
    'Tall grass on vacant lot',
    'Illegal dumping',
    'Sign in right-of-way',
    'Blocked sidewalk'
  ],
  park_issue: [
    'Broken park bench',
    'Vandalism at playground',
    'Missing equipment',
    'Lights out at park'
  ],
  permit: ['Permit renewal question', 'Permit status check', 'BTR issue'],
  inspection: ['Schedule inspection', 'Roofing inspection request', 'Final inspection'],
  complaint: ['Noise complaint', 'Concern about traffic', 'Streetlight out'],
  general: ['General question', 'Other concern', 'Service follow-up']
};

const TYPES = Object.keys(TITLES);
const PRIORITY_POOL = ['low', 'normal', 'normal', 'normal', 'high', 'urgent'];

type Bucket = 'pending' | 'in_progress' | 'completed';

const BUCKET_STATUS: Record<Bucket, 'new' | 'in_progress' | 'resolved'> = {
  pending: 'new',
  in_progress: 'in_progress',
  completed: 'resolved'
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateLastNDays(n: number): string {
  const now = Date.now();
  const offset = Math.floor(Math.random() * n * 24 * 60 * 60 * 1000);
  return new Date(now - offset).toISOString();
}

type CitizenSeed = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address_line: string | null;
  lat: number;
  lng: number;
  neighborhood_slug: string | null;
};

function fallbackPoint(): { lat: number; lng: number; neighborhood_slug: string | null } {
  const neighborhoods = listNeighborhoods();
  const target = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
  if (!target) return { lat: 25.819, lng: -80.353, neighborhood_slug: null };
  const jitter = () => (Math.random() - 0.5) * 0.005;
  const lat = target.centroid.lat + jitter();
  const lng = target.centroid.lng + jitter();
  return { lat, lng, neighborhood_slug: tagNeighborhood(lat, lng) ?? target.slug };
}

export async function POST() {
  const auth = await requireAdmin({ allowViewer: false });
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const sb = createAdminClient();

  // 1. Count existing demo rows by bucket.
  const { data: demoRows, error: countErr } = await sb
    .from('service_requests')
    .select('status')
    .eq('mock_crm_payload->>demo', 'true')
    .limit(10000);
  if (countErr) {
    return NextResponse.json({ error: 'count failed', detail: countErr.message }, { status: 500 });
  }

  const before: Record<Bucket, number> = { pending: 0, in_progress: 0, completed: 0 };
  for (const r of demoRows ?? []) {
    if (r.status === 'new') before.pending += 1;
    else if (r.status === 'in_progress') before.in_progress += 1;
    else if (r.status === 'resolved' || r.status === 'closed') before.completed += 1;
  }

  // 2. Compute deficit per bucket.
  const deficit: Record<Bucket, number> = {
    pending: Math.max(0, MIN_PER_STATUS - before.pending),
    in_progress: Math.max(0, MIN_PER_STATUS - before.in_progress),
    completed: Math.max(0, MIN_PER_STATUS - before.completed)
  };
  const totalToAdd = deficit.pending + deficit.in_progress + deficit.completed;

  if (totalToAdd === 0) {
    return NextResponse.json({
      ok: true,
      added: 0,
      by_status: deficit,
      before,
      after: before,
      message: 'already-balanced'
    });
  }

  // 3. Pull a sample of seeded citizens to provide locations + contact info.
  const { data: citizens } = await sb
    .from('citizens')
    .select('id, name, phone, email, address_line, lat, lng, neighborhood_slug')
    .eq('source', 'seed')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(200);

  const pool: CitizenSeed[] = (citizens ?? [])
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address_line: c.address_line,
      lat: c.lat as number,
      lng: c.lng as number,
      neighborhood_slug: c.neighborhood_slug
    }));

  // 4. Build rows.
  const loadedAt = new Date().toISOString();
  const rows: Array<Record<string, unknown>> = [];

  for (const bucket of ['pending', 'in_progress', 'completed'] as Bucket[]) {
    for (let i = 0; i < deficit[bucket]; i += 1) {
      const requestType = pick(TYPES);
      const title = pick(TITLES[requestType]);
      const status = BUCKET_STATUS[bucket];
      const priority = pick(PRIORITY_POOL);
      const createdAt = randomDateLastNDays(30);

      let lat: number;
      let lng: number;
      let neighborhood_slug: string | null;
      let citizen_id: string | null = null;
      let resident_name: string | null = null;
      let resident_contact: string | null = null;
      let address_line: string | null = null;

      if (pool.length > 0) {
        const c = pick(pool);
        lat = c.lat;
        lng = c.lng;
        neighborhood_slug = c.neighborhood_slug;
        citizen_id = c.id;
        resident_name = c.name;
        resident_contact = c.email ?? c.phone;
        address_line = c.address_line;
      } else {
        const p = fallbackPoint();
        lat = p.lat;
        lng = p.lng;
        neighborhood_slug = p.neighborhood_slug;
      }

      rows.push({
        conversation_id: null,
        request_type: requestType,
        title,
        description: `${title} — demo entry`,
        status,
        priority,
        resident_name,
        resident_contact,
        citizen_id,
        address_line,
        lat,
        lng,
        neighborhood_slug,
        mock_crm_payload: { demo: true, batch: 'in-ui-load', loaded_at: loadedAt },
        created_at: createdAt,
        updated_at: createdAt
      });
    }
  }

  // 5. Bulk insert.
  const { data: inserted, error: insertErr } = await sb
    .from('service_requests')
    .insert(rows)
    .select('id');

  if (insertErr) {
    return NextResponse.json(
      { error: 'insert failed', detail: insertErr.message },
      { status: 500 }
    );
  }

  const added = inserted?.length ?? 0;
  const after: Record<Bucket, number> = {
    pending: before.pending + deficit.pending,
    in_progress: before.in_progress + deficit.in_progress,
    completed: before.completed + deficit.completed
  };

  // 6. Audit-log entry.
  await sb.from('audit_log').insert({
    actor_type: 'admin',
    actor_id: auth.adminId,
    action: 'service_request.demo.bulk_loaded',
    entity_type: 'service_request',
    entity_id: inserted?.[0]?.id ?? null,
    metadata: { added, by_status: deficit, before, after, loaded_at: loadedAt }
  });

  return NextResponse.json({
    ok: true,
    added,
    by_status: deficit,
    before,
    after
  });
}
