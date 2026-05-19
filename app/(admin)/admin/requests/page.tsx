import { ClipboardCheck, FileText, FileWarning, MapPin, TreePine } from 'lucide-react';
import { relativeTime } from '@/lib/admin/format';
import { caseCodeFromUuid } from '@/lib/admin/format';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  permit: 'Permits',
  code_violation: 'Code violation',
  park_issue: 'Parks',
  general: 'General'
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  permit: <FileText className="h-3.5 w-3.5" />,
  code_violation: <FileWarning className="h-3.5 w-3.5" />,
  park_issue: <TreePine className="h-3.5 w-3.5" />,
  general: <MapPin className="h-3.5 w-3.5" />
};

const STATUS_TONE: Record<string, string> = {
  new: 'bg-primary/10 text-primary',
  in_progress: 'bg-gold/15 text-gold',
  resolved: 'bg-success/15 text-success',
  closed: 'bg-muted text-muted-foreground'
};

export default async function ServiceRequestsPage() {
  const sb = createClient();
  const { data: requests } = await sb
    .from('service_requests')
    .select('id, request_type, title, description, status, priority, resident_name, resident_contact, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const byStatus = (status: string) =>
    (requests ?? []).filter((r) => r.status === status).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          311-style case tracker
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Service requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every issue residents have logged through the assistant.
        </p>
      </header>

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['new', 'in_progress', 'resolved', 'closed'] as const).map((s) => (
          <div
            key={s}
            className="rounded-2xl border border-border bg-surface-2 p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.replace('_', ' ')}
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{byStatus(s)}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        {(requests ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No service requests yet. Reports filed through the resident chat will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(requests ?? []).map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {TYPE_ICON[r.request_type] ?? <ClipboardCheck className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold text-primary">
                        {caseCodeFromUuid(r.id)}
                      </span>
                      <span className="rounded bg-surface px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {TYPE_LABEL[r.request_type] ?? r.request_type}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                          STATUS_TONE[r.status] ?? 'bg-muted text-muted-foreground'
                        )}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                      {r.priority && r.priority !== 'normal' && (
                        <span className="rounded bg-surface px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {r.priority}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">{r.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {r.description}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {r.resident_name} · {r.resident_contact} · {relativeTime(r.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
