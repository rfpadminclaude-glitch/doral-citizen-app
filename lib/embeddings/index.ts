/**
 * Server-side embeddings + chunking helpers (Node runtime).
 *
 * Mirrors the logic in supabase/functions/_shared/embeddings.ts but lives in
 * the Next.js Node runtime so API routes and server actions can call it
 * without going through the Edge Function.
 */

const EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';
const EMBED_DIMS = 768;
const CHUNK_TARGET = 600;
const CHUNK_MAX = 900;
const RATE_LIMIT_MS = 250;

export function chunkText(body: string): string[] {
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    if (!current) {
      current = p;
    } else if (current.length + 2 + p.length <= CHUNK_MAX) {
      current = current + '\n\n' + p;
    } else {
      chunks.push(current);
      current = p;
    }
    if (current.length >= CHUNK_TARGET) {
      chunks.push(current);
      current = '';
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.EMBED_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!key || !text.trim()) return null;

  const resp = await fetch(`${EMBED_URL}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }], role: 'user' },
      outputDimensionality: EMBED_DIMS
    })
  });
  if (!resp.ok) {
    console.error('embed http', resp.status, (await resp.text()).slice(0, 200));
    return null;
  }
  const data = await resp.json();
  const values: number[] | undefined = data?.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBED_DIMS) return null;

  let sumSq = 0;
  for (const x of values) sumSq += x * x;
  const norm = Math.sqrt(sumSq) || 1;
  return values.map((x) => x / norm);
}

export async function embedChunks(chunks: string[]): Promise<Array<number[] | null>> {
  const out: Array<number[] | null> = [];
  for (const c of chunks) {
    out.push(await embedText(c));
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
  }
  return out;
}
