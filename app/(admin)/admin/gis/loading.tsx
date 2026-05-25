/**
 * Loading skeleton for the GIS map page. Keeps layout stable while the
 * server resolves the page and the Leaflet bundle ships down to the client.
 */
export default function GisLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="space-y-2">
        <Pulse className="h-3 w-32" />
        <Pulse className="h-8 w-64" />
        <Pulse className="h-4 w-96" />
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <PanelSkeleton lines={6} />
          <PanelSkeleton lines={4} />
        </aside>
        <div className="space-y-4">
          <Pulse className="h-[600px] w-full rounded-2xl" />
          <Pulse className="h-[260px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function Pulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} aria-hidden="true" />;
}

function PanelSkeleton({ lines }: { lines: number }) {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-surface-2 p-4">
      <Pulse className="h-3 w-16" />
      {Array.from({ length: lines }).map((_, i) => (
        <Pulse key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}
