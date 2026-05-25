'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { MapPin, Search, Type } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Neighborhood } from '@/lib/geo/neighborhoods';
import { cn } from '@/lib/utils';

const CitizenMapPicker = dynamic(
  () => import('@/components/admin/citizens/CitizenMapPicker').then((m) => m.CitizenMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] w-full items-center justify-center rounded-2xl border border-border bg-surface-2 text-xs text-muted-foreground">
        Loading map…
      </div>
    )
  }
);

type Mode = 'address' | 'map';

type LatLng = { lat: number; lng: number };

export function NewCitizenForm({ neighborhoods }: { neighborhoods: Neighborhood[] }) {
  const t = useTranslations('admin.citizens');
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('map');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [neighborhoodSlug, setNeighborhoodSlug] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookupAddress() {
    if (!address.trim()) return;
    setGeocoding(true);
    setError(null);
    try {
      const resp = await fetch('/api/admin/citizens/geocode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setError(t('errGeocodeFailed'));
        return;
      }
      setCoords({ lat: data.lat, lng: data.lng });
      setNeighborhoodSlug(data.neighborhood_slug ?? null);
      setAddress(data.display_name ?? address);
    } finally {
      setGeocoding(false);
    }
  }

  async function onMapPlace(latlng: LatLng) {
    setCoords(latlng);
    setError(null);
    // Best-effort reverse geocode to populate the address field.
    try {
      const resp = await fetch('/api/admin/citizens/reverse-geocode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(latlng)
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        if (data.display_name) setAddress(data.display_name);
        setNeighborhoodSlug(data.neighborhood_slug ?? null);
      }
    } catch {
      // ignore — coords are still valid even if reverse geocode fails
    }
  }

  function validate(): string | null {
    if (!name.trim()) return t('errNameRequired');
    if (!phone.trim() && !email.trim()) return t('errContactRequired');
    if (!coords) return t('errCoordsRequired');
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validationErr = validate();
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch('/api/admin/citizens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          address_line: address.trim() || null,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (resp.status === 409) setError(t('errContactConflict'));
        else setError(data?.detail || data?.error || t('errSave'));
        return;
      }
      router.push(`/admin/citizens/${data.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const neighborhoodName =
    neighborhoodSlug
      ? neighborhoods.find((n) => n.slug === neighborhoodSlug)?.name ?? neighborhoodSlug
      : null;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="space-y-3 rounded-2xl border border-border bg-surface-2 p-5 shadow-soft">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('fieldName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('fieldPhone')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 305 555 0123"
                className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('fieldEmail')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="resident@example.com"
                className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">{t('contactHint')}</p>

          <div className="pt-2">
            <div role="tablist" className="inline-flex rounded-full border border-border bg-surface p-0.5">
              {(['map', 'address'] as const).map((m) => {
                const active = mode === m;
                const Icon = m === 'map' ? MapPin : Type;
                return (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMode(m)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {m === 'map' ? t('modeMap') : t('modeAddress')}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('fieldAddress')}
            </label>
            {mode === 'address' ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="11400 NW 58th St, Doral, FL"
                  className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  onClick={lookupAddress}
                  disabled={!address.trim() || geocoding}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Search className="h-3.5 w-3.5" />
                  {geocoding ? t('searching') : t('find')}
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('addressPlaceholderMap')}
                className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            )}
            {mode === 'map' && (
              <p className="mt-1 text-[11px] text-muted-foreground">{t('mapHint')}</p>
            )}
          </div>

          {coords && (
            <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs">
              <p className="font-semibold text-success">{t('locationSet')}</p>
              <p className="mt-0.5 text-foreground">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                {neighborhoodName && (
                  <>
                    {' · '}
                    <span className="text-muted-foreground">{neighborhoodName}</span>
                  </>
                )}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {submitting ? t('submitting') : t('submit')}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-soft">
          <CitizenMapPicker
            value={coords}
            onChange={onMapPlace}
            neighborhoods={neighborhoods}
            height={460}
          />
        </section>
      </div>
    </form>
  );
}
