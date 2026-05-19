'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Megaphone, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Select, type SelectOption } from '@/components/ui/Select';

type Severity = 'info' | 'warning' | 'urgent';

const SEVERITY_OPTIONS: SelectOption<Severity>[] = [
  { value: 'info', label: 'Info', description: 'General notice' },
  { value: 'warning', label: 'Warning', description: 'Caution / advisory' },
  { value: 'urgent', label: 'Urgent', description: 'High-priority alert' }
];

export function ComposeForm() {
  const router = useRouter();
  const [titleEn, setTitleEn] = useState('');
  const [titleEs, setTitleEs] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyEs, setBodyEs] = useState('');
  const [severity, setSeverity] = useState<Severity>('info');
  const [expiresHours, setExpiresHours] = useState<string>('24');
  const [smsBlast, setSmsBlast] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitleEn('');
    setTitleEs('');
    setBodyEn('');
    setBodyEs('');
    setSeverity('info');
    setExpiresHours('24');
    setSmsBlast(false);
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setToast(null);
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
      setToast('Published. Residents see it now.');
      reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={publish} className="space-y-4 rounded-2xl border border-border bg-surface-2 p-5">
      <div className="flex items-start gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Megaphone className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Compose announcement</h2>
          <p className="text-xs text-muted-foreground">
            Required in both languages. Posts to all active resident chats instantly via Supabase Realtime.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* English */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            English
          </p>
          <input
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="Title (EN)"
            className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            required
            maxLength={200}
          />
          <textarea
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            placeholder="Body (EN)"
            rows={4}
            className="block w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            required
            maxLength={2000}
          />
        </div>

        {/* Spanish */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Español
          </p>
          <input
            value={titleEs}
            onChange={(e) => setTitleEs(e.target.value)}
            placeholder="Título (ES)"
            className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            required
            maxLength={200}
          />
          <textarea
            value={bodyEs}
            onChange={(e) => setBodyEs(e.target.value)}
            placeholder="Cuerpo (ES)"
            rows={4}
            className="block w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            required
            maxLength={2000}
          />
        </div>
      </div>

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
            className="mt-1.5 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      <label className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={smsBlast}
          onChange={(e) => setSmsBlast(e.target.checked)}
          disabled
          className="h-3.5 w-3.5 rounded border-border accent-primary"
        />
        Send SMS to opted-in residents
        <span className="ml-auto text-[10px] uppercase tracking-wider">
          enabled when Twilio is connected
        </span>
      </label>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2">
        <AnimatePresence>
          {toast && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 text-xs text-success"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {toast}
            </motion.span>
          )}
        </AnimatePresence>
        <button
          type="submit"
          disabled={pending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:translate-y-[-1px] disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {pending ? 'Publishing…' : 'Publish announcement'}
        </button>
      </div>
    </form>
  );
}
