import { listNeighborhoods } from '@/lib/geo/neighborhoods';
import { GisClient } from './GisClient';

export const dynamic = 'force-dynamic';

export default async function GisPage() {
  const neighborhoods = listNeighborhoods();

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Geographic insights
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
          Service request map
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live view of citizen requests across Doral. Filter by neighborhood, status, or category to
          spot service-demand hotspots.
        </p>
      </header>

      <GisClient neighborhoods={neighborhoods} />

      <footer className="text-[10px] text-muted-foreground">
        Map tiles ©{' '}
        <a
          href="https://openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          OpenStreetMap contributors
        </a>
        . Geocoding by{' '}
        <a
          href="https://nominatim.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Nominatim
        </a>
        .
      </footer>
    </div>
  );
}
