import { AnnouncementsBanner } from '@/components/chat/AnnouncementsBanner';
import ChatWidget from '@/components/chat/ChatWidget';
import LangToggle from '@/components/chat/LangToggle';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Building2 } from 'lucide-react';

export default async function ResidentLanding() {
  return (
    <div className="relative flex h-[100svh] flex-col overflow-hidden">
      {/* Ambient background */}
      <div className="doral-radial pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden="true"
      />

      {/* Header — compact, fixed height */}
      <header className="shrink-0 border-b border-border/70 bg-surface/70 backdrop-blur">
        <div className="container flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-soft">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-primary">
                City of Doral
              </p>
              <h1 className="text-sm font-semibold leading-tight text-foreground">Citizen Assistant</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main — fills remaining viewport, only the chat log scrolls */}
      <div className="container flex min-h-0 flex-1 py-4 sm:py-6">
        <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col">
          <AnnouncementsBanner />
          <ChatWidget />
        </div>
      </div>
    </div>
  );
}
