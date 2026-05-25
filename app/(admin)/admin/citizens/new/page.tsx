import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { listNeighborhoods } from '@/lib/geo/neighborhoods';
import { NewCitizenForm } from './NewCitizenForm';

export const dynamic = 'force-dynamic';

export default async function NewCitizenPage() {
  const t = await getTranslations('admin.citizens');
  const neighborhoods = listNeighborhoods();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link
        href="/admin/citizens"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:underline"
      >
        <ArrowLeft className="h-3 w-3" />
        {t('backToList')}
      </Link>
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          {t('newSubtitleKicker')}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
          {t('newTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('newSubtitle')}</p>
      </header>

      <NewCitizenForm neighborhoods={neighborhoods} />
    </div>
  );
}
