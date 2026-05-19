export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.round((now.getTime() - then) / 1000);
  if (diffSec < 45) return 'just now';
  if (diffSec < 90) return '1 min ago';
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const sentimentClass: Record<string, string> = {
  positive: 'bg-sentiment-positive/15 text-sentiment-positive',
  neutral: 'bg-sentiment-neutral/15 text-sentiment-neutral',
  negative: 'bg-sentiment-negative/15 text-sentiment-negative',
  frustrated: 'bg-sentiment-frustrated/15 text-sentiment-frustrated',
  urgent: 'bg-sentiment-urgent/15 text-sentiment-urgent'
};

export function caseCodeFromUuid(uuid: string): string {
  return `SR-${uuid.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}
