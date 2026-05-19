import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

const SUPPORTED = ['en', 'es'] as const;
type Locale = (typeof SUPPORTED)[number];

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: Locale =
    cookieLocale && (SUPPORTED as readonly string[]).includes(cookieLocale)
      ? (cookieLocale as Locale)
      : 'en';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
