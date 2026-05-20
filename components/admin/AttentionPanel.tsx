import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Construction,
  FileText,
  FileWarning,
  MapPin,
  Megaphone,
  TreePine
} from 'lucide-react';
import Link from 'next/link';
import { caseCodeFromUuid, relativeTime } from '@/lib/admin/format';
import type { OpenRequest } from '@/lib/admin/analytics';
import { cn } from '@/lib/utils';

const TYPE_ICON: Record<string, typeof FileText> = {
  permit: FileText,
  code_violation: FileWarning,
  park_issue: TreePine,
  general: MapPin,
  pothole: Construction,
  inspection: ClipboardCheck,
  complaint: Megaphone
};

const PRIORITY_TONE: Record<string, string> = {
  urgent: 'border-destructive/40 bg-destructive/10 text-destructive',
  high: 'border-accent/40 bg-accent/10 text-accent'
};

export function AttentionPanel({
  requests,
  emptyLabel = 'All caught up — no urgent requests open.',
  title = 'Needs attention',
  kicker = 'Open urgent + high priority'
}: {
  requests: OpenRequest[];
  emptyLabel?: string;
  title?: string;
  kicker?: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface-2 p-5 shadow-soft/40">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {kicker}
          </p>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {requests.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {requests.length}
          </span>
        )}
      </header>

      {requests.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-surface px-4 py-8 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {requests.map((r) => {
            const Icon = TYPE_ICON[r.request_type] ?? ClipboardCheck;
            return (
              <li key={r.id}>
                <Link
                  href={`/admin/requests/${r.id}`}
                  className="group flex items-start gap-3 rounded-xl border border-transparent bg-surface px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-semibold text-primary">
                        {caseCodeFromUuid(r.id)}
                      </span>
                      <span
                        className={cn(
                          'rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider',
                          PRIORITY_TONE[r.priority] ?? 'border-border text-muted-foreground'
                        )}
                      >
                        {r.priority}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                      {r.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.resident_name ?? 'Anonymous'} · {relativeTime(r.created_at)}
                    </p>
                  </div>
                  <ArrowRight className="mt-1.5 h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
