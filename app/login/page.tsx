'use client';

import { BarChart3, Building2, Library, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SkylineIllustration } from '@/components/chat/SkylineIllustration';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Library,
    title: 'Knowledge base',
    body: 'Bilingual sources cited in every grounded answer.'
  },
  {
    icon: BarChart3,
    title: 'Live analytics',
    body: 'Sentiment, volume, deflection, and CSAT in real time.'
  },
  {
    icon: ShieldCheck,
    title: 'Audit trail',
    body: 'Append-only log of every model call and admin action.'
  }
];

export default function LoginPage() {
  const t = useTranslations('admin.login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) {
      setError(t('error'));
      return;
    }
    router.replace('/admin');
    router.refresh();
  }

  return (
    <div className="relative grid min-h-[100svh] grid-cols-1 lg:grid-cols-2">
      {/* Theme toggle — always reachable */}
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      {/* Left showcase — desktop only */}
      <aside
        aria-hidden="true"
        className="doral-radial relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface-2 p-10 lg:flex"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-soft">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                City of Doral
              </p>
              <p className="text-base font-semibold text-foreground">Citizen Assistant</p>
            </div>
          </div>

          <h1 className="mt-10 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Admin portal for the bilingual AI assistant.
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Manage the knowledge base, broadcast announcements, review every conversation, and track outcomes
            — all in one place. Built on the Doral ITN 2025-20 RFP scope.
          </p>

          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Skyline illustration */}
        <div className="-mb-4">
          <SkylineIllustration className="h-32 w-full" />
          <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            v0.1 PoC · {new Date().toISOString().slice(0, 10)}
          </p>
        </div>
      </aside>

      {/* Right form */}
      <main className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="doral-radial pointer-events-none absolute inset-0 -z-10 lg:hidden" aria-hidden="true" />

        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm space-y-5"
          aria-labelledby="login-title"
        >
          {/* Mobile brand header (hidden on desktop where the left panel shows it) */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-soft">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                City of Doral
              </p>
              <p className="text-sm font-semibold text-foreground">Citizen Assistant</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Sign in
            </p>
            <h2 id="login-title" className="mt-1 text-2xl font-semibold text-foreground">
              {t('title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              City staff and partners only.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('email')}
            </label>
            <div className="field-ring flex items-center gap-2 px-3 py-2.5">
              <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder="you@cityofdoral.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('password')}
            </label>
            <div className="field-ring flex items-center gap-2 px-3 py-2.5">
              <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className={cn(
              'w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:translate-y-[-1px]',
              'disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            )}
          >
            {pending ? t('loading') : t('submit')}
          </button>

          <p className="text-center text-[11px] text-muted-foreground">
            Not a city employee?{' '}
            <a href="/" className="font-medium text-primary hover:underline">
              Open the resident chat
            </a>
          </p>
        </form>
      </main>
    </div>
  );
}
