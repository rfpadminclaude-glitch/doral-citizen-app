'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, MessageSquare, Search, User } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { relativeTime, sentimentClass } from '@/lib/admin/format';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  session_id: string;
  channel: string;
  lang: string;
  resident_name: string | null;
  overall_sentiment: string | null;
  last_activity_at: string | null;
  msg_count: number;
};

function anonLabel(sessionId: string): string {
  return `Anonymous resident #${sessionId.slice(0, 6).toUpperCase()}`;
}

export function ConversationsClient({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.resident_name ?? anonLabel(r.session_id)).toLowerCase();
      return name.includes(q) || r.session_id.toLowerCase().includes(q);
    });
  }, [rows, query]);

  return (
    <>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 focus-within:border-primary">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or session id…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          aria-label="Search conversations"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">No conversations yet</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Ask the assistant something on the resident chat to populate this list.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No conversations match your search.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {filtered.map((c) => {
                const name = c.resident_name ?? anonLabel(c.session_id);
                const isAnon = !c.resident_name;
                return (
                  <motion.li
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Link
                      href={`/admin/conversations/${c.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface focus-visible:outline-none focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                          isAnon ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                        )}
                      >
                        {isAnon ? <MessageSquare className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'truncate text-sm font-medium',
                              isAnon ? 'text-muted-foreground' : 'text-foreground'
                            )}
                          >
                            {name}
                          </span>
                          <span className="rounded bg-surface px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {c.channel}
                          </span>
                          <span className="rounded bg-surface px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {c.lang}
                          </span>
                          {c.overall_sentiment && (
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                                sentimentClass[c.overall_sentiment] ?? sentimentClass.neutral
                              )}
                            >
                              {c.overall_sentiment}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          {c.session_id}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {relativeTime(c.last_activity_at)} · {c.msg_count} msgs
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </>
  );
}
