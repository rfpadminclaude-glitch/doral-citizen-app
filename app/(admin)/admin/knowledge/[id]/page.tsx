import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditDocumentForm } from './EditDocumentForm';

export const dynamic = 'force-dynamic';

export default async function EditDocumentPage({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: doc } = await sb
    .from('documents')
    .select('id, source_url, source_domain, title, lang, extracted_text, last_scraped_at, is_active')
    .eq('id', params.id)
    .maybeSingle();

  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <EditDocumentForm
        doc={{
          id: doc.id,
          title: doc.title ?? '',
          body: doc.extracted_text ?? '',
          lang: doc.lang as 'en' | 'es',
          source_url: doc.source_url,
          source_domain: doc.source_domain,
          last_scraped_at: doc.last_scraped_at,
          is_active: doc.is_active
        }}
      />
    </div>
  );
}
