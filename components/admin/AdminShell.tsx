'use client';

import { Building2, Menu } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import AdminSidebar, { type AdminLabels } from './AdminSidebar';

type Props = {
  labels: AdminLabels;
  displayName?: string | null;
  email?: string | null;
  children: React.ReactNode;
};

export default function AdminShell({ labels, displayName, email, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-[100svh] overflow-hidden bg-background text-foreground">
      <AdminSidebar
        labels={labels}
        displayName={displayName}
        email={email}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface-2 px-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="admin-sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-soft">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold text-foreground">Doral Admin</span>
          </div>
          <ThemeToggle />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
