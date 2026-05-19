/**
 * seed-and-embed.ts
 *
 * One-shot script that seeds Doral content into the database and generates
 * vector embeddings for every chunk. Idempotent — re-running upserts by
 * (source_url, lang) and re-embeds anything missing.
 *
 * Usage:
 *   pnpm tsx scripts/seed-and-embed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and
 * GEMINI_API_KEY (or EMBED_API_KEY) in .env.local.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { SEED_DOCS } from '../supabase/seed/doral-content';

loadEnv();

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMBED_KEY = process.env.EMBED_API_KEY ?? process.env.GEMINI_API_KEY;

if (!SB_URL || !SB_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!EMBED_KEY) {
  console.error('Missing GEMINI_API_KEY / EMBED_API_KEY');
  process.exit(1);
}

const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

const EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';
const EMBED_DIMS = 768;
const CHUNK_TARGET = 600; // characters
const CHUNK_MAX = 900;
const RATE_LIMIT_MS = 250; // gentle pacing between embed calls

async function embed(text: string): Promise<number[] | null> {
  const resp = await fetch(`${EMBED_URL}?key=${encodeURIComponent(EMBED_KEY!)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }], role: 'user' },
      outputDimensionality: EMBED_DIMS
    })
  });
  if (!resp.ok) {
    console.error('  embed error', resp.status, (await resp.text()).slice(0, 200));
    return null;
  }
  const data = await resp.json();
  const values: number[] | undefined = data?.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBED_DIMS) {
    console.error('  bad embedding shape');
    return null;
  }
  // Normalize for cosine search on MRL-truncated outputs.
  let sumSq = 0;
  for (const x of values) sumSq += x * x;
  const norm = Math.sqrt(sumSq) || 1;
  return values.map((x) => x / norm);
}

function chunk(body: string): string[] {
  // Split on blank lines first, then merge until ~CHUNK_TARGET chars.
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    if (!current) {
      current = p;
    } else if ((current.length + 2 + p.length) <= CHUNK_MAX) {
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

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function seedOne(
  slug: string,
  url: string,
  domain: string,
  title: string,
  body: string,
  lang: 'en' | 'es'
): Promise<void> {
  console.log(`\n• ${lang.toUpperCase()} ${slug}`);

  // Upsert document
  const { data: doc, error: docErr } = await sb
    .from('documents')
    .upsert(
      {
        source_url: `${url}#${lang}`,
        source_domain: domain,
        title,
        lang,
        extracted_text: body,
        last_scraped_at: new Date().toISOString(),
        is_active: true
      },
      { onConflict: 'source_url' }
    )
    .select('id')
    .single();
  if (docErr || !doc) {
    console.error('  document upsert failed', docErr?.message);
    return;
  }

  // Wipe existing chunks for clean re-run
  await sb.from('document_chunks').delete().eq('document_id', doc.id);

  const chunks = chunk(body);
  console.log(`  ${chunks.length} chunks`);

  let i = 0;
  for (const text of chunks) {
    const vec = await embed(text);
    if (!vec) {
      console.error(`  ✗ chunk ${i} embed failed; aborting this doc`);
      return;
    }
    const { error: cErr } = await sb.from('document_chunks').insert({
      document_id: doc.id,
      chunk_index: i,
      content: text,
      lang,
      embedding: vec,
      token_count: Math.ceil(text.length / 4),
      heading_path: [title]
    });
    if (cErr) {
      console.error(`  ✗ chunk ${i} insert failed`, cErr.message);
      return;
    }
    i++;
    await sleep(RATE_LIMIT_MS);
  }
  console.log(`  ✓ ${i} chunks embedded`);
}

async function main() {
  console.log(`Seeding ${SEED_DOCS.length} docs (EN + ES = ${SEED_DOCS.length * 2} rows)`);
  for (const d of SEED_DOCS) {
    await seedOne(d.slug, d.source_url, d.source_domain, d.title_en, d.body_en, 'en');
    await seedOne(d.slug, d.source_url, d.source_domain, d.title_es, d.body_es, 'es');
  }
  console.log('\nDone.');
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
  console.error('uncaught', e);
  process.exit(1);
});
