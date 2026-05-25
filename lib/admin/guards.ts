/**
 * Shared admin-gate for API routes. Returns either an admin descriptor
 * or an error tuple the caller can hand straight to NextResponse.json.
 */
import { createClient } from '@/lib/supabase/server';

export type AdminAuth = { adminId: string; role: string };
export type AuthError = { error: string; status: number };

export async function requireAdmin(opts?: { allowViewer?: boolean }): Promise<AdminAuth | AuthError> {
  const sb = createClient();
  const {
    data: { user }
  } = await sb.auth.getUser();
  if (!user) return { error: 'unauthenticated', status: 401 };

  const { data: admin } = await sb
    .from('admin_users')
    .select('id, role')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!admin) return { error: 'forbidden', status: 403 };
  if (!opts?.allowViewer && admin.role === 'viewer') {
    return { error: 'forbidden', status: 403 };
  }
  return { adminId: admin.id, role: admin.role };
}
