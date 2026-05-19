'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Megaphone, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AnnouncementComposeDrawer } from '@/components/admin/AnnouncementComposeDrawer';
import { relativeTime } from '@/lib/admin/format';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  title_en: string;
  title_es: string;
  body_en: string;
  body_es: string;
  severity: 'info' | 'warning' | 'urgent';
  publish_at: string;
  expires_at: string | null;
};

type StatusFilter = 'all' | 'active' | 'expired';
type SeverityFilter = 'all' | 'info' | 'warning' | 'urgent';

const SEVERITY_TONE: Record<string, string> = {
  info: 'bg-primary/10 text-primary',
  warning: 'bg-gold/15 text-gold',
  urgent: 'bg-destructive/15 text-destructive'
};

export function AnnouncementsClient({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [composeOpen, setComposeOpen] = useState(false);

  const now = Date.now();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const expired = r.expires_at ? new Date(r.expires_at).getTime() < now : false;
      if (status === 'active' && expired) return false;
      if (status === 'expired' && !expired) return false;
      if (severity !== 'all' && r.severity !== severity) return false;
      if (!q) return true;
      return (
        r.title_en.toLowerCase().includes(q) ||
        r.title_es.toLowerCase().includes(q) ||
        r.body_en.toLowerCase().includes(q) ||
        r.body_es.toLowerCase().includes(q)
      );
    });
  }, [rows, query, status, severity, now]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 focus-within:border-primary">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search announcements…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="Search announcements"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="h-4 w-4" />
          New announcement
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterPills
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' }
          ]}
        />
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        <FilterPills
          label="Severity"
          value={severity}
          onChange={setSeverity}
          options={[
            { value: 'all', label: 'All' },
            { value: 'info', label: 'Info' },
            { value: 'warning', label: 'Warning' },
            { value: 'urgent', label: 'Urgent' }
          ]}
        />
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        {rows.length === 0 ? (
          <EmptyState onCompose={() => setComposeOpen(true)} />
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No announcements match your search.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {filtered.map((r) => {
                const expired = r.expires_at && new Date(r.expires_at).getTime() < now;
                return (
                  <motion.li
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          SEVERITY_TONE[r.severity] ?? SEVERITY_TONE.info
                        )}
                      >
                        <Megaphone className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-foreground">
                            {r.title_en}
                          </span>
                          <span className="rounded bg-surface px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {r.severity}
                          </span>
                          {expired ? (
                            <span className="rounded bg-muted px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                              expired
                            </span>
                          ) : (
                            <span className="rounded bg-success/15 px-1.5 text-[10px] uppercase tracking-wider text-success">
                              active
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {r.body_en}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          published {relativeTime(r.publish_at)}
                          {r.expires_at && <> · expires {new Date(r.expires_at).toLocaleString()}</>}
                        </p>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <AnnouncementComposeDrawer open={composeOpen} onClose={() => setComposeOpen(false)} />
    </>
  );
}

function FilterPills<T extends string>({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Megaphone className="h-6 w-6" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">No announcements yet</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Publish your first announcement — it will appear in every active resident chat instantly.
        </p>
      </div>
      <button
        type="button"
        onClick={onCompose}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Plus className="h-4 w-4" />
        Compose announcement
      </button>
    </div>
  );
}
