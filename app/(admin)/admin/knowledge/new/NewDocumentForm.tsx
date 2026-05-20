'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste,
  FileUp,
  Library,
  Link2,
  Loader2,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type Mode = 'manual' | 'url' | 'file';
type Lang = 'en' | 'es';

const MAX_FILE_MB = 5;

export function NewDocumentForm() {
  const router = useRouter();
  const t = useTranslations('admin.knowledge.new');

  const [mode, setMode] = useState<Mode>('manual');
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState<Lang>('en');
  const [sourceUrl, setSourceUrl] = useState('');
  const [active, setActive] = useState(true);

  const [body, setBody] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; chunks: number } | null>(null);

  function clientValidate(): string | null {
    if (!title.trim()) return t('errTitleRequired');
    if (mode === 'manual') {
      if (body.trim().length < 10) return t('errBodyRequired');
    } else if (mode === 'url') {
      if (!/^https?:\/\//i.test(targetUrl.trim())) return t('errUrlRequired');
    } else {
      if (!file) return t('errFileRequired');
      if (file.size > MAX_FILE_MB * 1024 * 1024) return t('errFile');
    }
    return null;
  }

  function mapServerError(json: { error?: string; detail?: string } | null): string {
    const e = (json?.error ?? '').toLowerCase();
    if (e === 'too_large') return t('errTooLarge');
    if (e === 'no_text') return t('errEmpty');
    if (e.includes('fetch')) return t('errFetch');
    if (e.includes('file') || e.includes('pdf') || e.includes('docx')) return t('errFile');
    return json?.detail ?? json?.error ?? t('errGeneric');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const localErr = clientValidate();
    if (localErr) {
      setError(localErr);
      return;
    }
    setPending(true);
    try {
      const form = new FormData();
      form.set('mode', mode);
      form.set('title', title.trim());
      form.set('lang', lang);
      form.set('is_active', String(active));
      if (sourceUrl.trim()) form.set('source_url', sourceUrl.trim());
      if (mode === 'manual') form.set('body', body);
      if (mode === 'url') form.set('target_url', targetUrl.trim());
      if (mode === 'file' && file) form.set('file', file);

      const resp = await fetch('/api/admin/documents', { method: 'POST', body: form });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(mapServerError(data));
        return;
      }
      setSuccess({ id: data.id, chunks: data.chunks });
      // Brief pause to show the success state, then send the admin to the edit
      // page for the new doc — same destination they'd land on from the list.
      setTimeout(() => router.push(`/admin/knowledge/${data.id}`), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <Link
          href="/admin/knowledge"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('back')}
        </Link>
      </div>

      <header className="rounded-2xl border border-border bg-surface-2 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Library className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {t('back').toUpperCase()}
            </p>
            <h1 className="text-base font-semibold text-foreground">{t('title')}</h1>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t('subtitle')}</p>
      </header>

      {/* Mode tabs */}
      <div
        role="tablist"
        aria-label="Input mode"
        className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-surface-2 p-1.5"
      >
        <ModeTab
          mode="manual"
          current={mode}
          onClick={() => setMode('manual')}
          icon={<ClipboardPaste className="h-3.5 w-3.5" />}
          label={t('modePaste')}
        />
        <ModeTab
          mode="url"
          current={mode}
          onClick={() => setMode('url')}
          icon={<Link2 className="h-3.5 w-3.5" />}
          label={t('modeUrl')}
        />
        <ModeTab
          mode="file"
          current={mode}
          onClick={() => setMode('file')}
          icon={<FileUp className="h-3.5 w-3.5" />}
          label={t('modeFile')}
        />
      </div>

      {/* Common fields */}
      <Field label={t('titleField')} htmlFor="doc-title">
        <input
          id="doc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('titlePlaceholder')}
          required
          maxLength={200}
          className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('lang')}>
          <div role="radiogroup" aria-label={t('lang')} className="inline-flex gap-1.5">
            {(['en', 'es'] as const).map((v) => {
              const isOn = lang === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={isOn}
                  onClick={() => setLang(v)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    isOn
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {v === 'en' ? 'English' : 'Español'}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={t('sourceUrl')} htmlFor="doc-source-url">
          <input
            id="doc-source-url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder={t('sourceUrlPlaceholder')}
            maxLength={2000}
            className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />
        </Field>
      </div>

      {/* Mode-specific body */}
      {mode === 'manual' && (
        <Field label={t('body')} htmlFor="doc-body">
          <textarea
            id="doc-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('bodyPlaceholder')}
            rows={14}
            maxLength={50_000}
            className="block w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            {body.length.toLocaleString()} / 50,000 chars
          </p>
        </Field>
      )}

      {mode === 'url' && (
        <Field label={t('urlField')} htmlFor="doc-target-url">
          <input
            id="doc-target-url"
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://cityofdoral.com/..."
            className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">{t('urlHint')}</p>
        </Field>
      )}

      {mode === 'file' && (
        <Field label={t('fileField')} htmlFor="doc-file">
          <label
            htmlFor="doc-file"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-4 py-6 transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileUp className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-foreground">
                {file ? file.name : t('filePicker')}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB`
                  : t('fileField')}
              </span>
            </span>
          </label>
          <input
            id="doc-file"
            type="file"
            accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
      )}

      {/* Active checkbox */}
      <Field label="">
        <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          {t('active')}
        </label>
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

      <div className="flex items-center justify-between gap-2">
        <AnimatePresence>
          {success && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 text-xs text-success"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('successToast', { count: success.chunks })}
            </motion.span>
          )}
        </AnimatePresence>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:translate-y-[-1px] disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            !success && 'ml-auto'
          )}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {pending ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}

function ModeTab({
  mode,
  current,
  onClick,
  icon,
  label
}: {
  mode: Mode;
  current: Mode;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  const active = mode === current;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        active
          ? 'bg-primary text-primary-foreground shadow-soft'
          : 'text-muted-foreground hover:bg-surface hover:text-foreground'
      )}
    >
      {icon}
      {label}
    </button>
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
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
      )}
      <div className={label ? 'mt-1.5' : ''}>{children}</div>
    </div>
  );
}
