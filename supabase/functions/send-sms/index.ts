// send-sms — Twilio Programmable SMS wrapper.
//
// Trial-account note: Twilio trial credentials can only send to verified
// numbers. The function checks TWILIO_VERIFIED_NUMBERS (comma-separated) and
// returns a structured "simulated" response if the target is not verified, so
// the demo flow never hard-fails on stage.

import { admin } from '../_shared/supabase.ts';
import { audit } from '../_shared/audit.ts';

type Body = {
  phone: string;
  body: string;
  conversation_id?: string;
  simulate?: boolean;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
  if (req.method !== 'POST') return cors(new Response('method not allowed', { status: 405 }));

  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return cors(json({ error: 'invalid json' }, 400));
  }
  if (!payload.phone?.startsWith('+') || !payload.body?.trim()) {
    return cors(json({ error: 'phone (E.164) and body are required' }, 400));
  }

  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');
  const verified = (Deno.env.get('TWILIO_VERIFIED_NUMBERS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!sid || !token || !from) {
    return cors(json({ error: 'twilio env missing' }, 500));
  }

  // Trial guard: if the target isn't pre-verified, simulate.
  const isVerified = verified.length === 0 ? true : verified.includes(payload.phone);
  if (payload.simulate || !isVerified) {
    await audit({
      actorType: 'system',
      action: 'sms.simulated',
      entityType: 'conversation',
      entityId: payload.conversation_id,
      metadata: { reason: isVerified ? 'flag' : 'not_verified', to: redact(payload.phone) }
    });
    return cors(json({ simulated: true, to: payload.phone }));
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = btoa(`${sid}:${token}`);
  const form = new URLSearchParams({ From: from, To: payload.phone, Body: payload.body });

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: form
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    await audit({
      actorType: 'system',
      action: 'sms.failed',
      entityType: 'conversation',
      entityId: payload.conversation_id,
      metadata: { status: resp.status, twilio: data, to: redact(payload.phone) }
    });
    return cors(json({ error: 'twilio call failed', detail: data }, resp.status));
  }

  await audit({
    actorType: 'system',
    action: 'sms.sent',
    entityType: 'conversation',
    entityId: payload.conversation_id,
    metadata: { sid: data.sid, to: redact(payload.phone) }
  });

  return cors(json({ sid: data.sid, status: data.status, to: payload.phone }));
});

function redact(phone: string): string {
  if (phone.length < 6) return '***';
  return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
}
function json(b: unknown, status = 200): Response {
  return new Response(JSON.stringify(b), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
function cors(resp: Response): Response {
  resp.headers.set('access-control-allow-origin', '*');
  resp.headers.set('access-control-allow-methods', 'POST, OPTIONS');
  resp.headers.set('access-control-allow-headers', 'content-type, authorization');
  return resp;
}
