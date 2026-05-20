'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ClipboardCheck,
  Construction,
  FileText,
  FileWarning,
  MapPin,
  Megaphone,
  TreePine
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import { caseCodeFromUuid, relativeTime } from '@/lib/admin/format';
import { cn } from '@/lib/utils';

type Status = 'new' | 'in_progress' | 'resolved' | 'closed';
type Priority = 'low' | 'normal' | 'high' | 'urgent';
type StatusFilter = 'all' | Status;

export type RequestRow = {
  id: string;
  request_type: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  resident_name: string | null;
  resident_contact: string | null;
  created_at: string;
  updated_at: string;
};

const TYPE_ICON: Record<string, typeof FileText> = {
  permit: FileText,
  code_violation: FileWarning,
  park_issue: TreePine,
  general: MapPin,
  pothole: Construction,
  inspection: ClipboardCheck,
  complaint: Megaphone
};

const STATUS_TONE: Record<Status, string> = {
  new: 'bg-primary/10 text-primary border-primary/30',
  in_progress: 'bg-gold/15 text-gold border-gold/40',
  resolved: 'bg-success/15 text-success border-success/40',
  closed: 'bg-muted text-muted-foreground border-border'
};

const KPI_LABEL: Record<Status, 'kpiNew' | 'kpiInProgress' | 'kpiResolved' | 'kpiClosed'> = {
  new: 'kpiNew',
  in_progress: 'kpiInProgress',
  resolved: 'kpiResolved',
  closed: 'kpiClosed'
};

const FILTER_LABEL: Record<
  StatusFilter,
  'filterAll' | 'filterNew' | 'filterInProgress' | 'filterResolved' | 'filterClosed'
> = {
  all: 'filterAll',
  new: 'filterNew',
  in_progress: 'filterInProgress',
  resolved: 'filterResolved',
  closed: 'filterClosed'
};

const STATUS_LABEL: Record<
  Status,
  'statusNew' | 'statusInProgress' | 'statusResolved' | 'statusClosed'
> = {
  new: 'statusNew',
  in_progress: 'statusInProgress',
  resolved: 'statusResolved',
  closed: 'statusClosed'
};

export function RequestsClient({ rows: initialRows }: { rows: RequestRow[] }) {
  const t = useTranslations('admin.requests');
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts: Record<Status, number> = useMemo(
    () => ({
      new: rows.filter((r) => r.status === 'new').length,
      in_progress: rows.filter((r) => r.status === 'in_progress').length,
      resolved: rows.filter((r) => r.status === 'resolved').length,
      closed: rows.filter((r) => r.status === 'closed').length
    }),
    [rows]
  );

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  async function changeStatus(id: string, status: Status) {
    setPendingId(id);
    setToast(null);
    try {
      const resp = await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setToast(data?.detail || data?.error || t('errSave'));
        return;
      }
      // Optimistic local update + server refresh so KPI counts stay accurate.
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
      setToast(t('savedToast'));
      window.setTimeout(() => setToast(null), 2000);
      startTransition(() => router.refresh());
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['new', 'in_progress', 'resolved', 'closed'] as const).map((s) => (
          <div key={s} className="rounded-2xl border border-border bg-surface-2 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(KPI_LABEL[s])}
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{counts[s]}</p>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div
        role="radiogroup"
        aria-label="Filter by status"
        className="flex flex-wrap items-center gap-1.5"
      >
        {(['all', 'new', 'in_progress', 'resolved', 'closed'] as const).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {t(FILTER_LABEL[f])}
            </button>
          );
        })}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-2 p-12 text-center">
          <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold text-foreground">{t('empty')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {filtered.map((r) => {
              const Icon = TYPE_ICON[r.request_type] ?? ClipboardCheck;
              return (
                <motion.article
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="group rounded-2xl border border-border bg-surface-2 p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-primary">
                          {caseCodeFromUuid(r.id)}
                        </span>
                        <span className="rounded bg-surface px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {r.request_type.replace('_', ' ')}
                        </span>
                        {r.priority && r.priority !== 'normal' && (
                          <span
                            className={cn(
                              'rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                              r.priority === 'urgent' &&
                                'border-destructive/40 bg-destructive/10 text-destructive',
                              r.priority === 'high' &&
                                'border-accent/40 bg-accent/10 text-accent',
                              r.priority === 'low' && 'border-border text-muted-foreground'
                            )}
                          >
                            {r.priority}
                          </span>
                        )}
                        <select
                          value={r.status}
                          onChange={(e) => changeStatus(r.id, e.target.value as Status)}
                          disabled={pendingId === r.id}
                          aria-label={t('changeStatus')}
                          className={cn(
                            'ml-auto cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait',
                            STATUS_TONE[r.status]
                          )}
                        >
                          <option value="new">{t('statusNew')}</option>
                          <option value="in_progress">{t('statusInProgress')}</option>
                          <option value="resolved">{t('statusResolved')}</option>
                          <option value="closed">{t('statusClosed')}</option>
                        </select>
                      </div>
                      <h3 className="mt-2 truncate text-sm font-semibold text-foreground">
                        {r.title}
                      </h3>
                      {r.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {r.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted-foreground">
                          {r.resident_name ?? '—'} · {r.resident_contact ?? '—'} ·{' '}
                          {relativeTime(r.created_at)}
                        </p>
                        <Link
                          href={`/admin/requests/${r.id}`}
                          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:underline"
                        >
                          {t('viewDetails')}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

export { STATUS_LABEL };
