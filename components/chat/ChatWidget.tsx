'use client';

import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  ArrowUp,
  Check,
  ClipboardCheck,
  Construction,
  Copy,
  FileText,
  History,
  Megaphone,
  MessageSquarePlus,
  RefreshCw,
  User,
  Wrench
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  titleFromFirstMessage,
  useChatSessions,
  type ChatSessionMeta
} from '@/lib/chat/sessions';
import { cn } from '@/lib/utils';
import { AppointmentPicker, type BookedMessage } from './AppointmentPicker';
import { BotAvatar } from './BotAvatar';
import { FeedbackBar } from './FeedbackBar';
import { HistoryDrawer } from './HistoryDrawer';
import { IdleEntertainment } from './IdleEntertainment';
import { NameCaptureCard } from './NameCaptureCard';
import { ProfileDrawer } from './ProfileDrawer';
import { ServiceRequestForm, type RequestType, type SubmittedMessage } from './ServiceRequestForm';
import { SkylineIllustration } from './SkylineIllustration';
import { useIdle } from '@/lib/chat/useIdle';

type Sentiment = 'positive' | 'neutral' | 'negative' | 'frustrated' | 'urgent';
type SuggestedAction = 'book_appointment' | 'create_request' | 'none';

type Source = {
  index: number;
  chunk_id: string;
  document_id: string;
  title: string;
  url?: string | null;
  similarity?: number;
};

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sentiment?: Sentiment;
  provider?: 'groq' | 'gemini' | 'rag-fallback' | 'none';
  sources?: Source[];
  citations?: number[];
  suggestedActions?: SuggestedAction[];
  createdAt?: number;
};

type ApiResponse = {
  message_id?: string;
  conversation_id?: string;
  answer?: string;
  sentiment?: Sentiment;
  sentiment_score?: number;
  provider?: 'groq' | 'gemini' | 'rag-fallback';
  latency_ms?: number;
  citations?: number[];
  sources?: Source[];
  suggested_actions?: SuggestedAction[];
  error?: string;
  fallback?: boolean | 'rag-only';
  message?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

/**
 * Locale-aware relative time ("just now" / "2 min. ago" / "hace 2 min").
 * Returns null when no timestamp is present so the UI can skip rendering
 * (e.g. messages restored from the server which don't carry created_at).
 */
function formatRelative(
  ts: number | undefined,
  locale: 'en' | 'es',
  justNowLabel: string
): string | null {
  if (!ts) return null;
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 45) return justNowLabel;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(-diffHour, 'hour');
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(-diffDay, 'day');
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Replace inline [1], [2] citation markers in the LLM answer with small
 * primary-colored superscript chips. Unmatched numbers are left as-is.
 */
function renderWithCitations(content: string, sources?: Source[]): React.ReactNode {
  if (!sources || sources.length === 0) return content;
  const ids = new Set(sources.map((s) => s.index));
  const re = /\[(\d{1,2})\]/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(content)) !== null) {
    const n = parseInt(m[1], 10);
    if (!ids.has(n)) continue;
    if (m.index > last) out.push(content.slice(last, m.index));
    out.push(
      <sup key={`c-${key++}-${n}`} className="ml-0.5 text-primary">
        <a
          href="#sources"
          onClick={(e) => e.preventDefault()}
          className="rounded bg-primary/10 px-1 text-[9px] font-semibold no-underline hover:bg-primary/20"
          title={sources.find((s) => s.index === n)?.title}
        >
          {n}
        </a>
      </sup>
    );
    last = m.index + m[0].length;
  }
  if (last < content.length) out.push(content.slice(last));
  return out.length > 0 ? out : content;
}

/**
 * Compact button card used on the welcome screen for "Report pothole",
 * "Submit complaint", "Request inspection", etc. Keeps the look consistent
 * across the row so users scan it as a single grid of options.
 */
function QuickActionCard({
  icon,
  label,
  desc,
  onClick,
  className
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-start gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 group-hover:bg-primary/10">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground group-hover:text-primary">
          {label}
        </span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}

export default function ChatWidget() {
  const t = useTranslations('chat');
  const locale = useLocale() as 'en' | 'es';
  const { sessions, activeId, setActiveId, createNew, upsert, remove } = useChatSessions();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bookingForMsgId, setBookingForMsgId] = useState<string | null>(null);
  const [requestForMsgId, setRequestForMsgId] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [quickActionType, setQuickActionType] = useState<RequestType | null>(null);
  // Bumped every minute so relative timestamps re-render without per-message timers.
  const [, setTimeTick] = useState(0);

  // Resolve the resident's profile (if any) from the session list.
  const activeSession = sessions.find((s) => s.id === activeId);
  const residentName = activeSession?.residentName ?? null;
  const residentAvatar = activeSession?.avatar ?? '🙂';
  const nameSkipped = !!activeSession?.nameSkipped;

  // Idle detection — fires after 18s of no input. Used to show the
  // IdleEntertainment fact carousel + breathe the suggestion chips.
  const { isIdle } = useIdle(18_000);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionRef = useRef<string | null>(null);

  // Keep a ref to the current session for async handlers (avoids stale closures).
  useEffect(() => {
    sessionRef.current = activeId;
  }, [activeId]);

  // Tick every minute so the relative-time labels on messages refresh
  // without each <article> running its own interval.
  useEffect(() => {
    const id = window.setInterval(() => setTimeTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Auto-dismiss the inline toast after a few seconds.
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Clear the per-message "Copied!" indicator after a beat.
  useEffect(() => {
    if (!copiedId) return;
    const id = window.setTimeout(() => setCopiedId(null), 1800);
    return () => window.clearTimeout(id);
  }, [copiedId]);

  // Auto-scroll on new messages or when inline forms (booking / service
  // request) mount so the freshly rendered form / its popovers aren't
  // hidden behind the bottom edge of the chat log.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending, bookingForMsgId, requestForMsgId]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  // Load messages whenever the active session changes (and we have one).
  useEffect(() => {
    let cancelled = false;
    async function load(id: string) {
      setLoadingSession(true);
      try {
        const resp = await fetch(`/api/chat/sessions/${id}`, { cache: 'no-store' });
        if (resp.status === 404) {
          // Brand-new session — no server record yet, start with empty log.
          if (!cancelled) setMessages([]);
          return;
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data: {
          messages: Array<{
            id: string;
            role: 'user' | 'assistant' | 'system' | 'tool';
            content: string;
            sentiment?: Sentiment;
            llm_provider?: 'groq' | 'gemini' | 'none';
          }>;
        } = await resp.json();
        if (cancelled) return;
        setMessages(
          data.messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              sentiment: m.sentiment,
              provider: m.llm_provider
            }))
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    }
    if (activeId) load(activeId);
    else setMessages([]);
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // If we have no active session but have prior sessions, default to the most
  // recent one. If no sessions at all, leave activeId null until first message.
  useEffect(() => {
    if (!activeId && sessions.length > 0) setActiveId(sessions[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.length]);

  const newChat = useCallback(() => {
    createNew(locale);
    setMessages([]);
    setError(null);
    setInput('');
    setBookingForMsgId(null);
    setRequestForMsgId(null);
    setTimeout(() => textareaRef.current?.focus(), 60);
  }, [createNew, locale]);

  function onBookingConfirmed(msg: BookedMessage) {
    setBookingForMsgId(null);
    const slot = new Date(msg.slot_start).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    const confirmText =
      locale === 'es'
        ? `✅ ¡Listo, ${msg.resident_name}! Cita confirmada para **${slot}**. Código de confirmación: **${msg.confirmation_code}**. Recibirás un mensaje de texto antes del día de tu cita.`
        : `✅ All set, ${msg.resident_name}! Your appointment is booked for **${slot}**. Confirmation code: **${msg.confirmation_code}**. You'll receive an SMS reminder before the visit.`;
    setMessages((m) => [
      ...m,
      {
        id: `confirm_${Date.now()}`,
        role: 'assistant',
        content: confirmText,
        provider: 'none'
      }
    ]);
  }

  function onRequestSubmitted(msg: SubmittedMessage) {
    setRequestForMsgId(null);
    const confirmText =
      locale === 'es'
        ? `🛠️ ¡Gracias, ${msg.resident_name}! Tu solicitud fue creada. Número de caso: **${msg.case_code}**. Un miembro del personal te contactará pronto.`
        : `🛠️ Thanks, ${msg.resident_name}! Your request has been logged. Case number: **${msg.case_code}**. A staff member will follow up shortly.`;
    setMessages((m) => [
      ...m,
      {
        id: `sr_${Date.now()}`,
        role: 'assistant',
        content: confirmText,
        provider: 'none'
      }
    ]);
  }

  const selectSession = useCallback(
    (id: string) => {
      if (id === activeId) return;
      setActiveId(id);
      setError(null);
    },
    [activeId, setActiveId]
  );

  const deleteSession = useCallback(
    (id: string) => {
      remove(id);
      if (id === activeId) {
        // Server-side messages remain (we never hard-delete). UI just forgets.
        setMessages([]);
      }
    },
    [activeId, remove]
  );

  // Server round-trip + message-list mutation. Extracted so retryFailed()
  // can re-fire the network call without re-appending the user message.
  async function postChat(text: string, sid: string) {
    setPending(true);
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, lang: locale, session_id: sid })
      });
      const data: ApiResponse = await resp.json();
      if (!resp.ok || data.error) {
        setMessages((m) => [
          ...m,
          {
            id: `a_${Date.now()}`,
            role: 'assistant',
            content: data.message ?? `${t('errorTitle')} ${t('errorBody')}`,
            provider: 'none',
            createdAt: Date.now()
          }
        ]);
        const ex = sessions.find((s) => s.id === sid);
        upsert(sid, { messageCount: (ex?.messageCount ?? 0) + 1 });
      } else {
        const aMsg: Msg = {
          id: data.message_id ?? `a_${Date.now()}`,
          role: 'assistant',
          content: data.answer ?? '',
          sentiment: data.sentiment,
          provider: data.provider,
          sources: data.sources,
          citations: data.citations,
          suggestedActions: data.suggested_actions,
          createdAt: Date.now()
        };
        setMessages((m) => [...m, aMsg]);
        const ex = sessions.find((s) => s.id === sid);
        upsert(sid, { messageCount: (ex?.messageCount ?? 0) + 1 });
        if (data.suggested_actions?.includes('book_appointment')) {
          setBookingForMsgId(aMsg.id);
        }
        if (data.suggested_actions?.includes('create_request')) {
          setRequestForMsgId(aMsg.id);
        }
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = `${t('newMessage')}: ${data.answer}`;
        }
      }
    } catch {
      // Surface a retry affordance instead of a generic error banner.
      setFailedMessage(text);
    } finally {
      setPending(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setFailedMessage(null);

    let sid = sessionRef.current;
    if (!sid) sid = createNew(locale);

    const userMsg: Msg = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now()
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');

    const existing = sessions.find((s) => s.id === sid);
    const isFirstMessage = (existing?.messageCount ?? 0) === 0;
    upsert(sid, {
      title: isFirstMessage ? titleFromFirstMessage(text) : existing?.title,
      lang: locale,
      messageCount: (existing?.messageCount ?? 0) + 1
    });

    // Show the "we're saving this chat" toast once per browser session, after
    // the very first user message — reassures residents that history persists.
    if (isFirstMessage && typeof window !== 'undefined') {
      try {
        if (!sessionStorage.getItem('doral.savedToastShown')) {
          sessionStorage.setItem('doral.savedToastShown', '1');
          setToast(t('savedToast'));
        }
      } catch {
        /* sessionStorage blocked (private mode) — skip */
      }
    }

    await postChat(text, sid);
  }

  const retryFailed = useCallback(async () => {
    if (!failedMessage) return;
    const text = failedMessage;
    setFailedMessage(null);
    const sid = sessionRef.current;
    if (!sid) return;
    await postChat(text, sid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failedMessage]);

  const onCopyMessage = useCallback(async (m: Msg) => {
    const ok = await copyToClipboard(m.content);
    if (ok) setCopiedId(m.id);
  }, []);

  // Quick-action entry points from the welcome screen.
  function startQuickAction(type: RequestType) {
    if (!sessionRef.current) createNew(locale);
    setQuickActionType(type);
  }

  function startPermitQuestion() {
    setInput(t('quickActions.permitsPrompt'));
    setTimeout(() => textareaRef.current?.focus(), 30);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const suggestions = useMemo(
    () => [t('suggestions.permit'), t('suggestions.hours'), t('suggestions.trash')],
    [t]
  );

  return (
    <MotionConfig reducedMotion="user">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="glass relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl shadow-glass"
    >
      {/* Header */}
      <div className="relative shrink-0">
        <div className="doral-gradient-bar-animated h-1.5 w-full" aria-hidden="true" />
        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12">
              <BotAvatar state={pending ? 'thinking' : 'idle'} className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{t('title')}</span>
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success"
                  aria-label={t('online')}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                  {t('online')}
                </span>
                {residentName && (
                  <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    aria-label={`Edit profile, ${residentName}`}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span aria-hidden="true">{residentAvatar}</span>
                    Hi, {residentName}
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={newChat}
              className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={t('newChat')}
              title={t('newChat')}
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span className="hidden text-xs font-medium md:inline">{t('newChat')}</span>
            </button>
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              disabled={!sessionRef.current}
              className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={t('profile')}
              title={t('profile')}
            >
              <User className="h-4 w-4" />
              <span className="hidden text-xs font-medium md:inline">{t('profile')}</span>
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="relative inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`${t('history')} (${sessions.length})`}
              title={t('history')}
            >
              <History className="h-4 w-4" />
              <span className="hidden text-xs font-medium md:inline">{t('history')}</span>
              {sessions.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                  {sessions.length > 9 ? '9+' : sessions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <span className="sr-only" aria-live="polite" ref={liveRegionRef} />

      <AnimatePresence>
        {toast && (
          <motion.div
            key="chat-toast"
            role="status"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mx-4 mt-2 shrink-0 self-start rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation log */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        className="scroll-thin flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6"
      >
        {loadingSession && (
          <div className="text-center text-xs text-muted-foreground" aria-live="polite">
            Loading conversation…
          </div>
        )}

        {!loadingSession && messages.length === 0 && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="overflow-hidden rounded-2xl border border-border bg-surface-2/60"
            >
              <SkylineIllustration className="h-20 w-full" />
              <div className="px-4 pb-4 pt-2 sm:px-5">
                <div className="flex items-start gap-2 text-sm text-foreground">
                  <motion.span
                    initial={{ rotate: 0 }}
                    animate={{ rotate: [0, 14, -8, 14, -8, 0] }}
                    transition={{ duration: 1.4, times: [0, 0.15, 0.3, 0.45, 0.6, 1], delay: 0.3 }}
                    style={{ transformOrigin: '70% 70%', display: 'inline-block' }}
                    className="text-base leading-none"
                    aria-hidden="true"
                  >
                    👋
                  </motion.span>
                  <p>{t('welcome')}</p>
                </div>
                <ul className="mt-4 flex flex-col gap-2">
                  {suggestions.map((s, i) => (
                    <motion.li
                      key={s}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: 0.18 + i * 0.06 }}
                    >
                      <button
                        type="button"
                        onClick={() => setInput(s)}
                        className={cn(
                          'group w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left text-sm text-foreground transition hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          isIdle && 'animate-breathe'
                        )}
                      >
                        {s}
                        <span
                          className="ml-2 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Quick-action launchers — let residents jump straight to a
                pothole report, complaint, inspection, ticket, or permit Q&A
                without typing first. Each card pre-fills the right intent. */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.22 }}
              aria-label={t('quickActions.title')}
            >
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('quickActions.subtitle')}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <QuickActionCard
                  icon={<Construction className="h-4 w-4 text-accent" aria-hidden="true" />}
                  label={t('quickActions.pothole')}
                  desc={t('quickActions.potholeDesc')}
                  onClick={() => startQuickAction('pothole')}
                />
                <QuickActionCard
                  icon={<Megaphone className="h-4 w-4 text-destructive" aria-hidden="true" />}
                  label={t('quickActions.complaint')}
                  desc={t('quickActions.complaintDesc')}
                  onClick={() => startQuickAction('complaint')}
                />
                <QuickActionCard
                  icon={<ClipboardCheck className="h-4 w-4 text-secondary" aria-hidden="true" />}
                  label={t('quickActions.inspection')}
                  desc={t('quickActions.inspectionDesc')}
                  onClick={() => startQuickAction('inspection')}
                />
                <QuickActionCard
                  icon={<Wrench className="h-4 w-4 text-primary" aria-hidden="true" />}
                  label={t('quickActions.ticket')}
                  desc={t('quickActions.ticketDesc')}
                  onClick={() => startQuickAction('general')}
                />
                <QuickActionCard
                  icon={<FileText className="h-4 w-4 text-gold" aria-hidden="true" />}
                  label={t('quickActions.permits')}
                  desc={t('quickActions.permitsDesc')}
                  onClick={startPermitQuestion}
                  className="sm:col-span-2"
                />
              </div>
            </motion.div>

            {/* Idle entertainment — slides in after ~18s of no input */}
            <AnimatePresence>
              {isIdle && <IdleEntertainment lang={locale} />}
            </AnimatePresence>
          </>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.article
              key={m.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={cn(
                'max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft/30',
                m.role === 'user'
                  ? 'self-end bg-primary text-primary-foreground'
                  : 'self-start border border-border bg-surface text-foreground'
              )}
              aria-label={m.role === 'user' ? 'Your message' : 'Assistant reply'}
            >
              <div className="whitespace-pre-wrap">{renderWithCitations(m.content, m.sources)}</div>
              {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                  {m.sources.map((s) => (
                    <a
                      key={s.chunk_id}
                      href={s.url ?? '#'}
                      target={s.url ? '_blank' : undefined}
                      rel={s.url ? 'noopener noreferrer' : undefined}
                      onClick={(e) => {
                        if (!s.url) e.preventDefault();
                      }}
                      title={s.title}
                      className="inline-flex max-w-[180px] items-center gap-1 rounded-full border border-border bg-surface-2/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      <span className="font-semibold text-primary">[{s.index}]</span>
                      <span className="truncate">{s.title}</span>
                    </a>
                  ))}
                </div>
              )}
              <div
                className={cn(
                  'mt-1.5 flex items-center justify-between gap-2 text-[10px]',
                  m.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}
              >
                <span>{formatRelative(m.createdAt, locale, t('justNow'))}</span>
                {m.role === 'assistant' && (
                  <button
                    type="button"
                    onClick={() => void onCopyMessage(m)}
                    aria-label={t('copyMessage')}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {copiedId === m.id ? (
                      <>
                        <Check className="h-3 w-3" aria-hidden="true" />
                        <span>{t('copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        <span className="sr-only">{t('copyMessage')}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {m.role === 'assistant' &&
                m.provider &&
                m.provider !== 'none' &&
                isUuid(m.id) && (
                  <FeedbackBar messageId={m.id} />
                )}
            </motion.article>
          ))}
        </AnimatePresence>

        {bookingForMsgId && sessionRef.current && (
          <AppointmentPicker
            sessionId={sessionRef.current}
            lang={locale}
            onBooked={onBookingConfirmed}
            onDismiss={() => setBookingForMsgId(null)}
          />
        )}

        {(requestForMsgId || quickActionType) && sessionRef.current && (
          <ServiceRequestForm
            sessionId={sessionRef.current}
            lang={locale}
            initialType={quickActionType ?? undefined}
            onSubmitted={(msg) => {
              onRequestSubmitted(msg);
              setQuickActionType(null);
            }}
            onDismiss={() => {
              setRequestForMsgId(null);
              setQuickActionType(null);
            }}
          />
        )}

        {/* Name capture — appears after the first assistant reply, only if we
            don't already know the resident's name and they haven't skipped. */}
        {sessionRef.current &&
          !residentName &&
          !nameSkipped &&
          !bookingForMsgId &&
          !requestForMsgId &&
          messages.filter((m) => m.role === 'assistant').length >= 1 && (
            <NameCaptureCard
              sessionId={sessionRef.current}
              lang={locale}
              onSaved={(name) => {
                if (sessionRef.current) {
                  upsert(sessionRef.current, { residentName: name, nameSkipped: false });
                }
              }}
              onSkip={() => {
                if (sessionRef.current) {
                  upsert(sessionRef.current, { nameSkipped: true });
                }
              }}
            />
          )}

        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="self-start rounded-2xl border border-border bg-surface px-4 py-2.5"
            aria-label="Assistant is typing"
          >
            <span className="sr-only">Assistant is typing</span>
            <span className="flex items-center gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-typing-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-typing-bounce [animation-delay:140ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-typing-bounce [animation-delay:280ms]" />
            </span>
          </motion.div>
        )}
      </div>

      {(error || failedMessage) && (
        <div
          role="alert"
          className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive"
        >
          {failedMessage ? (
            <div className="flex items-center justify-between gap-3">
              <span>{t('retryHint')}</span>
              <button
                type="button"
                onClick={() => void retryFailed()}
                className="inline-flex items-center gap-1 rounded-md bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground transition hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                {t('retry')}
              </button>
            </div>
          ) : (
            error
          )}
        </div>
      )}

      {/* Composer — sticky-feeling translucent footer */}
      <form
        className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-surface/75 px-3 py-3 backdrop-blur-md sm:px-4 shadow-[inset_0_8px_12px_-12px_hsl(var(--primary)/0.18)]"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          {t('placeholder')}
        </label>
        <div className="field-ring flex items-end gap-2 px-3 py-2">
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={t('placeholder')}
            rows={1}
            className="max-h-40 min-h-[28px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            aria-label={pending ? t('sending') : t('send')}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {t.rich('kbdHint', {
            kbd: (chunks) => (
              <kbd className="rounded border border-border bg-surface-2 px-1 text-[10px]">
                {chunks}
              </kbd>
            ),
            strong: (chunks) => (
              <span className="font-semibold text-foreground">{chunks}</span>
            )
          })}
        </p>
      </form>

      {/* History drawer */}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sessions={sessions}
        activeId={activeId}
        onSelect={selectSession}
        onNewChat={newChat}
        onDelete={deleteSession}
      />

      {/* Profile drawer */}
      {sessionRef.current && (
        <ProfileDrawer
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          sessionId={sessionRef.current}
          initial={{
            name: activeSession?.residentName ?? '',
            email: activeSession?.email ?? '',
            phone: activeSession?.phone ?? '',
            lang: locale,
            announcement_opt_in: !!activeSession?.announcementOptIn,
            avatar: activeSession?.avatar ?? '🙂'
          }}
          onSaved={(p) => {
            if (sessionRef.current) {
              upsert(sessionRef.current, {
                residentName: p.name || null,
                email: p.email || null,
                phone: p.phone || null,
                announcementOptIn: p.announcement_opt_in,
                avatar: p.avatar,
                nameSkipped: false
              });
            }
          }}
        />
      )}
    </motion.div>
    </MotionConfig>
  );
}
