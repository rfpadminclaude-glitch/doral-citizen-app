'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Download, FileJson, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export type ExportMessage = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  sentiment?: string | null;
  llm_provider?: string | null;
  latency_ms?: number | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
};

export type ExportSummary = {
  session_id: string;
  resident_name: string | null;
  channel: string;
  lang: string;
  status: string;
  started_at: string;
  last_activity_at: string;
};

type Props = {
  conversationId: string;
  summary: ExportSummary;
  messages: ExportMessage[];
};

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function toMarkdown(summary: ExportSummary, messages: ExportMessage[]): string {
  const lines: string[] = [];
  const title = summary.resident_name ?? `Anonymous resident #${summary.session_id.slice(0, 6).toUpperCase()}`;
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`- Session: \`${summary.session_id}\``);
  lines.push(`- Channel: ${summary.channel} · Lang: ${summary.lang} · Status: ${summary.status}`);
  lines.push(`- Started: ${summary.started_at}`);
  lines.push(`- Last activity: ${summary.last_activity_at}`);
  lines.push('');
  for (const m of messages) {
    lines.push(`### ${m.role} — ${m.created_at}`);
    if (m.llm_provider && m.llm_provider !== 'none') {
      lines.push(`_via ${m.llm_provider}${m.latency_ms != null ? ` · ${m.latency_ms}ms` : ''}_`);
    }
    lines.push('');
    lines.push(m.content);
    lines.push('');
  }
  return lines.join('\n');
}

export function TranscriptActions({ conversationId, summary, messages }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tgt = e.target as HTMLElement | null;
        const tag = tgt?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tgt?.isContentEditable) return;
        e.preventDefault();
        router.push('/admin/conversations');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  function copyLink() {
    if (typeof window === 'undefined') return;
    void navigator.clipboard?.writeText(window.location.href);
    setToast('Link copied');
  }

  function exportJson() {
    const payload = {
      summary,
      messages,
      exported_at: new Date().toISOString()
    };
    downloadBlob(
      JSON.stringify(payload, null, 2),
      'application/json',
      `conversation-${conversationId.slice(0, 8)}.json`
    );
    setToast('JSON exported');
  }

  function exportMarkdown() {
    downloadBlob(
      toMarkdown(summary, messages),
      'text/markdown',
      `conversation-${conversationId.slice(0, 8)}.md`
    );
    setToast('Markdown exported');
  }

  const itemClass =
    'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground outline-none transition data-[highlighted]:bg-surface data-[highlighted]:text-foreground focus:bg-surface';

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Copy className="h-3.5 w-3.5" />
        Copy link
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Export transcript"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-[180px] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-soft"
          >
            <DropdownMenu.Item onSelect={exportJson} className={itemClass}>
              <FileJson className="h-3.5 w-3.5" />
              Export as JSON
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={exportMarkdown} className={itemClass}>
              <FileText className="h-3.5 w-3.5" />
              Export as Markdown
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-popover px-3 py-1 text-[11px] font-medium text-foreground shadow-soft"
          >
            <Check className="h-3 w-3 text-success" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
