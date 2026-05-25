import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import AdminShell from '@/components/admin/AdminShell';
import type { AdminLabels } from '@/components/admin/AdminSidebar';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: admin } = await supabase
    .from('admin_users')
    .select('id, role, display_name, email')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (!admin) redirect('/login?error=not_admin');

  const t = await getTranslations('admin.nav');

  const labels: AdminLabels = {
    dashboard: t('dashboard'),
    conversations: t('conversations'),
    requests: t('requests'),
    gis: t('gis'),
    citizens: t('citizens'),
    knowledge: t('knowledge'),
    announcements: t('announcements'),
    analytics: t('analytics'),
    audit: t('audit'),
    logout: t('logout'),
    expand: 'Expand sidebar',
    collapse: 'Collapse sidebar'
  };

  return (
    <AdminShell labels={labels} displayName={admin.display_name} email={admin.email}>
      {children}
    </AdminShell>
  );
}
