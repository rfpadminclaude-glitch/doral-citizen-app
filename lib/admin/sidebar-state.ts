'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'doral.admin.sidebar.collapsed.v1';

export function useSidebarCollapsed(defaultValue = false) {
  const [collapsed, setCollapsedState] = useState<boolean>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(KEY);
    if (raw === '1') setCollapsedState(true);
    else if (raw === '0') setCollapsedState(false);
    setHydrated(true);
  }, []);

  // Cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onStorage(e: StorageEvent) {
      if (e.key !== KEY) return;
      setCollapsedState(e.newValue === '1');
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setCollapsed = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setCollapsedState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(KEY, value ? '1' : '0');
      }
      return value;
    });
  }, []);

  const toggle = useCallback(() => setCollapsed((p) => !p), [setCollapsed]);

  return { collapsed, setCollapsed, toggle, hydrated };
}
