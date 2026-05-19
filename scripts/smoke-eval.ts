/**
 * smoke-eval.ts
 *
 * Quick end-to-end smoke check. Reads .env.local, then verifies:
 *   1. /api/chat returns a non-empty answer with a provider tag.
 *   2. send-sms Edge Function reaches Twilio (or simulates if number is unverified).
 *
 * Usage:
 *   pnpm tsx scripts/smoke-eval.ts
 *   pnpm tsx scripts/smoke-eval.ts --sms +15551234567
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

loadEnv();

const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const args = process.argv.slice(2);
const smsTarget = pickArg('--sms');

async function main() {
  console.log(`[smoke] hitting ${APP}/api/chat`);
  const chatResp = await fetch(`${APP}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'How do I renew my business permit?', lang: 'en' })
  });
  const chat = await chatResp.json();
  if (!chatResp.ok || !chat.answer) {
    console.error(`[smoke] chat failed: ${chatResp.status}`, chat);
    process.exit(1);
  }
  console.log(`[smoke] chat ok — provider=${chat.provider} latency=${chat.latency_ms}ms`);
  console.log(`  answer: ${truncate(chat.answer, 140)}`);

  if (smsTarget) {
    if (!SB_URL || !ANON) {
      console.error('[smoke] supabase env missing — cannot test send-sms directly');
      process.exit(1);
    }
    console.log(`[smoke] hitting send-sms for ${smsTarget}`);
    const sms = await fetch(`${SB_URL}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ANON}`
      },
      body: JSON.stringify({
        phone: smsTarget,
        body: 'Doral smoke test — if you got this, Twilio is wired up.'
      })
    });
    const smsBody = await sms.json();
    if (!sms.ok) {
      console.error(`[smoke] sms failed: ${sms.status}`, smsBody);
      process.exit(1);
    }
    console.log(`[smoke] sms ok —`, smsBody);
  } else {
    console.log('[smoke] skipping SMS (pass --sms +15551234567 to enable)');
  }
}

function pickArg(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n) + '…';
}

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (!m) continue;
      const [, k, v] = m;
      if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, '');
    }
  } catch {
    // best-effort
  }
}

main().catch((e) => {
  console.error('[smoke] uncaught', e);
  process.exit(1);
});
