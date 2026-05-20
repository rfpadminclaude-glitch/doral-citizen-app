import { KpiSkeleton, Pulse, RowSkeleton } from '../loading';

export default function KnowledgeLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <Pulse className="h-3 w-32" />
        <Pulse className="h-7 w-56" />
        <Pulse className="h-4 w-80" />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Pulse className="h-10 flex-1" />
        <Pulse className="h-10 w-40" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
