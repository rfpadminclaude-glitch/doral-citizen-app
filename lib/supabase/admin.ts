import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS. Use ONLY on the server (API routes,
 * route handlers, scripts). Never import from client components.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
