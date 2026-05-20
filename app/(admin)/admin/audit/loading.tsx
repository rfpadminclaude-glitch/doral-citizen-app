import { Pulse } from '../loading';

export default function AuditLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <Pulse className="h-3 w-32" />
        <Pulse className="h-7 w-40" />
        <Pulse className="h-4 w-96" />
      </header>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <Pulse className="h-2 w-2 rounded-full" />
            <Pulse className="h-3 w-32" />
            <Pulse className="h-3 w-40" />
            <div className="ml-auto">
              <Pulse className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
