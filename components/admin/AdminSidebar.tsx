'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Building2,
  ChevronLeft,
  FileWarning,
  History as HistoryIcon,
  LayoutDashboard,
  Library,
  LogOut,
  Megaphone,
  MessageSquare,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition, type ComponentType } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useSidebarCollapsed } from '@/lib/admin/sidebar-state';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export type AdminNavKey =
  | 'dashboard'
  | 'conversations'
  | 'requests'
  | 'knowledge'
  | 'announcements'
  | 'analytics'
  | 'audit';

export type AdminLabels = Record<AdminNavKey | 'logout' | 'expand' | 'collapse', string>;

type Item = {
  key: AdminNavKey;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const ITEMS: Item[] = [
  { key: 'dashboard', href: '/admin', icon: LayoutDashboard },
  { key: 'conversations', href: '/admin/conversations', icon: MessageSquare },
  { key: 'requests', href: '/admin/requests', icon: FileWarning },
  { key: 'knowledge', href: '/admin/knowledge', icon: Library },
  { key: 'announcements', href: '/admin/announcements', icon: Megaphone },
  { key: 'analytics', href: '/admin/analytics', icon: BarChart3 },
  { key: 'audit', href: '/admin/audit', icon: HistoryIcon }
];

type Props = {
  labels: AdminLabels;
  displayName?: string | null;
  email?: string | null;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export default function AdminSidebar({
  labels,
  displayName,
  email,
  mobileOpen,
  onMobileClose
}: Props) {
  const { collapsed, toggle } = useSidebarCollapsed(false);
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await createClient().auth.signOut();
      router.replace('/login');
      router.refresh();
    });
  }

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  // Desktop sidebar — width animates between collapsed (64px) and expanded (248px).
  const desktop = (
    <motion.aside
      animate={{ width: collapsed ? 64 : 248 }}
      transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      className="relative hidden h-full shrink-0 flex-col border-r border-border bg-surface-2 md:flex"
      aria-label="Admin navigation"
    >
      <SidebarContent
        collapsed={collapsed}
        toggle={toggle}
        labels={labels}
        items={ITEMS}
        isActive={isActive}
        displayName={displayName}
        email={email}
        onSignOut={signOut}
        signOutPending={pending}
        variant="desktop"
      />
    </motion.aside>
  );

  // Mobile drawer.
  const mobile = (
    <AnimatePresence>
      {mobileOpen && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onMobileClose}
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm md:hidden"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface-2 shadow-glass md:hidden"
            aria-label="Admin navigation"
            role="dialog"
            aria-modal="true"
          >
            <SidebarContent
              collapsed={false}
              toggle={onMobileClose}
              labels={labels}
              items={ITEMS}
              isActive={isActive}
              displayName={displayName}
              email={email}
              onSignOut={signOut}
              signOutPending={pending}
              onNavClick={onMobileClose}
              variant="mobile"
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {desktop}
      {mobile}
    </>
  );
}

// ---------------------------------------------------------------------------

function SidebarContent({
  collapsed,
  toggle,
  labels,
  items,
  isActive,
  displayName,
  email,
  onSignOut,
  signOutPending,
  onNavClick,
  variant
}: {
  collapsed: boolean;
  toggle: () => void;
  labels: AdminLabels;
  items: Item[];
  isActive: (href: string) => boolean;
  displayName?: string | null;
  email?: string | null;
  onSignOut: () => void;
  signOutPending: boolean;
  onNavClick?: () => void;
  variant: 'desktop' | 'mobile';
}) {
  return (
    <>
      {/* Top gradient stripe */}
      <div className="doral-gradient-bar-animated h-1.5 w-full" aria-hidden="true" />

      {/* Brand header with TOP-positioned collapse toggle */}
      <div
        className={cn(
          'relative flex shrink-0 items-center border-b border-border',
          collapsed ? 'h-14 justify-center px-1.5' : 'h-16 justify-between px-4'
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-soft">
            <Building2 className="h-4 w-4" />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="brand-label"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="min-w-0"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-primary">
                  City of Doral
                </p>
                <p className="truncate text-sm font-semibold text-foreground">Admin</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {variant === 'desktop' && (
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? labels.expand : labels.collapse}
            title={collapsed ? labels.expand : labels.collapse}
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              collapsed ? 'absolute right-1 top-1 h-6 w-6' : 'h-7 w-7'
            )}
          >
            <ChevronLeft
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                collapsed && 'rotate-180'
              )}
            />
            <span className="sr-only">{collapsed ? labels.expand : labels.collapse}</span>
          </button>
        )}

        {variant === 'mobile' && (
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav — overflow hidden when collapsed (no scrollbar) */}
      <nav
        className={cn(
          'min-h-0 flex-1 space-y-0.5 px-2 py-3',
          collapsed ? 'overflow-hidden' : 'overflow-y-auto scroll-thin'
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <NavRow
              key={item.href}
              href={item.href}
              label={labels[item.key]}
              icon={<Icon className="h-4 w-4" />}
              active={active}
              collapsed={collapsed}
              onClick={onNavClick}
            />
          );
        })}
      </nav>

      {/* Footer — hidden entirely in desktop-collapsed; only logout icon shown */}
      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            key="footer-expanded"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="space-y-2 border-t border-border p-2.5"
          >
            <div className="flex items-center justify-between rounded-lg bg-surface px-2 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Theme
              </span>
              <ThemeToggle />
            </div>
            {(displayName || email) && (
              <div className="rounded-lg bg-surface px-3 py-2">
                <p
                  className="truncate text-xs font-medium text-foreground"
                  title={displayName ?? undefined}
                >
                  {displayName ?? email}
                </p>
                {displayName && email && (
                  <p className="truncate text-[10px] text-muted-foreground" title={email}>
                    {email}
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onSignOut}
              disabled={signOutPending}
              className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={labels.logout}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>{signOutPending ? '…' : labels.logout}</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="footer-collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="shrink-0 border-t border-border p-2"
          >
            <button
              type="button"
              onClick={onSignOut}
              disabled={signOutPending}
              className="group relative flex h-9 w-full items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={labels.logout}
              title={labels.logout}
            >
              <LogOut className="h-4 w-4" />
              <CollapsedTooltip label={labels.logout} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------

function NavRow({
  href,
  label,
  icon,
  active,
  collapsed,
  onClick
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        // Unified pill shape — same height + padding in both collapsed and
        // expanded states so the active background fills a consistent box
        // and the icon never shifts position when the sidebar resizes.
        'group relative flex h-10 items-center gap-3 rounded-lg px-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        collapsed && 'justify-center',
        active
          ? 'bg-primary/12 font-semibold text-primary'
          : 'text-muted-foreground hover:bg-surface hover:text-foreground'
      )}
    >
      <span className="shrink-0">{icon}</span>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
            className="truncate text-sm"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {collapsed && <CollapsedTooltip label={label} />}
    </Link>
  );
}

function CollapsedTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  );
}
