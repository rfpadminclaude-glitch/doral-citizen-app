'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquarePlus, Search, Trash2, X, History } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { relativeTime, type ChatSessionMeta } from '@/lib/chat/sessions';
import { useFocusTrap } from '@/lib/chat/useFocusTrap';

type Props = {
  open: boolean;
  onClose: () => void;
  sessions: ChatSessionMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
};

export function HistoryDrawer({
  open,
  onClose,
  sessions,
  activeId,
  onSelect,
  onNewChat,
  onDelete
}: Props) {
  const t = useTranslations('chat.historyPanel');
  const [query, setQuery] = useState('');
  const drawerRef = useRef<HTMLElement>(null);
  useFocusTrap(open, drawerRef, onClose);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, query]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-label={t('closeHistory')}
            className="absolute inset-0 z-20 bg-foreground/30 backdrop-blur-sm"
          />

          {/* Drawer panel */}
          <motion.aside
            ref={drawerRef}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="absolute inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-border bg-surface shadow-glass focus-visible:outline-none"
            aria-label={t('title')}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">{t('title')}</h2>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {sessions.length}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={t('closeHistory')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* New chat */}
            <div className="border-b border-border px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <MessageSquarePlus className="h-4 w-4" />
                {t('newChat')}
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-border px-4 py-3">
              <label htmlFor="history-search" className="sr-only">
                {t('searchAria')}
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 focus-within:border-primary">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  id="history-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="scroll-thin flex-1 overflow-y-auto px-2 py-2">
              {filtered.length === 0 && (
                <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                  {sessions.length === 0 ? t('empty') : t('noMatches')}
                </div>
              )}
              <ul className="space-y-1">
                {filtered.map((s) => (
                  <li key={s.id}>
                    <div
                      className={cn(
                        'group flex items-start gap-2 rounded-lg px-3 py-2 transition',
                        s.id === activeId
                          ? 'bg-primary/10'
                          : 'hover:bg-surface-2'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(s.id);
                          onClose();
                        }}
                        className="flex-1 text-left focus-visible:outline-none"
                      >
                        <div
                          className={cn(
                            'truncate text-sm font-medium',
                            s.id === activeId ? 'text-primary' : 'text-foreground'
                          )}
                          title={s.title || t('newChatFallback')}
                        >
                          {s.title || t('newChatFallback')}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{relativeTime(s.lastActivityAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{t('messageCount', { count: s.messageCount })}</span>
                          <span className="rounded bg-surface-2 px-1 text-[10px] uppercase tracking-wider">
                            {s.lang}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t('deleteConfirm'))) onDelete(s.id);
                        }}
                        className="invisible mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:visible focus-visible:visible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                        aria-label={t('deleteConversation')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
              {t('storedLocally')}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
