// embeddings.ts — Gemini text embedding helper for Edge Functions.
//
// Uses gemini-embedding-001 with outputDimensionality=768 so the result fits
// our pgvector(768) column. Embeddings at non-default dimensionality should
// be L2-normalized before use.

const EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';
const EMBED_DIMS = 768;
const EMBED_TIMEOUT_MS = 8000;

export type EmbedResult = {
  vector: number[];
  dims: number;
  model: string;
};

export async function embedQuery(text: string): Promise<EmbedResult | null> {
  const key = Deno.env.get('EMBED_API_KEY') ?? Deno.env.get('GEMINI_API_KEY');
  if (!key || !text.trim()) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EMBED_TIMEOUT_MS);

  try {
    const resp = await fetch(`${EMBED_URL}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }], role: 'user' },
        outputDimensionality: EMBED_DIMS
      }),
      signal: ctrl.signal
    });
    if (!resp.ok) {
      console.error('embed failed', resp.status, (await resp.text()).slice(0, 200));
      return null;
    }
    const data = await resp.json();
    const values: number[] | undefined = data?.embedding?.values;
    if (!Array.isArray(values) || values.length !== EMBED_DIMS) return null;
    return { vector: normalize(values), dims: EMBED_DIMS, model: 'gemini-embedding-001' };
  } catch (e) {
    console.error('embed exception', e instanceof Error ? e.message : String(e));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalize(v: number[]): number[] {
  let sumSq = 0;
  for (const x of v) sumSq += x * x;
  const norm = Math.sqrt(sumSq) || 1;
  return v.map((x) => x / norm);
}
