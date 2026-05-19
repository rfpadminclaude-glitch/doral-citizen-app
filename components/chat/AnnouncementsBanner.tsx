'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Info, Megaphone, X, Zap } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Announcement = {
  id: string;
  title_en: string;
  title_es: string;
  body_en: string;
  body_es: string;
  severity: 'info' | 'warning' | 'urgent';
  publish_at: string;
  expires_at: string | null;
};

const STORAGE_KEY = 'doral.announcement.dismissed.v1';

const SEVERITY_STYLE: Record<Announcement['severity'], { tone: string; icon: React.ReactNode }> = {
  info: {
    tone: 'border-primary/30 bg-primary/8 text-foreground',
    icon: <Info className="h-4 w-4 text-primary" />
  },
  warning: {
    tone: 'border-gold/40 bg-gold/8 text-foreground',
    icon: <AlertTriangle className="h-4 w-4 text-gold" />
  },
  urgent: {
    tone: 'border-destructive/40 bg-destructive/8 text-foreground',
    icon: <Zap className="h-4 w-4 text-destructive" />
  }
};

export function AnnouncementsBanner() {
  const locale = useLocale() as 'en' | 'es';
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  // Hydrate dismissed list once.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setDismissed(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore
    }
  }, []);

  const persistDismissed = useCallback((s: Set<string>) => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s)));
    } catch {
      // ignore
    }
  }, []);

  // Initial load + realtime subscription.
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function load() {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('announcements')
        .select('id, title_en, title_es, body_en, body_es, severity, publish_at, expires_at')
        .lte('publish_at', now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('publish_at', { ascending: false })
        .limit(5);
      if (mounted) setItems((data as Announcement[]) ?? []);
    }
    load();

    const channel = supabase
      .channel('announcements-banner')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          const row = payload.new as Announcement;
          if (!mounted) return;
          setItems((prev) => [row, ...prev.filter((r) => r.id !== row.id)].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistDismissed(next);
      return next;
    });
  }

  const visible = items.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="mb-3 space-y-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {visible.map((a) => {
          const style = SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.info;
          const title = locale === 'es' ? a.title_es : a.title_en;
          const body = locale === 'es' ? a.body_es : a.body_en;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              role="alert"
              className={cn(
                'flex items-start gap-3 rounded-2xl border bg-surface-2/70 px-4 py-3 shadow-soft backdrop-blur',
                style.tone
              )}
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface">
                {style.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Megaphone className="h-3 w-3" />
                    {a.severity}
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(a.id)}
                aria-label="Dismiss announcement"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
