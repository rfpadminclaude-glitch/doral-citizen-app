'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DORAL_FACTS } from '@/lib/chat/doral-facts';
import { cn } from '@/lib/utils';

type Props = {
  lang: 'en' | 'es';
  intervalMs?: number;
};

const STRINGS = {
  en: { eyebrow: 'Did you know?' },
  es: { eyebrow: '¿Sabías que?' }
} as const;

export function IdleEntertainment({ lang, intervalMs = 6000 }: Props) {
  const [index, setIndex] = useState(0);
  const eyebrow = STRINGS[lang].eyebrow;

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % DORAL_FACTS.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  const fact = DORAL_FACTS[index];
  const copy = lang === 'es' ? fact.es : fact.en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-secondary/5 to-gold/5 p-4 shadow-soft"
      aria-live="polite"
      role="status"
    >
      {/* Decorative pulse — top-right corner */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/15 blur-2xl animate-pulse-soft"
      />

      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <Sparkles className="h-4 w-4 animate-pulse-soft" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={fact.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <p className="mt-0.5 text-sm font-semibold text-foreground">{copy.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress dots */}
      <div className="mt-3 flex items-center gap-1">
        {DORAL_FACTS.map((f, i) => (
          <span
            key={f.id}
            aria-hidden="true"
            className={cn(
              'h-1 rounded-full transition-all duration-300',
              i === index ? 'w-6 bg-primary' : 'w-1 bg-primary/30'
            )}
          />
        ))}
      </div>
    </motion.div>
  );
}
