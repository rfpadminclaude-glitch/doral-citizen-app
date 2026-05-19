import { Bot, MessageSquare, Shield, User } from 'lucide-react';
import { relativeTime } from '@/lib/admin/format';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ACTOR_ICON: Record<string, React.ReactNode> = {
  admin: <User className="h-3.5 w-3.5" />,
  resident: <MessageSquare className="h-3.5 w-3.5" />,
  llm: <Bot className="h-3.5 w-3.5" />,
  system: <Shield className="h-3.5 w-3.5" />
};

const ACTOR_TONE: Record<string, string> = {
  admin: 'bg-secondary/15 text-secondary',
  resident: 'bg-primary/10 text-primary',
  llm: 'bg-gold/15 text-gold',
  system: 'bg-muted text-muted-foreground'
};

export default async function AuditPage() {
  const sb = createClient();
  const { data: entries } = await sb
    .from('audit_log')
    .select('id, actor_type, actor_id, action, entity_type, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(150);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Compliance
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Append-only record of every notable action across the assistant. Used to demonstrate the RFP&apos;s
          compliance + audit-trail requirement.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        {(entries ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No audit events yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(entries ?? []).map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      ACTOR_TONE[e.actor_type] ?? 'bg-muted text-muted-foreground'
                    }`}
                    aria-hidden="true"
                  >
                    {ACTOR_ICON[e.actor_type] ?? <Shield className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="rounded bg-surface px-1.5 py-0.5 uppercase tracking-wider text-muted-foreground">
                        {e.actor_type}
                      </span>
                      <span className="font-mono text-foreground">{e.action}</span>
                      {e.entity_type && (
                        <span className="rounded bg-surface px-1.5 py-0.5 uppercase tracking-wider text-muted-foreground">
                          {e.entity_type}
                        </span>
                      )}
                      <span className="ml-auto text-muted-foreground">
                        {relativeTime(e.created_at)}
                      </span>
                    </div>
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <pre className="mt-1.5 overflow-x-auto rounded-md bg-surface p-2 text-[10px] leading-tight text-muted-foreground">
                        {JSON.stringify(e.metadata, null, 2)}
                      </pre>
                    )}
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
