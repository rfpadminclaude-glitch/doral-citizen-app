import { KpiSkeleton, Pulse } from '../loading';

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <Pulse className="h-3 w-32" />
        <Pulse className="h-7 w-40" />
        <Pulse className="h-4 w-72" />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface-2 p-5">
            <Pulse className="h-3 w-32" />
            <Pulse className="mt-4 h-40 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
