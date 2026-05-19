import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'City of Doral — Citizen Assistant',
  description: 'Bilingual AI-powered assistant for City of Doral services.'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-soft"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <main id="main">{children}</main>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
