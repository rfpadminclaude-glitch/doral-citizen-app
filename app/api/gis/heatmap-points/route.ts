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

const PRIORITY_WEIGHT: Record<string, number> = {
  low: 0.5,
  normal: 1,
  high: 2,
  urgent: 3
};

function splitCsv(s: string | undefined): string[] | undefined {
  if (!s) return undefined;
  const out = s.split(',').map((x) => x.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin({ allowViewer: true });
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = Query.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));

  const sb = createAdminClient();
  let q = sb
    .from('service_requests')
    .select('lat, lng, priority')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(5000);

  const statuses = splitCsv(params.status);
  const types = splitCsv(params.type);
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

  const points = (data ?? []).map((r) => [
    r.lat,
    r.lng,
    PRIORITY_WEIGHT[r.priority ?? 'normal'] ?? 1
  ]);

  return NextResponse.json({ points });
}
