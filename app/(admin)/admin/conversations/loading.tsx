import { Pulse, RowSkeleton } from '../loading';

export default function ConversationsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <Pulse className="h-3 w-32" />
        <Pulse className="h-7 w-48" />
        <Pulse className="h-4 w-96" />
      </header>

      <Pulse className="h-10 w-full" />

      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
