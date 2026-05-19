// llm-router.ts — Groq primary + Gemini multi-model fallback chain.
//
// Failure handling (from the LLM availability hardening plan):
//   - 429 quota   → blacklist model for this request, move on
//   - 429 RPM     → backoff 500ms, retry same model once
//   - 503         → backoff 600ms, retry same model once, then move on
//   - 404         → log + move on (model deprecated)
//   - 401 / 403   → surface key issue, move on
//   - timeout     → move on
//   - empty content (truncated / thought_signature only) → move on
//
// Configure the chain via GEMINI_MODELS (comma-separated). The first entry
// that succeeds wins. PRIMARY_LLM controls Groq-first vs Gemini-first when
// both keys are configured.

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type RouterOptions = {
  messages: ChatMessage[];
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  forceFail?: 'groq' | 'gemini' | null;
};

export type RouterResult = {
  text: string;
  provider: 'groq' | 'gemini';
  model: string;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
  /**
   * One string per attempt that did NOT succeed before the one that did.
   * Empty array on first-try success.
   */
  attemptLog: string[];
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TIMEOUT_MS = 8000;
const GROQ_MODEL = Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile';

const GEMINI_TIMEOUT_MS = 12000;
const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const DEFAULT_GEMINI_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash'
];

function geminiChain(): string[] {
  const raw = Deno.env.get('GEMINI_MODELS');
  if (raw) {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts;
  }
  const single = Deno.env.get('GEMINI_MODEL');
  if (single) return [single, ...DEFAULT_GEMINI_CHAIN.filter((m) => m !== single)];
  return DEFAULT_GEMINI_CHAIN;
}

// ============================================================================
// Public entrypoint
// ============================================================================

export async function complete(opts: RouterOptions): Promise<RouterResult> {
  const start = Date.now();
  const hasGroq = !!Deno.env.get('GROQ_API_KEY');
  const hasGemini = !!Deno.env.get('GEMINI_API_KEY');
  const explicit = (Deno.env.get('PRIMARY_LLM') ?? '').toLowerCase();

  let order: Array<'groq' | 'gemini'>;
  if (explicit === 'gemini') order = ['gemini', 'groq'];
  else if (explicit === 'groq') order = ['groq', 'gemini'];
  else if (!hasGroq && hasGemini) order = ['gemini'];
  else if (hasGroq && !hasGemini) order = ['groq'];
  else order = ['groq', 'gemini'];

  // Honor forceFail demo flag.
  order = order.filter((p) => opts.forceFail !== p);
  if (order.length === 0) {
    throw new Error(
      JSON.stringify({
        kind: 'no_providers',
        message: 'all providers force-failed by demo flag',
        attempts: []
      })
    );
  }

  const attemptLog: string[] = [];

  for (const provider of order) {
    if (provider === 'groq') {
      if (!hasGroq) {
        attemptLog.push('groq: GROQ_API_KEY missing');
        continue;
      }
      try {
        const r = await callGroq(opts);
        return {
          ...r,
          provider: 'groq',
          model: GROQ_MODEL,
          latencyMs: Date.now() - start,
          attemptLog
        };
      } catch (e) {
        attemptLog.push(`groq[${GROQ_MODEL}]: ${errMsg(e)}`);
        // fall through to next provider
      }
    } else {
      if (!hasGemini) {
        attemptLog.push('gemini: GEMINI_API_KEY missing');
        continue;
      }
      const chain = geminiChain();
      let dropJsonMode = false;
      for (let i = 0; i < chain.length; i++) {
        const model = chain[i];
        try {
          const r = await callGeminiOnce(opts, model, dropJsonMode);
          return {
            ...r,
            provider: 'gemini',
            model,
            latencyMs: Date.now() - start,
            attemptLog
          };
        } catch (e) {
          const reason = errMsg(e);
          attemptLog.push(`gemini[${model}]: ${reason}`);
          // If we keep failing on json parsing, the LAST attempt drops JSON mode.
          if (
            opts.jsonMode &&
            i === chain.length - 2 &&
            attemptLog.filter((s) => s.includes('parse_failed')).length >= 2
          ) {
            dropJsonMode = true;
          }
        }
      }
    }
  }

  throw new Error(
    JSON.stringify({
      kind: 'all_failed',
      message: 'all providers exhausted',
      attempts: attemptLog
    })
  );
}

// ============================================================================
// Groq
// ============================================================================
async function callGroq(opts: RouterOptions): Promise<Omit<RouterResult, 'provider' | 'model' | 'latencyMs' | 'attemptLog'>> {
  const key = Deno.env.get('GROQ_API_KEY');
  if (!key) throw new Error('GROQ_API_KEY missing');

  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 1200
  };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };

  let attempt = 0;
  while (true) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), GROQ_TIMEOUT_MS);
    try {
      const resp = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      if (resp.status === 429 || resp.status >= 500) {
        if (attempt === 0) {
          attempt++;
          await sleep(500);
          continue;
        }
        throw new Error(`${resp.status} ${await safeText(resp)}`);
      }
      if (!resp.ok) throw new Error(`${resp.status} ${await safeText(resp)}`);
      const data = await resp.json();
      const text = pickContent(data);
      if (!text) throw new Error('empty_content');
      return {
        text,
        tokensIn: data.usage?.prompt_tokens,
        tokensOut: data.usage?.completion_tokens
      };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw new Error('timeout');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ============================================================================
// Gemini (single-model attempt with retries for 503 / 429-rpm)
// ============================================================================
async function callGeminiOnce(
  opts: RouterOptions,
  model: string,
  dropJsonMode = false
): Promise<Omit<RouterResult, 'provider' | 'model' | 'latencyMs' | 'attemptLog'>> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY missing');

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: Math.max(opts.maxTokens ?? 1200, 1200)
  };
  if (opts.jsonMode && !dropJsonMode) body.response_format = { type: 'json_object' };

  let attempt = 0;
  while (true) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT_MS);
    try {
      const resp = await fetch(GEMINI_BASE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });

      // Quota — daily limit. Don't retry this model.
      if (resp.status === 429) {
        const t = await safeText(resp);
        if (/limit:\s*0/i.test(t) || /generate_content_free_tier/i.test(t)) {
          throw new Error(`429_quota ${t.slice(0, 140)}`);
        }
        // RPM burst — one quick retry.
        if (attempt === 0) {
          attempt++;
          await sleep(500);
          continue;
        }
        throw new Error(`429_rpm ${t.slice(0, 140)}`);
      }

      // Transient overload — one quick retry.
      if (resp.status === 503) {
        if (attempt === 0) {
          attempt++;
          await sleep(600);
          continue;
        }
        throw new Error(`503 ${(await safeText(resp)).slice(0, 140)}`);
      }

      if (resp.status === 404) throw new Error('404_model_not_found');
      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`${resp.status}_auth`);
      }
      if (!resp.ok) throw new Error(`${resp.status} ${(await safeText(resp)).slice(0, 140)}`);

      const data = await resp.json();
      const text = pickContent(data);
      if (!text) throw new Error('empty_content');
      return {
        text,
        tokensIn: data.usage?.prompt_tokens,
        tokensOut: data.usage?.completion_tokens
      };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw new Error('timeout');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================
function pickContent(data: any): string {
  // Some Gemini models return content as plain string. Others return only
  // `extra_content.google.thought_signature` with empty `content` — treat
  // that as a failure so we move on.
  const c = data?.choices?.[0]?.message?.content;
  if (typeof c === 'string' && c.trim()) return c;
  return '';
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeText(resp: Response): Promise<string> {
  try {
    return (await resp.text()).slice(0, 500);
  } catch {
    return '';
  }
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
