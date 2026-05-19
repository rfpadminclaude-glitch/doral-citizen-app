'use client';

/**
 * Client-side chat session store.
 *
 * Persists the list of conversations the user has had IN THIS BROWSER to
 * localStorage. No server round-trip is required to render the history list.
 * The full message body for each session is fetched on demand from
 * `GET /api/chat/sessions/:id`.
 *
 * PoC trust model: session IDs are random UUIDs treated as opaque tokens.
 * Anyone with the token can read that session's messages. For production,
 * we'd bind sessions to authenticated users with RLS.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'doral.chat.sessions.v1';
const ACTIVE_KEY = 'doral.chat.active.v1';

export type ChatSessionMeta = {
  id: string;
  title: string;
  lastActivityAt: string; // ISO
  messageCount: number;
  lang: 'en' | 'es';
  residentName?: string | null;
  email?: string | null;
  phone?: string | null;
  announcementOptIn?: boolean;
  avatar?: string;
  /** Set to true if the resident dismissed the name-capture prompt. */
  nameSkipped?: boolean;
};

// ============================================================================
// Raw storage helpers
// ============================================================================

function readAll(): ChatSessionMeta[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: ChatSessionMeta[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function readActive(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

function writeActive(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) window.localStorage.setItem(ACTIVE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_KEY);
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sortByActivity(list: ChatSessionMeta[]): ChatSessionMeta[] {
  return [...list].sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1));
}

// ============================================================================
// Hook
// ============================================================================

export type UseChatSessions = {
  sessions: ChatSessionMeta[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  createNew: (lang: 'en' | 'es') => string;
  upsert: (id: string, patch: Partial<Omit<ChatSessionMeta, 'id'>>) => void;
  remove: (id: string) => void;
  search: (query: string) => ChatSessionMeta[];
};

export function useChatSessions(): UseChatSessions {
  const [sessions, setSessions] = useState<ChatSessionMeta[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSessions(sortByActivity(readAll()));
    setActiveIdState(readActive());
  }, []);

  // Cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setSessions(sortByActivity(readAll()));
      if (e.key === ACTIVE_KEY) setActiveIdState(readActive());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setActiveId = useCallback((id: string | null) => {
    writeActive(id);
    setActiveIdState(id);
  }, []);

  const createNew = useCallback(
    (lang: 'en' | 'es') => {
      const id = uuid();
      const meta: ChatSessionMeta = {
        id,
        title: '',
        lastActivityAt: new Date().toISOString(),
        messageCount: 0,
        lang
      };
      const next = sortByActivity([meta, ...readAll().filter((s) => s.id !== id)]);
      writeAll(next);
      writeActive(id);
      setSessions(next);
      setActiveIdState(id);
      return id;
    },
    []
  );

  const upsert = useCallback(
    (id: string, patch: Partial<Omit<ChatSessionMeta, 'id'>>) => {
      const list = readAll();
      const idx = list.findIndex((s) => s.id === id);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          ...patch,
          lastActivityAt: patch.lastActivityAt ?? new Date().toISOString()
        };
      } else {
        list.push({
          id,
          title: '',
          lastActivityAt: new Date().toISOString(),
          messageCount: 0,
          lang: 'en',
          ...patch
        });
      }
      const next = sortByActivity(list);
      writeAll(next);
      setSessions(next);
    },
    []
  );

  const remove = useCallback(
    (id: string) => {
      const next = readAll().filter((s) => s.id !== id);
      writeAll(next);
      setSessions(sortByActivity(next));
      if (readActive() === id) {
        writeActive(null);
        setActiveIdState(null);
      }
    },
    []
  );

  const search = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return sessions;
      return sessions.filter((s) => s.title.toLowerCase().includes(q));
    },
    [sessions]
  );

  return { sessions, activeId, setActiveId, createNew, upsert, remove, search };
}

// ============================================================================
// Pure helpers (for tests / non-hook callers)
// ============================================================================

export function titleFromFirstMessage(text: string, maxLen = 56): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1).trimEnd() + '…';
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.round((now.getTime() - then) / 1000);
  if (diffSec < 45) return 'just now';
  if (diffSec < 90) return '1 min ago';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}
