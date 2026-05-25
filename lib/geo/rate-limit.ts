/**
 * In-process serializer for Nominatim requests. OSM's Nominatim usage
 * policy permits at most ~1 req/sec from a single source; we serialize
 * outgoing calls with a 1.1s gap to stay comfortably under that.
 *
 * Demo-only: a real deployment would back this with Redis so multiple
 * server instances share the budget.
 */
let queue: Promise<unknown> = Promise.resolve();

export function nominatimGate<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(async () => {
    const result = await fn();
    await new Promise((r) => setTimeout(r, 1100));
    return result;
  });
  queue = next.catch(() => {});
  return next as Promise<T>;
}
