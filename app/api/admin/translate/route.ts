import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { translateEnToEs } from '@/lib/translate';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  text_title: z.string().max(400).default(''),
  text_body: z.string().max(8000).default('')
});

export async function POST(req: NextRequest) {
  const sb = createClient();
  const {
    data: { user }
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: admin } = await sb
    .from('admin_users')
    .select('id, role')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (!admin || admin.role === 'viewer') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  try {
    const out = await translateEnToEs(parsed.data.text_title, parsed.data.text_body);
    return NextResponse.json({
      title: out.title,
      body: out.body,
      model: out.model,
      attempts: out.attempts
    });
  } catch (e) {
    let detail: string | string[] = e instanceof Error ? e.message : String(e);
    try {
      const parsedErr = JSON.parse(detail as string);
      if (parsedErr && typeof parsedErr === 'object' && parsedErr.attempts) {
        detail = parsedErr.attempts as string[];
      }
    } catch {
      // not JSON
    }
    return NextResponse.json(
      { error: 'translate unavailable', detail },
      { status: 503 }
    );
  }
}
