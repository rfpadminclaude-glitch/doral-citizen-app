'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export type SegmentedOption<V extends string> = {
  value: V;
  label: string;
  icon?: React.ReactNode;
  hint?: string; // shown only to screen readers
};

type Props<V extends string> = {
  ariaLabel: string;
  value: V;
  onChange: (next: V) => void;
  options: SegmentedOption<V>[];
  size?: 'sm' | 'md';
  className?: string;
  /** Hide labels visually (icons-only). Labels still readable by screen readers. */
  iconOnly?: boolean;
};

export function SegmentedControl<V extends string>({
  ariaLabel,
  value,
  onChange,
  options,
  size = 'md',
  className,
  iconOnly = false
}: Props<V>) {
  const groupId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex items-center rounded-full border border-border bg-surface-2 p-1',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={iconOnly ? opt.label : undefined}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              size === 'sm' && 'px-2.5 py-1',
              active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-pill-${groupId}`}
                className="absolute inset-0 -z-10 rounded-full bg-primary shadow-soft"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            {opt.icon && <span aria-hidden="true">{opt.icon}</span>}
            {!iconOnly && <span>{opt.label}</span>}
            {opt.hint && <span className="sr-only">{opt.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
