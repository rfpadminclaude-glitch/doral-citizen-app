import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchBody = z.object({
  session_id: z.string().min(1).max(200),
  name: z.string().max(120).optional(),
  email: z.string().email().max(160).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  lang: z.enum(['en', 'es']).optional(),
  announcement_opt_in: z.boolean().optional(),
  avatar: z.string().max(8).optional()
});

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get('session_id');
  if (!sid) return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('conversations')
    .select('session_id, resident_name, email, resident_phone, lang, announcement_opt_in, avatar')
    .eq('session_id', sid)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    session_id: sid,
    name: data?.resident_name ?? null,
    email: data?.email ?? null,
    phone: data?.resident_phone ?? null,
    lang: data?.lang ?? 'en',
    announcement_opt_in: data?.announcement_opt_in ?? false,
    avatar: data?.avatar ?? '🙂'
  });
}

export async function PATCH(req: NextRequest) {
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
  const sb = createAdminClient();
  const patch: Record<string, unknown> = {
    session_id: parsed.data.session_id,
    last_activity_at: new Date().toISOString()
  };
  if (parsed.data.name !== undefined) patch.resident_name = parsed.data.name?.trim() || null;
  if (parsed.data.email !== undefined) patch.email = parsed.data.email?.trim() || null;
  if (parsed.data.phone !== undefined) patch.resident_phone = parsed.data.phone?.trim() || null;
  if (parsed.data.lang !== undefined) patch.lang = parsed.data.lang;
  if (parsed.data.announcement_opt_in !== undefined)
    patch.announcement_opt_in = parsed.data.announcement_opt_in;
  if (parsed.data.avatar !== undefined) patch.avatar = parsed.data.avatar;

  const { error } = await sb.from('conversations').upsert(patch, { onConflict: 'session_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
