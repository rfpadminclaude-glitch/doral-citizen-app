import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NewDocumentForm } from './NewDocumentForm';

export const dynamic = 'force-dynamic';

export default async function NewDocumentPage() {
  const sb = createClient();
  const {
    data: { user }
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data: admin } = await sb
    .from('admin_users')
    .select('id, role')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (!admin) redirect('/login?error=not_admin');
  if (admin.role === 'viewer') redirect('/admin/knowledge?error=forbidden');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <NewDocumentForm />
    </div>
  );
}
