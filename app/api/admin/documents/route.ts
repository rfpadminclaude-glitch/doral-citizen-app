import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { chunkText, embedChunks } from '@/lib/embeddings';
import {
  EmptyExtractionError,
  TextTooLargeError,
  extractFromDocxBuffer,
  extractFromPdfBuffer,
  extractFromUrl
} from '@/lib/admin/text-extract';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Headroom for the embedding loop (rate-limited at 250 ms per chunk).
export const maxDuration = 60;

const Common = z.object({
  title: z.string().min(1).max(200),
  lang: z.enum(['en', 'es']),
  source_url: z.string().trim().max(2000).optional(),
  is_active: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : v ?? true))
});

async function assertAdmin(): Promise<{ adminId: string } | { error: string; status: number }> {
  const sb = createClient();
  const {
    data: { user }
  } = await sb.auth.getUser();
  if (!user) return { error: 'unauthenticated', status: 401 };
  const { data: admin } = await sb
    .from('admin_users')
    .select('id, role')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (!admin || admin.role === 'viewer') {
    return { error: 'forbidden', status: 403 };
  }
  return { adminId: admin.id };
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'manual';
  }
}

export async function POST(req: NextRequest) {
  const auth = await assertAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid multipart' }, { status: 400 });
  }

  const mode = String(form.get('mode') ?? '');
  if (!['manual', 'url', 'file'].includes(mode)) {
    return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
  }

  const commonParse = Common.safeParse({
    title: form.get('title'),
    lang: form.get('lang'),
    source_url: form.get('source_url') || undefined,
    is_active: form.get('is_active') ?? undefined
  });
  if (!commonParse.success) {
    return NextResponse.json(
      { error: 'invalid payload', issues: commonParse.error.flatten() },
      { status: 400 }
    );
  }
  const common = commonParse.data;

  // ---- Extract text per mode -----------------------------------------------
  let text: string;
  let recordedSourceUrl: string;
  try {
    if (mode === 'manual') {
      const body = String(form.get('body') ?? '').trim();
      if (body.length < 10) {
        return NextResponse.json({ error: 'body too short (min 10 chars)' }, { status: 400 });
      }
      if (body.length > 50_000) {
        return NextResponse.json({ error: 'body exceeds 50 KB limit' }, { status: 400 });
      }
      text = body;
      recordedSourceUrl = common.source_url || `manual:${crypto.randomUUID()}`;
    } else if (mode === 'url') {
      const targetUrl = String(form.get('target_url') ?? '').trim();
      if (!/^https?:\/\//i.test(targetUrl)) {
        return NextResponse.json({ error: 'target_url must be http(s)://...' }, { status: 400 });
      }
      const out = await extractFromUrl(targetUrl);
      text = out.text;
      recordedSourceUrl = common.source_url || targetUrl;
    } else {
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'file field missing' }, { status: 400 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'file exceeds 5 MB' }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const name = file.name.toLowerCase();
      if (name.endsWith('.pdf') || file.type === 'application/pdf') {
        text = await extractFromPdfBuffer(buf);
      } else if (
        name.endsWith('.docx') ||
        file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        text = await extractFromDocxBuffer(buf);
      } else {
        return NextResponse.json({ error: 'unsupported file type (PDF or DOCX only)' }, { status: 400 });
      }
      recordedSourceUrl = common.source_url || `upload:${file.name}:${crypto.randomUUID()}`;
    }
  } catch (e) {
    if (e instanceof TextTooLargeError) {
      return NextResponse.json({ error: 'too_large' }, { status: 413 });
    }
    if (e instanceof EmptyExtractionError) {
      return NextResponse.json({ error: 'no_text' }, { status: 422 });
    }
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'extraction failed', detail }, { status: 502 });
  }

  // ---- Insert document + chunks --------------------------------------------
  const admin = createAdminClient();
  const sourceDomain = domainOf(recordedSourceUrl);

  const { data: doc, error: insErr } = await admin
    .from('documents')
    .insert({
      source_url: recordedSourceUrl,
      source_domain: sourceDomain,
      title: common.title,
      lang: common.lang,
      extracted_text: text,
      is_active: common.is_active,
      last_scraped_at: new Date().toISOString()
    })
    .select('id, lang, title')
    .single();
  if (insErr || !doc) {
    // Surface the unique-violation cleanly if a duplicate source_url is reused.
    const duplicated = insErr?.message?.toLowerCase().includes('duplicate');
    return NextResponse.json(
      {
        error: duplicated ? 'source_url already exists' : (insErr?.message ?? 'insert failed'),
        detail: insErr?.message
      },
      { status: duplicated ? 409 : 500 }
    );
  }

  const chunks = chunkText(text);
  const vectors = await embedChunks(chunks);

  const rows = chunks
    .map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      lang: doc.lang,
      embedding: vectors[i],
      token_count: Math.ceil(content.length / 4),
      heading_path: [doc.title]
    }))
    .filter((r) => r.embedding != null);

  if (rows.length > 0) {
    const { error: chunkErr } = await admin.from('document_chunks').insert(rows);
    if (chunkErr) {
      return NextResponse.json(
        { error: 'chunk insert failed', detail: chunkErr.message },
        { status: 500 }
      );
    }
  }

  await admin.from('audit_log').insert({
    actor_type: 'admin',
    actor_id: auth.adminId,
    action: 'document.created',
    entity_type: 'document',
    entity_id: doc.id,
    metadata: {
      title: doc.title,
      chunks: rows.length,
      lang: doc.lang,
      mode,
      source: recordedSourceUrl
    }
  });

  return NextResponse.json({
    ok: true,
    id: doc.id,
    chunks: rows.length
  });
}
