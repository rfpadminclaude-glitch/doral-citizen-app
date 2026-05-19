'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Loader2,
  Megaphone,
  Send,
  Sparkles,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Select, type SelectOption } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

type Severity = 'info' | 'warning' | 'urgent';

const SEVERITY_OPTIONS: SelectOption<Severity>[] = [
  { value: 'info', label: 'Info', description: 'General notice' },
  { value: 'warning', label: 'Warning', description: 'Caution / advisory' },
  { value: 'urgent', label: 'Urgent', description: 'High-priority alert' }
];

type Props = {
  open: boolean;
  onClose: () => void;
  onPublished?: () => void;
};

export function AnnouncementComposeDrawer({ open, onClose, onPublished }: Props) {
  const router = useRouter();
  const [titleEn, setTitleEn] = useState('');
  const [titleEs, setTitleEs] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyEs, setBodyEs] = useState('');
  const [severity, setSeverity] = useState<Severity>('info');
  const [expiresHours, setExpiresHours] = useState<string>('24');
  const [pending, setPending] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);

  function reset() {
    setTitleEn('');
    setTitleEs('');
    setBodyEn('');
    setBodyEs('');
    setSeverity('info');
    setExpiresHours('24');
    setError(null);
    setTranslateError(null);
  }

  async function translate() {
    setTranslateError(null);
    if (!titleEn.trim() && !bodyEn.trim()) return;
    setTranslating(true);
    try {
      const resp = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text_title: titleEn.trim(),
          text_body: bodyEn.trim()
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setTranslateError(typeof data?.error === 'string' ? data.error : 'translate failed');
        return;
      }
      if (data.title) setTitleEs(data.title);
      if (data.body) setBodyEs(data.body);
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(false);
    }
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!titleEn.trim() || !titleEs.trim() || !bodyEn.trim() || !bodyEs.trim()) {
      setError('English and Spanish are both required.');
      return;
    }
    setPending(true);

    const expiresAt =
      expiresHours && Number(expiresHours) > 0
        ? new Date(Date.now() + Number(expiresHours) * 60 * 60 * 1000).toISOString()
        : null;

    try {
      const resp = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title_en: titleEn.trim(),
          title_es: titleEs.trim(),
          body_en: bodyEn.trim(),
          body_es: bodyEs.trim(),
          severity,
          expires_at: expiresAt,
          channels: ['web']
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data?.error ?? `HTTP ${resp.status}`);
        return;
      }
      reset();
      router.refresh();
      onPublished?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-label="Close"
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="announce-drawer-title"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-surface shadow-glass"
          >
            <div className="doral-gradient-bar-animated h-1.5 w-full" aria-hidden="true" />

            <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div>
                  <h2 id="announce-drawer-title" className="text-sm font-semibold text-foreground">
                    New announcement
                  </h2>
                  <p className="text-xs text-muted-foreground">Posts to all active resident chats instantly.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={publish} className="flex min-h-0 flex-1 flex-col">
              <div className="scroll-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                {/* English */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      English
                    </h3>
                    <button
                      type="button"
                      onClick={translate}
                      disabled={translating || (!titleEn.trim() && !bodyEn.trim())}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {translating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {translating ? 'Translating…' : 'Translate to Spanish'}
                    </button>
                  </div>
                  <input
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="Title (EN)"
                    className="block w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    required
                    maxLength={200}
                  />
                  <textarea
                    value={bodyEn}
                    onChange={(e) => setBodyEn(e.target.value)}
                    placeholder="Body (EN)"
                    rows={5}
                    className="block w-full resize-y rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    required
                    maxLength={2000}
                  />
                  {translateError && (
                    <p role="alert" className="rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                      {translateError}
                    </p>
                  )}
                </section>

                {/* Spanish */}
                <section className="space-y-2">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Español
                  </h3>
                  <input
                    value={titleEs}
                    onChange={(e) => setTitleEs(e.target.value)}
                    placeholder="Título (ES)"
                    className="block w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    required
                    maxLength={200}
                  />
                  <textarea
                    value={bodyEs}
                    onChange={(e) => setBodyEs(e.target.value)}
                    placeholder="Cuerpo (ES)"
                    rows={5}
                    className="block w-full resize-y rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    required
                    maxLength={2000}
                  />
                </section>

                {/* Severity + expires */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Severity
                    </p>
                    <div className="mt-1.5">
                      <Select<Severity>
                        ariaLabel="Severity"
                        value={severity}
                        onChange={setSeverity}
                        options={SEVERITY_OPTIONS}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Expires in (hours)
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={expiresHours}
                      onChange={(e) => setExpiresHours(e.target.value)}
                      className="mt-1.5 block w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <label className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    disabled
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                  />
                  Send SMS to opted-in residents
                  <span className="ml-auto text-[10px] uppercase tracking-wider">
                    enabled when Twilio is connected
                  </span>
                </label>

                {error && (
                  <p role="alert" className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-surface-2/60 px-5 py-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:translate-y-[-1px]',
                    'disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                  )}
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {pending ? 'Publishing…' : 'Publish'}
                </button>
              </footer>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
