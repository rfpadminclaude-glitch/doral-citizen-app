'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl';
import { setLocaleCookie } from './setLocale';

type LocaleValue = 'en' | 'es';

export default function LangToggle() {
  const locale = useLocale() as LocaleValue;
  const router = useRouter();
  const t = useTranslations('chat');
  const [pending, startTransition] = useTransition();

  const options: SegmentedOption<LocaleValue>[] = [
    { value: 'en', label: t('langEn') },
    { value: 'es', label: t('langEs') }
  ];

  function switchTo(next: LocaleValue) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocaleCookie(next);
      // The server action updates the cookie + revalidates the layout, but the
      // already-mounted client tree still holds the previous `useLocale()`
      // value. Refreshing the router refetches the RSC payload and rehydrates
      // the next-intl provider with the new locale, so the chat widget's copy
      // switches too.
      router.refresh();
    });
  }

  return (
    <SegmentedControl<LocaleValue>
      ariaLabel={t('langToggle')}
      value={locale}
      onChange={switchTo}
      options={options}
      size="sm"
    />
  );
}
