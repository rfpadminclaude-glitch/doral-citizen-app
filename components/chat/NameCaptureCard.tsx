'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  sessionId: string;
  lang: 'en' | 'es';
  onSaved: (name: string) => void;
  onSkip: () => void;
};

const STRINGS = {
  en: {
    title: 'Want a more personal touch?',
    subtitle: 'Tell me your first name and I can use it in the conversation. Totally optional.',
    placeholder: 'Your first name',
    save: 'Save',
    saving: 'Saving…',
    skip: 'Skip',
    error: "We couldn't save that. Please try again."
  },
  es: {
    title: '¿Quieres un toque más personal?',
    subtitle: 'Dime tu nombre y lo usaré en la conversación. Es totalmente opcional.',
    placeholder: 'Tu nombre',
    save: 'Guardar',
    saving: 'Guardando…',
    skip: 'Omitir',
    error: 'No pudimos guardarlo. Inténtalo de nuevo.'
  }
} as const;

export function NameCaptureCard({ sessionId, lang, onSaved, onSkip }: Props) {
  const s = STRINGS[lang];
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setPending(true);
    try {
      const resp = await fetch('/api/chat/identify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, name: trimmed })
      });
      if (!resp.ok) {
        setError(s.error);
        return;
      }
      onSaved(trimmed);
    } catch {
      setError(s.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.form
        onSubmit={save}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="self-start w-full max-w-[420px] rounded-2xl border border-border bg-surface-2/70 p-4 shadow-soft"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
              <p className="text-xs text-muted-foreground">{s.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSkip}
            aria-label={s.skip}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-end gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={s.placeholder}
            maxLength={120}
            autoComplete="given-name"
            className="block flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground shadow-soft transition hover:translate-y-[-1px]',
              'disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            )}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {pending ? s.saving : s.save}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onSkip}
          className="mt-2 text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
        >
          {s.skip}
        </button>
      </motion.form>
    </AnimatePresence>
  );
}
