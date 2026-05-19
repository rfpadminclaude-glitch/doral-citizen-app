'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Library, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { relativeTime } from '@/lib/admin/format';
import { cn } from '@/lib/utils';

type DocRow = {
  id: string;
  source_url: string;
  source_domain: string;
  title: string | null;
  lang: 'en' | 'es';
  last_scraped_at: string | null;
  is_active: boolean;
  chunk_count: number;
};

type LangFilter = 'all' | 'en' | 'es';
type StatusFilter = 'all' | 'active' | 'inactive';

export function KnowledgeClient({ docs }: { docs: DocRow[] }) {
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState<LangFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (lang !== 'all' && d.lang !== lang) return false;
      if (status === 'active' && !d.is_active) return false;
      if (status === 'inactive' && d.is_active) return false;
      if (!q) return true;
      return (
        (d.title ?? '').toLowerCase().includes(q) ||
        d.source_url.toLowerCase().includes(q) ||
        d.source_domain.toLowerCase().includes(q)
      );
    });
  }, [docs, query, lang, status]);

  const totalChunks = docs.reduce((sum, d) => sum + d.chunk_count, 0);
  const activeCount = docs.filter((d) => d.is_active).length;
  const latestIndexed = docs
    .map((d) => d.last_scraped_at)
    .filter((s): s is string => !!s)
    .sort()
    .at(-1);

  return (
    <>
      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Documents" value={`${activeCount} / ${docs.length}`} hint="active / total" />
        <Kpi label="Chunks" value={totalChunks.toLocaleString()} hint="embedded vectors" />
        <Kpi label="Last indexed" value={latestIndexed ? relativeTime(latestIndexed) : '—'} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 focus-within:border-primary">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by topic, title, or URL…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search knowledge base"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPills
          label="Language"
          value={lang}
          onChange={setLang}
          options={[
            { value: 'all', label: 'All' },
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Español' }
          ]}
        />
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        <FilterPills
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]}
        />
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        {docs.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No documents match your filters.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {filtered.map((d) => (
                <motion.li
                  key={d.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Link
                    href={`/admin/knowledge/${d.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface focus-visible:outline-none focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Library className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {d.title ?? 'Untitled'}
                        </span>
                        <span className="rounded bg-surface px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {d.lang}
                        </span>
                        {!d.is_active && (
                          <span className="rounded bg-muted px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            inactive
                          </span>
                        )}
                        <span className="rounded bg-surface px-1.5 text-[10px] text-muted-foreground">
                          {d.chunk_count} chunks
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {d.source_url}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        last indexed {relativeTime(d.last_scraped_at)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{hint}</p>}
    </div>
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">No documents yet</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Seed the knowledge base with{' '}
          <code className="rounded bg-surface px-1">npx tsx scripts/seed-and-embed.ts</code>.
        </p>
      </div>
    </div>
  );
}
