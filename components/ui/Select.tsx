'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type SelectOption<V extends string> = {
  value: V;
  label: string;
  description?: string;
  icon?: React.ReactNode;
};

type Props<V extends string> = {
  value: V;
  onChange: (next: V) => void;
  options: SelectOption<V>[];
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function Select<V extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = 'Choose...',
  disabled,
  className
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonId = useId();
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  // Click outside
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  // When opening, highlight the currently selected option.
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-idx="${Math.max(idx, 0)}"]`)?.focus();
    });
  }, [open, options, value]);

  function onKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onItemKey(e: React.KeyboardEvent<HTMLLIElement>, idx: number) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % options.length;
      setHighlight(next);
      listRef.current?.querySelector<HTMLElement>(`[data-idx="${next}"]`)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (idx - 1 + options.length) % options.length;
      setHighlight(next);
      listRef.current?.querySelector<HTMLElement>(`[data-idx="${next}"]`)?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(options[idx].value);
      setOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlight(0);
      listRef.current?.querySelector<HTMLElement>(`[data-idx="0"]`)?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = options.length - 1;
      setHighlight(last);
      listRef.current?.querySelector<HTMLElement>(`[data-idx="${last}"]`)?.focus();
    }
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((p) => !p)}
        onKeyDown={onKey}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          open && 'border-primary shadow-soft',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected?.icon}
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180 text-primary'
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={buttonId}
            tabIndex={-1}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-glass"
          >
            {options.map((opt, idx) => {
              const active = opt.value === value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={active}
                  tabIndex={idx === highlight ? 0 : -1}
                  data-idx={idx}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => onItemKey(e, idx)}
                  onMouseEnter={() => setHighlight(idx)}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-sm transition focus:outline-none',
                    idx === highlight ? 'bg-primary/10 text-primary' : 'text-foreground',
                    active && 'font-medium'
                  )}
                >
                  {opt.icon && <span className="mt-0.5">{opt.icon}</span>}
                  <span className="flex-1">
                    <span className="block leading-tight">{opt.label}</span>
                    {opt.description && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {opt.description}
                      </span>
                    )}
                  </span>
                  {active && <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
