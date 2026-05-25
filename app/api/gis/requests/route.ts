import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Query = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  neighborhood: z.string().optional(),
  source: z.enum(['all', 'demo', 'real']).optional()
});

function splitCsv(s: string | undefined): string[] | undefined {
  if (!s) return undefined;
  const out = s.split(',').map((x) => x.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin({ allowViewer: true });
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = Query.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  const statuses = splitCsv(params.status);
  const types = splitCsv(params.type);

  const sb = createAdminClient();
  let q = sb
    .from('service_requests')
    .select(
      'id, title, request_type, status, priority, neighborhood_slug, address_line, lat, lng, created_at, resident_name'
    )
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (statuses) q = q.in('status', statuses);
  if (types) q = q.in('request_type', types);
  if (params.from) q = q.gte('created_at', params.from);
  if (params.to) q = q.lte('created_at', params.to);
  if (params.neighborhood) q = q.eq('neighborhood_slug', params.neighborhood);
  if (params.source === 'demo') {
    q = q.eq('mock_crm_payload->>demo', 'true');
  } else if (params.source === 'real') {
    q = q.or('mock_crm_payload.is.null,mock_crm_payload->>demo.neq.true');
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const features = (data ?? []).map((r) => ({
    type: 'Feature' as const,
    id: r.id,
    geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
    properties: {
      id: r.id,
      case_code: `SR-${r.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
      title: r.title,
      request_type: r.request_type,
      status: r.status,
      priority: r.priority,
      neighborhood_slug: r.neighborhood_slug,
      address_line: r.address_line,
      created_at: r.created_at,
      resident_name: r.resident_name
    }
  }));

  return NextResponse.json({
    type: 'FeatureCollection' as const,
    features
  });
}
