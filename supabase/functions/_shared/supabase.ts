// supabase.ts — service-role client for Edge Functions.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

let cached: SupabaseClient | null = null;

export function admin(): SupabaseClient {
  if (cached) return cached;
  const url = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SERVICE_ROLE_KEY missing in Edge Function env');
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
