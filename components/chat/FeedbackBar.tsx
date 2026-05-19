'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  messageId: string;
  conversationId?: string;
};

type State = 'idle' | 'thanks' | 'expanded';

export function FeedbackBar({ messageId, conversationId }: Props) {
  const t = useTranslations('chat.feedback');
  const [state, setState] = useState<State>('idle');
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);

  async function send(rating: 1 | 5, withComment?: string) {
    setPending(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId,
          conversation_id: conversationId,
          rating,
          comment: withComment?.trim() || undefined
        })
      });
    } catch {
      // Best-effort — don't show failure UI for a polish feature.
    } finally {
      setPending(false);
      setState('thanks');
    }
  }

  if (state === 'thanks') {
    return (
      <motion.span
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success"
        aria-live="polite"
      >
        <Check className="h-3 w-3" />
        {t('thanks')}
      </motion.span>
    );
  }

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {t('helpful')}
        </span>
        <button
          type="button"
          onClick={() => send(5)}
          disabled={pending}
          aria-label={t('yes')}
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition',
            'hover:bg-success/15 hover:text-success disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          )}
        >
          <ThumbsUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => setState('expanded')}
          disabled={pending}
          aria-label={t('no')}
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition',
            'hover:bg-destructive/15 hover:text-destructive disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          )}
        >
          <ThumbsDown className="h-3 w-3" />
        </button>
      </div>

      <AnimatePresence>
        {state === 'expanded' && (
          <motion.form
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              void send(1, comment);
            }}
            className="flex flex-col gap-1.5"
          >
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what went wrong (optional)"
              rows={2}
              maxLength={2000}
              className="block w-full resize-none rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition hover:translate-y-[-0.5px] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              >
                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Send
              </button>
              <button
                type="button"
                onClick={() => setState('idle')}
                className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:underline"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
