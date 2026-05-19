import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { chunkText, embedChunks } from '@/lib/embeddings';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(10),
  is_active: z.boolean().optional()
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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

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

  const admin = createAdminClient();

  // Update document
  const { data: doc, error: updErr } = await admin
    .from('documents')
    .update({
      title: parsed.data.title,
      extracted_text: parsed.data.body,
      is_active: parsed.data.is_active ?? true,
      last_scraped_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select('id, lang, title')
    .single();
  if (updErr || !doc) {
    return NextResponse.json({ error: updErr?.message ?? 'update failed' }, { status: 500 });
  }

  // Rebuild chunks
  await admin.from('document_chunks').delete().eq('document_id', doc.id);
  const chunks = chunkText(parsed.data.body);
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
    const { error: insErr } = await admin.from('document_chunks').insert(rows);
    if (insErr) {
      return NextResponse.json(
        { error: 'chunk insert failed', detail: insErr.message },
        { status: 500 }
      );
    }
  }

  await admin.from('audit_log').insert({
    actor_type: 'admin',
    actor_id: auth.adminId,
    action: 'document.updated',
    entity_type: 'document',
    entity_id: doc.id,
    metadata: {
      title: doc.title,
      chunks: rows.length,
      lang: doc.lang
    }
  });

  return NextResponse.json({
    ok: true,
    id: doc.id,
    chunks: rows.length
  });
}
