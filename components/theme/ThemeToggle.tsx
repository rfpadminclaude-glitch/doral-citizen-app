'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, MonitorCog } from 'lucide-react';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl';

type ThemeValue = 'light' | 'system' | 'dark';

const OPTIONS: SegmentedOption<ThemeValue>[] = [
  { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
  { value: 'system', label: 'Auto', icon: <MonitorCog className="h-4 w-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> }
];

export function ThemeToggle({ iconOnly = true }: { iconOnly?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch — render an invisible placeholder until mounted.
  if (!mounted) {
    return (
      <div className="inline-flex h-9 w-[124px] rounded-full border border-border bg-surface-2" aria-hidden="true" />
    );
  }

  const current: ThemeValue =
    theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system';

  return (
    <SegmentedControl<ThemeValue>
      ariaLabel="Color theme"
      value={current}
      onChange={(v) => setTheme(v)}
      options={OPTIONS}
      iconOnly={iconOnly}
      size="sm"
    />
  );
}
