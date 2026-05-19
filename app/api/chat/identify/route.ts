import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  session_id: z.string().min(1).max(200),
  name: z.string().min(1).max(120)
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
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
  const name = parsed.data.name.trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  // Upsert: if the conversation doesn't exist yet (first message hasn't been
  // sent), seed a row so the name persists for when the first message lands.
  const nowIso = new Date().toISOString();
  const { error: upErr } = await sb
    .from('conversations')
    .upsert(
      {
        session_id: parsed.data.session_id,
        resident_name: name,
        last_activity_at: nowIso
      },
      { onConflict: 'session_id' }
    );
  if (upErr) {
    return NextResponse.json({ error: 'identify failed', detail: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, name });
}
