import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { generateSessionId } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'doral_session';

type Payload = {
  message: string;
  lang?: 'en' | 'es';
  session_id?: string;
  forceFail?: 'groq' | 'gemini';
};

export async function POST(req: NextRequest) {
  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!payload.message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const jar = cookies();
  // Explicit session_id from the client wins over the cookie. Cookie is the
  // fallback for first-time visitors who don't yet have a localStorage entry.
  let sessionId = payload.session_id?.trim() || jar.get(SESSION_COOKIE)?.value;
  let setCookie = false;
  if (!sessionId) {
    sessionId = generateSessionId();
    setCookie = true;
  } else if (jar.get(SESSION_COOKIE)?.value !== sessionId) {
    // Persist whichever id the client used so subsequent first-load requests
    // continue against the same conversation.
    setCookie = true;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });
  }

  const url = `${supabaseUrl}/functions/v1/chat-completion`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${anonKey}`,
      'x-forwarded-for': req.headers.get('x-forwarded-for') ?? ''
    },
    body: JSON.stringify({
      session_id: sessionId,
      message: payload.message,
      lang: payload.lang ?? 'en',
      channel: 'web',
      forceFail: payload.forceFail
    })
  }).catch((e) => ({ ok: false, status: 502, text: async () => String(e) } as Response));

  const text = await resp.text();
  const headers = new Headers({ 'content-type': 'application/json' });
  if (setCookie) {
    headers.append(
      'set-cookie',
      `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    );
  }

  return new NextResponse(text, { status: resp.status, headers });
}
