/**
 * Server-side EN → ES translation helper.
 *
 * Walks the same GEMINI_MODELS chain as the Edge Function llm-router so the
 * translate endpoint stays robust against per-model quota / 503s. Returns the
 * structured `{title, body}` pair the announcement composer needs.
 */

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const TIMEOUT_MS = 12000;

const DEFAULT_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash'
];

function chain(): string[] {
  const raw = process.env.GEMINI_MODELS;
  if (raw) {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts;
  }
  const single = process.env.GEMINI_MODEL;
  return single ? [single, ...DEFAULT_CHAIN.filter((m) => m !== single)] : DEFAULT_CHAIN;
}

export type TranslationOutput = {
  title: string;
  body: string;
  model: string;
  attempts: string[];
};

export async function translateEnToEs(
  title: string,
  body: string
): Promise<TranslationOutput> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');
  if (!title.trim() && !body.trim()) {
    return { title: '', body: '', model: '', attempts: [] };
  }

  const system = `You translate City of Doral citizen-facing announcements from English to natural, formal Latin-American Spanish. Preserve numbers, addresses, phone numbers, dollar amounts, dates, and proper nouns exactly. Return ONLY a JSON object with keys "title" and "body" — no commentary, no code fences.`;
  const user = JSON.stringify({ title, body });

  const attempts: string[] = [];
  for (const model of chain()) {
    try {
      const result = await callOnce(key, model, system, user);
      return { ...result, model, attempts };
    } catch (e) {
      attempts.push(`${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(JSON.stringify({ kind: 'all_failed', attempts }));
}

async function callOnce(
  key: string,
  model: string,
  system: string,
  user: string
): Promise<{ title: string; body: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: 'json_object' }
      }),
      signal: ctrl.signal
    });
    if (resp.status === 429) {
      const t = (await resp.text()).slice(0, 200);
      if (/limit:\s*0/i.test(t) || /generate_content_free_tier/i.test(t)) {
        throw new Error('429_quota');
      }
      throw new Error('429_rpm');
    }
    if (resp.status === 503) throw new Error('503');
    if (resp.status === 404) throw new Error('404');
    if (!resp.ok) throw new Error(`${resp.status} ${(await resp.text()).slice(0, 200)}`);
    const data = await resp.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('empty_content');
    // Some models wrap in code fences — strip them.
    let raw = content.trim();
    const fence = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fence) raw = fence[1].trim();
    const parsed = JSON.parse(raw) as { title?: unknown; body?: unknown };
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      body: typeof parsed.body === 'string' ? parsed.body : ''
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw new Error('timeout');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
