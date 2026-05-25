import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Query = z.object({
  neighborhood: z.string().optional()
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin({ allowViewer: true });
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = Query.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));

  const sb = createAdminClient();
  let q = sb
    .from('citizens')
    .select('id, name, lat, lng, neighborhood_slug')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(2000);

  if (params.neighborhood) q = q.eq('neighborhood_slug', params.neighborhood);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ citizens: data ?? [] });
}
