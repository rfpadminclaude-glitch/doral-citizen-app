'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight idle detector. Returns true once `thresholdMs` has elapsed
 * without any user input on the page. Resets on any of:
 *   - keydown / pointerdown / pointermove / touchstart / scroll / wheel
 *   - window blur (treat tab leave as a kind of "reset" so returning to a
 *     fresh tab doesn't immediately fire idle).
 *   - external `bump()` calls (caller-initiated reset, e.g. when a chat message
 *     arrives that the user didn't trigger).
 *
 * No external deps; uses a single shared interval to update the idle flag.
 */
export function useIdle(thresholdMs = 18_000): { isIdle: boolean; bump: () => void } {
  const [isIdle, setIsIdle] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());

  const bump = () => {
    lastActivityRef.current = Date.now();
    if (isIdle) setIsIdle(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function onActivity() {
      lastActivityRef.current = Date.now();
      setIsIdle(false);
    }

    const events = ['keydown', 'pointerdown', 'pointermove', 'touchstart', 'scroll', 'wheel'] as const;
    for (const e of events) window.addEventListener(e, onActivity, { passive: true });
    window.addEventListener('blur', onActivity);

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      setIsIdle((prev) => {
        if (elapsed >= thresholdMs && !prev) return true;
        if (elapsed < thresholdMs && prev) return false;
        return prev;
      });
    }, 1000);

    return () => {
      for (const e of events) window.removeEventListener(e, onActivity);
      window.removeEventListener('blur', onActivity);
      window.clearInterval(interval);
    };
  }, [thresholdMs]);

  return { isIdle, bump };
}
