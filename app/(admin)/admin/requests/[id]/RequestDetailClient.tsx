'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Construction,
  FileText,
  FileWarning,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquare,
  Save,
  TreePine
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { caseCodeFromUuid, relativeTime } from '@/lib/admin/format';
import { cn } from '@/lib/utils';

type Status = 'new' | 'in_progress' | 'resolved' | 'closed';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

export type RequestDetail = {
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

export type AuditEntry = {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
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

export function RequestDetailClient({
  request,
  history: initialHistory
}: {
  request: RequestDetail;
  history: AuditEntry[];
}) {
  const t = useTranslations('admin.requests');
  const router = useRouter();
  const [status, setStatus] = useState<Status>(request.status);
  const [priority, setPriority] = useState<Priority>(request.priority);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [history, setHistory] = useState(initialHistory);
  const [, startTransition] = useTransition();

  const dirty =
    status !== request.status || priority !== request.priority || note.trim().length > 0;

  const Icon = TYPE_ICON[request.request_type] ?? ClipboardCheck;

  async function save() {
    setError(null);
    setToast(null);
    setPending(true);
    try {
      const payload: Record<string, unknown> = {};
      if (status !== request.status) payload.status = status;
      if (priority !== request.priority) payload.priority = priority;
      if (note.trim()) payload.notes = note.trim();
      const resp = await fetch(`/api/admin/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(data?.detail || data?.error || t('errSave'));
        return;
      }
      setToast(t('savedToast'));
      // Optimistically prepend a synthetic audit row so the user sees their
      // change immediately. router.refresh() then pulls the real rows.
      const now = new Date().toISOString();
      const synthetic: AuditEntry[] = [];
      if (payload.status) {
        synthetic.push({
          id: `temp-status-${now}`,
          action: 'service_request.status_changed',
          metadata: { from: request.status, to: payload.status },
          created_at: now
        });
      }
      if (payload.priority) {
        synthetic.push({
          id: `temp-priority-${now}`,
          action: 'service_request.priority_changed',
          metadata: { from: request.priority, to: payload.priority },
          created_at: now
        });
      }
      if (payload.notes) {
        synthetic.push({
          id: `temp-note-${now}`,
          action: 'service_request.note_added',
          metadata: { note: payload.notes },
          created_at: now
        });
      }
      setHistory((h) => [...synthetic, ...h]);
      setNote('');
      window.setTimeout(() => setToast(null), 2500);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link
        href="/admin/requests"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('back')}
      </Link>

      <header className="rounded-2xl border border-border bg-surface-2 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                {caseCodeFromUuid(request.id)}
              </span>
              <span className="rounded bg-surface px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {request.request_type.replace('_', ' ')}
              </span>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                  STATUS_TONE[status]
                )}
              >
                {t(
                  status === 'in_progress'
                    ? 'statusInProgress'
                    : status === 'new'
                    ? 'statusNew'
                    : status === 'resolved'
                    ? 'statusResolved'
                    : 'statusClosed'
                )}
              </span>
            </div>
            <h1 className="mt-2 text-lg font-semibold text-foreground">{request.title}</h1>
            <p className="mt-2 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{t('contact')}:</span>{' '}
              {request.resident_name ?? '—'} · {request.resident_contact ?? '—'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t('createdAt')} {relativeTime(request.created_at)} · {t('updatedAt')}{' '}
              {relativeTime(request.updated_at)}
            </p>
          </div>
        </div>
      </header>

      {/* Description */}
      {request.description && (
        <section className="rounded-2xl border border-border bg-surface-2 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('description')}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
            {request.description}
          </p>
        </section>
      )}

      {/* Status + priority + add-note (single form) */}
      <section className="space-y-4 rounded-2xl border border-border bg-surface-2 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('changeStatus')}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="block w-full cursor-pointer rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="new">{t('statusNew')}</option>
              <option value="in_progress">{t('statusInProgress')}</option>
              <option value="resolved">{t('statusResolved')}</option>
              <option value="closed">{t('statusClosed')}</option>
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="block w-full cursor-pointer rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="low">{t('priorityLow')}</option>
              <option value="normal">{t('priorityNormal')}</option>
              <option value="high">{t('priorityHigh')}</option>
              <option value="urgent">{t('priorityUrgent')}</option>
            </select>
          </Field>
        </div>

        <Field label={t('notesSection')}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t('notePlaceholder')}
            className="block w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">{note.length}/2000</p>
        </Field>

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

        <div className="flex items-center justify-end gap-2">
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
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:translate-y-[-1px] disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {pending ? t('saving') : t('save')}
          </button>
        </div>
      </section>

      {/* Activity history */}
      <section className="rounded-2xl border border-border bg-surface-2 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('history')}
        </p>
        {history.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">{t('noHistory')}</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {history.map((h) => (
              <li key={h.id} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">{renderAction(h)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {relativeTime(h.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function renderAction(h: AuditEntry): React.ReactNode {
  const meta = h.metadata as { from?: string; to?: string; note?: string };
  if (h.action === 'service_request.status_changed') {
    return (
      <>
        Status: <span className="font-mono">{meta.from ?? '—'}</span> →{' '}
        <span className="font-mono">{meta.to ?? '—'}</span>
      </>
    );
  }
  if (h.action === 'service_request.priority_changed') {
    return (
      <>
        Priority: <span className="font-mono">{meta.from ?? '—'}</span> →{' '}
        <span className="font-mono">{meta.to ?? '—'}</span>
      </>
    );
  }
  if (h.action === 'service_request.note_added') {
    return (
      <>
        <MessageSquare className="mr-1 inline-block h-3 w-3" aria-hidden="true" />
        {meta.note}
      </>
    );
  }
  if (h.action === 'service_request.created') {
    return <>Request created</>;
  }
  return h.action;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
