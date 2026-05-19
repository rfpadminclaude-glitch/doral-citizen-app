import {
  CalendarClock,
  FileWarning,
  Library,
  Megaphone,
  MessageSquare,
  ThumbsUp
} from 'lucide-react';
import { relativeTime } from '@/lib/admin/format';
import type { ActivityEvent } from '@/lib/admin/analytics';

const ICON: Record<ActivityEvent['type'], { icon: React.ReactNode; tone: string }> = {
  conversation: { icon: <MessageSquare className="h-3.5 w-3.5" />, tone: 'bg-primary/10 text-primary' },
  service_request: { icon: <FileWarning className="h-3.5 w-3.5" />, tone: 'bg-destructive/15 text-destructive' },
  appointment: { icon: <CalendarClock className="h-3.5 w-3.5" />, tone: 'bg-gold/15 text-gold' },
  feedback: { icon: <ThumbsUp className="h-3.5 w-3.5" />, tone: 'bg-success/15 text-success' },
  announcement: { icon: <Megaphone className="h-3.5 w-3.5" />, tone: 'bg-secondary/15 text-secondary' },
  document: { icon: <Library className="h-3.5 w-3.5" />, tone: 'bg-muted text-muted-foreground' }
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface-2 p-5 shadow-soft/40">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Latest activity
        </p>
        <h3 className="text-sm font-semibold text-foreground">Across the assistant</h3>
      </header>
      <ul className="mt-3 space-y-2.5">
        {events.length === 0 && (
          <li className="rounded-lg bg-surface px-3 py-4 text-center text-xs text-muted-foreground">
            No activity yet. Run the resident chat to populate.
          </li>
        )}
        {events.map((e) => {
          const meta = ICON[e.type];
          return (
            <li key={e.id} className="flex items-start gap-2.5 rounded-lg bg-surface px-3 py-2">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.tone}`}>
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{e.title}</p>
                {e.subtitle && (
                  <p className="truncate text-[11px] text-muted-foreground">{e.subtitle}</p>
                )}
              </div>
              <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                {relativeTime(e.at)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
