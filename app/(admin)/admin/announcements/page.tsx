import { createClient } from '@/lib/supabase/server';
import { AnnouncementsClient } from './AnnouncementsClient';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const sb = createClient();
  const { data: rows } = await sb
    .from('announcements')
    .select('id, title_en, title_es, body_en, body_es, severity, publish_at, expires_at, channels')
    .order('publish_at', { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          City messaging
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish bilingual banners that appear in every resident chat in real time.
        </p>
      </header>

      <AnnouncementsClient rows={(rows ?? []) as never[]} />
    </div>
  );
}
