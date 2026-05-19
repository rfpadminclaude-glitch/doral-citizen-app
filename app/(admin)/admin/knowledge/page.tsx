import { createClient } from '@/lib/supabase/server';
import { KnowledgeClient } from './KnowledgeClient';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const sb = createClient();

  const [{ data: docs }, { data: chunks }] = await Promise.all([
    sb
      .from('documents')
      .select('id, source_url, source_domain, title, lang, last_scraped_at, is_active, created_at')
      .order('last_scraped_at', { ascending: false }),
    sb.from('document_chunks').select('document_id')
  ]);

  const chunkCount = new Map<string, number>();
  for (const c of chunks ?? []) {
    chunkCount.set(c.document_id, (chunkCount.get(c.document_id) ?? 0) + 1);
  }

  const rows = (docs ?? []).map((d) => ({
    id: d.id,
    source_url: d.source_url,
    source_domain: d.source_domain,
    title: d.title,
    lang: d.lang as 'en' | 'es',
    last_scraped_at: d.last_scraped_at,
    is_active: d.is_active,
    chunk_count: chunkCount.get(d.id) ?? 0
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Knowledge base
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The grounded sources the assistant cites. Edit a document and we&apos;ll re-embed it so the next
          chat reflects your changes.
        </p>
      </header>

      <KnowledgeClient docs={rows} />
    </div>
  );
}
