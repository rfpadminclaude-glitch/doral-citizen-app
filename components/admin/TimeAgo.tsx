'use client';

import { useEffect, useState } from 'react';
import { relativeTime } from '@/lib/admin/format';
import { useMounted } from '@/lib/hooks/useMounted';

type Props = { iso: string | null | undefined; refreshMs?: number };

export function TimeAgo({ iso, refreshMs = 60_000 }: Props) {
  const mounted = useMounted();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    const id = window.setInterval(() => tick((n) => n + 1), refreshMs);
    return () => window.clearInterval(id);
  }, [mounted, refreshMs]);

  return (
    <span suppressHydrationWarning>{mounted && iso ? relativeTime(iso) : '…'}</span>
  );
}
