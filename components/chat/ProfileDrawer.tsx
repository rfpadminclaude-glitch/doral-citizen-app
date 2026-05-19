'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, Loader2, Mail, Phone, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cn } from '@/lib/utils';

type Profile = {
  name: string;
  email: string;
  phone: string;
  lang: 'en' | 'es';
  announcement_opt_in: boolean;
  avatar: string;
};

const AVATAR_CHOICES = ['🙂', '😎', '🌴', '🌊', '🦩', '⚽', '🛍️', '🌞'];

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  initial?: Partial<Profile>;
  onSaved: (p: Profile) => void;
};

export function ProfileDrawer({ open, onClose, sessionId, initial, onSaved }: Props) {
  const [profile, setProfile] = useState<Profile>({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    lang: (initial?.lang as 'en' | 'es') ?? 'en',
    announcement_opt_in: initial?.announcement_opt_in ?? false,
    avatar: initial?.avatar ?? '🙂'
  });
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When the drawer opens, fetch the latest from the server so the form
  // always reflects ground truth.
  useEffect(() => {
    if (!open) {
      setSaved(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/chat/profile?session_id=${encodeURIComponent(sessionId)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (cancelled) return;
        setProfile((p) => ({
          name: data.name ?? p.name,
          email: data.email ?? p.email,
          phone: data.phone ?? p.phone,
          lang: (data.lang as 'en' | 'es') ?? p.lang,
          announcement_opt_in: !!data.announcement_opt_in,
          avatar: data.avatar ?? p.avatar
        }));
      } catch {
        // ignore — initial state remains
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sessionId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const resp = await fetch('/api/chat/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          name: profile.name.trim() || null,
          email: profile.email.trim() || null,
          phone: profile.phone.trim() || null,
          lang: profile.lang,
          announcement_opt_in: profile.announcement_opt_in,
          avatar: profile.avatar
        })
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data?.error ?? `HTTP ${resp.status}`);
        return;
      }
      setSaved(true);
      onSaved(profile);
      setTimeout(() => onClose(), 750);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-label="Close"
            className="absolute inset-0 z-20 bg-foreground/30 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
            className="absolute inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-border bg-surface shadow-glass"
          >
            <div className="doral-gradient-bar-animated h-1.5 w-full" aria-hidden="true" />
            <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </span>
                <h2 id="profile-title" className="text-sm font-semibold text-foreground">
                  Your profile
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
              <div className="scroll-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {/* Avatar */}
                <Field label="Avatar">
                  <div role="radiogroup" aria-label="Avatar emoji" className="flex flex-wrap gap-1.5">
                    {AVATAR_CHOICES.map((e) => {
                      const active = profile.avatar === e;
                      return (
                        <button
                          key={e}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setProfile((p) => ({ ...p, avatar: e }))}
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            active
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-surface hover:border-primary/40'
                          )}
                        >
                          {e}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Name */}
                <Field label="Name" htmlFor="profile-name">
                  <div className="field-ring flex items-center gap-2 px-3 py-2">
                    <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <input
                      id="profile-name"
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Your first name"
                      maxLength={120}
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      autoComplete="given-name"
                    />
                  </div>
                </Field>

                {/* Email */}
                <Field label="Email" htmlFor="profile-email">
                  <div className="field-ring flex items-center gap-2 px-3 py-2">
                    <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <input
                      id="profile-email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com"
                      maxLength={160}
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      autoComplete="email"
                    />
                  </div>
                </Field>

                {/* Phone */}
                <Field label="Phone" htmlFor="profile-phone">
                  <div className="field-ring flex items-center gap-2 px-3 py-2">
                    <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <input
                      id="profile-phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 305 555 0123"
                      maxLength={40}
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      autoComplete="tel"
                    />
                  </div>
                </Field>

                {/* Language */}
                <Field label="Language">
                  <SegmentedControl<'en' | 'es'>
                    ariaLabel="Language"
                    value={profile.lang}
                    onChange={(v) => setProfile((p) => ({ ...p, lang: v }))}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'es', label: 'Español' }
                    ]}
                    size="sm"
                  />
                </Field>

                {/* Announcement opt-in */}
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-surface px-3 py-3 transition hover:border-primary/40">
                  <input
                    type="checkbox"
                    checked={profile.announcement_opt_in}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, announcement_opt_in: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Bell className="h-3.5 w-3.5 text-primary" />
                      Receive announcements
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      Get notified about city alerts and event updates.
                    </span>
                  </span>
                </label>

                {error && (
                  <p role="alert" className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-surface-2/60 px-4 py-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:translate-y-[-1px] disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : saved ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}
                  {pending ? 'Saving…' : saved ? 'Saved' : 'Save'}
                </button>
              </footer>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
