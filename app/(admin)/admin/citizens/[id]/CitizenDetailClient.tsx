'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Mail, MapPin, Phone, Save, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Neighborhood } from '@/lib/geo/neighborhoods';
import { cn } from '@/lib/utils';

const CitizenMapPicker = dynamic(
  () => import('@/components/admin/citizens/CitizenMapPicker').then((m) => m.CitizenMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] w-full items-center justify-center rounded-2xl border border-border bg-surface-2 text-xs text-muted-foreground">
        Loading map…
      </div>
    )
  }
);

type Citizen = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address_line: string | null;
  lat: number | null;
  lng: number | null;
  neighborhood_slug: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type RequestRow = {
  id: string;
  title: string;
  request_type: string;
  status: string;
  priority: string;
  created_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  new: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#22c55e',
  closed: '#22c55e'
};

export function CitizenDetailClient({
  citizen: initial,
  requests,
  neighborhoods
}: {
  citizen: Citizen;
  requests: RequestRow[];
  neighborhoods: Neighborhood[];
}) {
  const t = useTranslations('admin.citizens');
  const router = useRouter();

  const [citizen, setCitizen] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const neighborhoodName = useMemo(
    () =>
      citizen.neighborhood_slug
        ? neighborhoods.find((n) => n.slug === citizen.neighborhood_slug)?.name ??
          citizen.neighborhood_slug
        : '—',
    [citizen.neighborhood_slug, neighborhoods]
  );

  function startEdit() {
    setDraft(citizen);
    setEditing(true);
    setError(null);
  }
  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch(`/api/admin/citizens/${citizen.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          phone: draft.phone || null,
          email: draft.email || null,
          address_line: draft.address_line || null,
          lat: draft.lat,
          lng: draft.lng,
          notes: draft.notes || null
        })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(data?.detail || data?.error || t('errSave'));
        return;
      }
      setCitizen(draft);
      setEditing(false);
      setToast(t('savedToast'));
      window.setTimeout(() => setToast(null), 2000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    setDeleting(true);
    setError(null);
    try {
      const resp = await fetch(`/api/admin/citizens/${citizen.id}`, { method: 'DELETE' });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(data?.detail || data?.error || t('errDelete'));
        return;
      }
      router.push('/admin/citizens');
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4 rounded-2xl border border-border bg-surface-2 p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            {editing ? (
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            ) : (
              <h2 className="text-2xl font-semibold text-foreground">{citizen.name}</h2>
            )}
            <div className="flex shrink-0 items-center gap-1.5">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving ? t('saving') : t('save')}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t('cancel')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t('edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-destructive transition hover:border-destructive/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('delete')}
                  </button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field icon={<Phone className="h-3 w-3" />} label={t('fieldPhone')}>
              {editing ? (
                <input
                  type="tel"
                  value={draft.phone ?? ''}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  className="block w-full rounded-md border border-border bg-surface px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              ) : (
                citizen.phone ?? '—'
              )}
            </Field>
            <Field icon={<Mail className="h-3 w-3" />} label={t('fieldEmail')}>
              {editing ? (
                <input
                  type="email"
                  value={draft.email ?? ''}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  className="block w-full rounded-md border border-border bg-surface px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              ) : (
                citizen.email ?? '—'
              )}
            </Field>
            <Field icon={<MapPin className="h-3 w-3" />} label={t('fieldAddress')}>
              {editing ? (
                <input
                  type="text"
                  value={draft.address_line ?? ''}
                  onChange={(e) => setDraft({ ...draft, address_line: e.target.value })}
                  className="block w-full rounded-md border border-border bg-surface px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              ) : (
                citizen.address_line ?? '—'
              )}
            </Field>
            <Field icon={<MapPin className="h-3 w-3" />} label={t('fieldNeighborhood')}>
              {neighborhoodName}
            </Field>
            <Field label={t('fieldCoords')}>
              {citizen.lat != null && citizen.lng != null
                ? `${citizen.lat.toFixed(5)}, ${citizen.lng.toFixed(5)}`
                : t('coordsMissing')}
            </Field>
            <Field label={t('fieldSource')}>{citizen.source ?? '—'}</Field>
          </dl>

          {toast && (
            <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
              {toast}
            </div>
          )}
        </section>

        <aside className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-soft">
          {citizen.lat != null && citizen.lng != null ? (
            <CitizenMapPicker
              value={editing ? { lat: draft.lat ?? 0, lng: draft.lng ?? 0 } : { lat: citizen.lat, lng: citizen.lng }}
              onChange={(latlng) => {
                if (editing) setDraft({ ...draft, lat: latlng.lat, lng: latlng.lng });
              }}
              neighborhoods={neighborhoods}
              height={280}
            />
          ) : (
            <div className="flex h-[280px] items-center justify-center p-4 text-center text-xs text-muted-foreground">
              {t('coordsMissing')}
            </div>
          )}
        </aside>
      </div>

      <section className="rounded-2xl border border-border bg-surface-2 p-5 shadow-soft">
        <h3 className="text-sm font-semibold text-foreground">{t('requestsTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('requestsSubtitle', { count: requests.length })}</p>
        {requests.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-surface px-3 py-6 text-center text-xs text-muted-foreground">
            {t('noRequests')}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {requests.map((r) => (
              <li key={r.id} className="py-2.5">
                <Link
                  href={`/admin/requests/${r.id}`}
                  className="flex items-start gap-3 transition hover:text-primary focus-visible:outline-none focus-visible:underline"
                >
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: STATUS_COLOR[r.status] ?? '#94a3b8' }}
                  />
                  <span className="flex-1 truncate text-sm text-foreground">{r.title}</span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {r.request_type.replace('_', ' ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-2 p-5 shadow-glass">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground">{t('deleteConfirm')}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('deleteConfirmHint', { count: requests.length, name: citizen.name })}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={deleting}
                className={cn(
                  'rounded-full bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive'
                )}
              >
                {deleting ? t('deleting') : t('deleteConfirmCta')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  icon,
  label,
  children
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}
