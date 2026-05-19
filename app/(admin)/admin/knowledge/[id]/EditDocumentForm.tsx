'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Library, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Doc = {
  id: string;
  title: string;
  body: string;
  lang: 'en' | 'es';
  source_url: string;
  source_domain: string;
  last_scraped_at: string | null;
  is_active: boolean;
};

export function EditDocumentForm({ doc }: { doc: Doc }) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body);
  const [active, setActive] = useState(doc.is_active);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chunksWritten, setChunksWritten] = useState<number | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setToast(null);
    setChunksWritten(null);
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setPending(true);
    try {
      const resp = await fetch(`/api/admin/documents/${doc.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          is_active: active
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data?.error ?? `HTTP ${resp.status}`);
        return;
      }
      setToast('Saved and re-indexed.');
      setChunksWritten(data.chunks ?? null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <Link
          href="/admin/knowledge"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to documents
        </Link>
      </div>

      <header className="rounded-2xl border border-border bg-surface-2 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Library className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Edit document
            </p>
            <h1 className="text-base font-semibold text-foreground">
              {doc.source_domain} · {doc.lang.toUpperCase()}
            </h1>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Source URL <span className="break-all font-mono">{doc.source_url}</span>
        </p>
      </header>

      {/* Title */}
      <Field label="Title" htmlFor="doc-title">
        <input
          id="doc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        />
      </Field>

      {/* Body */}
      <Field label="Body (markdown)" htmlFor="doc-body">
        <textarea
          id="doc-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={18}
          className="block w-full resize-y rounded-xl border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          {body.length.toLocaleString()} chars · changes re-chunk and re-embed on save
        </p>
      </Field>

      {/* Active */}
      <Field label="Status">
        <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Published (visible to the assistant)
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
          {toast && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1.5 text-xs text-success"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {toast}
              {chunksWritten != null && (
                <span className="text-muted-foreground">· {chunksWritten} chunks</span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:translate-y-[-1px] disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            !toast && 'ml-auto'
          )}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {pending ? 'Re-indexing…' : 'Save & re-index'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
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
