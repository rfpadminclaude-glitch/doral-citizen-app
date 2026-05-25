import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guards';
import { listNeighborhoods } from '@/lib/geo/neighborhoods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Query = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  source: z.enum(['all', 'demo', 'real']).optional()
});

function splitCsv(s: string | undefined): string[] | undefined {
  if (!s) return undefined;
  const out = s.split(',').map((x) => x.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

type Row = {
  neighborhood_slug: string | null;
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
};

type ZeroBucket = { total: number; pending: number; in_progress: number; completed: number };

function emptyBucket(): ZeroBucket {
  return { total: 0, pending: 0, in_progress: 0, completed: 0 };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin({ allowViewer: true });
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = Query.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const sb = createAdminClient();

  let rows: Row[] = [];

  if (params.source === 'demo' || params.source === 'real') {
    // JS aggregate fallback — the RPC doesn't know about mock_crm_payload.
    let q = sb
      .from('service_requests')
      .select('neighborhood_slug, status')
      .limit(5000);

    const statuses = splitCsv(params.status);
    const types = splitCsv(params.type);
    if (statuses) q = q.in('status', statuses);
    if (types) q = q.in('request_type', types);
    if (params.from) q = q.gte('created_at', params.from);
    if (params.to) q = q.lte('created_at', params.to);
    if (params.source === 'demo') {
      q = q.eq('mock_crm_payload->>demo', 'true');
    } else {
      q = q.or('mock_crm_payload.is.null,mock_crm_payload->>demo.neq.true');
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const buckets = new Map<string | null, ZeroBucket>();
    for (const r of data ?? []) {
      const slug = (r.neighborhood_slug as string | null) ?? null;
      const bucket = buckets.get(slug) ?? emptyBucket();
      bucket.total += 1;
      if (r.status === 'new') bucket.pending += 1;
      else if (r.status === 'in_progress') bucket.in_progress += 1;
      else if (r.status === 'resolved' || r.status === 'closed') bucket.completed += 1;
      buckets.set(slug, bucket);
    }
    rows = Array.from(buckets.entries()).map(([slug, b]) => ({
      neighborhood_slug: slug,
      total: b.total,
      pending: b.pending,
      in_progress: b.in_progress,
      completed: b.completed
    }));
  } else {
    // Fast path: RPC.
    const { data, error } = await sb.rpc('gis_neighborhood_stats', {
      p_from: params.from ?? null,
      p_to: params.to ?? null,
      p_types: splitCsv(params.type) ?? null,
      p_statuses: splitCsv(params.status) ?? null
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows = (data ?? []) as Row[];
  }

  const bySlug = new Map<string | null, Row>();
  for (const r of rows) bySlug.set(r.neighborhood_slug, r);

  const neighborhoods = listNeighborhoods().map((n) => {
    const r = bySlug.get(n.slug);
    return {
      slug: n.slug,
      name: n.name,
      total: Number(r?.total ?? 0),
      pending: Number(r?.pending ?? 0),
      in_progress: Number(r?.in_progress ?? 0),
      completed: Number(r?.completed ?? 0)
    };
  });

  const overall = rows.reduce(
    (acc, r) => ({
      total: acc.total + Number(r.total),
      pending: acc.pending + Number(r.pending),
      in_progress: acc.in_progress + Number(r.in_progress),
      completed: acc.completed + Number(r.completed)
    }),
    { total: 0, pending: 0, in_progress: 0, completed: 0 }
  );

  const otherRow = bySlug.get(null);
  const other = otherRow
    ? {
        total: Number(otherRow.total),
        pending: Number(otherRow.pending),
        in_progress: Number(otherRow.in_progress),
        completed: Number(otherRow.completed)
      }
    : { total: 0, pending: 0, in_progress: 0, completed: 0 };

  return NextResponse.json({ neighborhoods, overall, other });
}
