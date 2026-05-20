import { Pulse } from '../loading';

export default function AnnouncementsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <Pulse className="h-3 w-32" />
        <Pulse className="h-7 w-56" />
        <Pulse className="h-4 w-80" />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface-2 p-5">
            <div className="flex items-center justify-between">
              <Pulse className="h-3 w-20" />
              <Pulse className="h-5 w-16 rounded-full" />
            </div>
            <Pulse className="mt-3 h-5 w-4/5" />
            <Pulse className="mt-2 h-3 w-full" />
            <Pulse className="mt-1 h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
