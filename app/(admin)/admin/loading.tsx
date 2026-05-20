/**
 * Generic fallback skeleton for admin routes that don't define their own
 * `loading.tsx`. Next.js renders this instantly on navigation so the user
 * sees layout immediately while the route's async server work runs.
 *
 * Each `loading.tsx` is intentionally simple — no client component, no JS —
 * so it never delays the LCP of a slow tab switch.
 */
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <Pulse className="h-3 w-24" />
        <Pulse className="h-7 w-56" />
        <Pulse className="h-4 w-80" />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>

      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function Pulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} aria-hidden="true" />;
}

export function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <Pulse className="h-3 w-16" />
      <Pulse className="mt-2 h-7 w-12" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-4">
      <Pulse className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-4 w-2/5" />
        <Pulse className="h-3 w-4/5" />
      </div>
    </div>
  );
}
