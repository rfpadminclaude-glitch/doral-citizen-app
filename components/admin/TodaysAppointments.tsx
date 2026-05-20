import { CalendarClock, Sun } from 'lucide-react';
import type { TodayAppointment } from '@/lib/admin/analytics';

const TYPE_LABEL: Record<string, string> = {
  permit_renewal: 'Permit renewal',
  consultation: 'Consultation',
  inspection: 'Inspection'
};

export function TodaysAppointments({
  appointments,
  title = "Today's appointments",
  kicker = 'Booked slots, soonest first',
  emptyLabel = 'No appointments booked for today.'
}: {
  appointments: TodayAppointment[];
  title?: string;
  kicker?: string;
  emptyLabel?: string;
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
        {appointments.length > 0 && (
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
            {appointments.length}
          </span>
        )}
      </header>

      {appointments.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-surface px-4 py-8 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 text-gold">
            <Sun className="h-5 w-5" />
          </span>
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {appointments.map((a) => {
            const slot = new Date(a.slot_start);
            const time = slot.toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit'
            });
            return (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-xl bg-surface px-3 py-2.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">{time}</span>
                    <span className="rounded bg-surface-2 px-1.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                      {TYPE_LABEL[a.appointment_type] ?? a.appointment_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {a.resident_name ?? 'Anonymous'}
                  </p>
                </div>
                <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  {a.confirmation_code}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
