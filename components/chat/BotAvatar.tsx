'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  state?: 'idle' | 'thinking' | 'happy';
  className?: string;
};

/**
 * A small SVG bot avatar with blinking eyes and a state-aware mouth.
 *  - idle:     eyes blink every ~5s, mouth is a soft smile.
 *  - thinking: eyes squint, mouth flat-line (used while LLM is generating).
 *  - happy:    bigger smile briefly (used after a successful action).
 */
export function BotAvatar({ state = 'idle', className }: Props) {
  const leftEye = useAnimationControls();
  const rightEye = useAnimationControls();

  // Idle blink — staggered random interval so it feels organic.
  useEffect(() => {
    let cancelled = false;
    async function loop() {
      while (!cancelled) {
        const wait = 3000 + Math.random() * 2500;
        await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return;
        leftEye.start({ scaleY: 0.05, transition: { duration: 0.09 } });
        rightEye.start({ scaleY: 0.05, transition: { duration: 0.09 } });
        await new Promise((r) => setTimeout(r, 120));
        if (cancelled) return;
        leftEye.start({ scaleY: 1, transition: { duration: 0.14 } });
        rightEye.start({ scaleY: 1, transition: { duration: 0.14 } });
      }
    }
    if (state === 'idle') loop();
    return () => {
      cancelled = true;
    };
  }, [state, leftEye, rightEye]);

  const isThinking = state === 'thinking';
  const isHappy = state === 'happy';

  return (
    <svg
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Doral assistant bot"
      className={cn('overflow-visible', className)}
    >
      <defs>
        <linearGradient id="bot-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Antenna */}
      <line x1="18" y1="3" x2="18" y2="7" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="18" cy="3" r="1.6" fill="hsl(var(--gold))" className="animate-pulse-soft" />

      {/* Head */}
      <rect x="6" y="8" width="24" height="20" rx="7" fill="url(#bot-grad)" />

      {/* Cheeks */}
      <circle cx="10" cy="22" r="1.4" fill="hsl(var(--gold))" opacity="0.55" />
      <circle cx="26" cy="22" r="1.4" fill="hsl(var(--gold))" opacity="0.55" />

      {/* Eyes — blinking via scaleY */}
      <motion.ellipse
        cx="13.5"
        cy="17"
        rx="1.8"
        ry={isThinking ? 0.6 : 2.2}
        fill="white"
        initial={{ scaleY: 1 }}
        animate={leftEye}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      <motion.ellipse
        cx="22.5"
        cy="17"
        rx="1.8"
        ry={isThinking ? 0.6 : 2.2}
        fill="white"
        initial={{ scaleY: 1 }}
        animate={rightEye}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />

      {/* Pupils — only shown when not thinking (so blink+squint reads cleanly) */}
      {!isThinking && (
        <>
          <circle cx="13.5" cy="17.5" r="0.7" fill="hsl(var(--foreground))" />
          <circle cx="22.5" cy="17.5" r="0.7" fill="hsl(var(--foreground))" />
        </>
      )}

      {/* Mouth */}
      {isHappy ? (
        <path
          d="M 13 23 Q 18 27 23 23"
          fill="none"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ) : isThinking ? (
        <line x1="14" y1="24" x2="22" y2="24" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      ) : (
        <path
          d="M 14 23.2 Q 18 25 22 23.2"
          fill="none"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
