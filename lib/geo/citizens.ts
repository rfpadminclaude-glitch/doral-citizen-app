/**
 * Server-side helper for matching/creating citizens from a service-request
 * submission. Matches existing rows by lowercased email or phone (the
 * citizens_contact_uniq index); creates a new row otherwise.
 *
 * When an existing record is matched, geo fields are only filled if they
 * were null — we don't overwrite a richer record with a thinner one.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export type CitizenUpsertInput = {
  name: string;
  contact: string;
  address_line: string;
  lat: number | null;
  lng: number | null;
  neighborhood_slug: string | null;
};

export function detectContactKind(s: string): 'phone' | 'email' | null {
  const t = s.trim();
  if (!t) return null;
  if (/@/.test(t) && /\./.test(t.split('@')[1] ?? '')) return 'email';
  if (/[+0-9]/.test(t) && t.replace(/\D/g, '').length >= 7) return 'phone';
  return null;
}

export async function upsertCitizenFromRequest(
  input: CitizenUpsertInput
): Promise<string | null> {
  const sb = createAdminClient();
  const kind = detectContactKind(input.contact);
  if (!kind) return null;

  const email = kind === 'email' ? input.contact.trim().toLowerCase() : null;
  const phone = kind === 'phone' ? input.contact.trim() : null;

  // Look up by lowercased contact, mirroring the unique index.
  let existingId: string | null = null;
  let existingLat: number | null = null;
  let existingLng: number | null = null;
  let existingSlug: string | null = null;

  if (email) {
    const { data } = await sb
      .from('citizens')
      .select('id, lat, lng, neighborhood_slug')
      .ilike('email', email)
      .maybeSingle();
    if (data) {
      existingId = data.id;
      existingLat = data.lat;
      existingLng = data.lng;
      existingSlug = data.neighborhood_slug;
    }
  } else if (phone) {
    const { data } = await sb
      .from('citizens')
      .select('id, lat, lng, neighborhood_slug')
      .eq('phone', phone)
      .maybeSingle();
    if (data) {
      existingId = data.id;
      existingLat = data.lat;
      existingLng = data.lng;
      existingSlug = data.neighborhood_slug;
    }
  }

  if (existingId) {
    const update: Record<string, unknown> = { name: input.name };
    if (existingLat == null && input.lat != null) update.lat = input.lat;
    if (existingLng == null && input.lng != null) update.lng = input.lng;
    if (!existingSlug && input.neighborhood_slug) update.neighborhood_slug = input.neighborhood_slug;
    if (input.address_line) update.address_line = input.address_line;

    await sb.from('citizens').update(update).eq('id', existingId);
    return existingId;
  }

  const { data: inserted, error } = await sb
    .from('citizens')
    .insert({
      name: input.name,
      email,
      phone,
      address_line: input.address_line,
      lat: input.lat,
      lng: input.lng,
      neighborhood_slug: input.neighborhood_slug,
      source: 'request_form'
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('[citizens] insert failed', error?.message);
    return null;
  }
  return inserted.id;
}

export type CitizenCreateInput = {
  name: string;
  phone: string | null;
  email: string | null;
  address_line: string | null;
  lat: number | null;
  lng: number | null;
  neighborhood_slug: string | null;
  source?: string;
};

export type CitizenCreateResult =
  | { ok: true; id: string }
  | { ok: false; code: 'conflict' | 'invalid' | 'error'; message: string };

export async function createCitizen(input: CitizenCreateInput): Promise<CitizenCreateResult> {
  if (!input.name.trim()) {
    return { ok: false, code: 'invalid', message: 'name is required' };
  }
  if (!input.phone && !input.email) {
    return { ok: false, code: 'invalid', message: 'at least one contact (phone or email) is required' };
  }

  const sb = createAdminClient();
  const email = input.email ? input.email.trim().toLowerCase() : null;
  const phone = input.phone ? input.phone.trim() : null;

  const { data: inserted, error } = await sb
    .from('citizens')
    .insert({
      name: input.name.trim(),
      email,
      phone,
      address_line: input.address_line,
      lat: input.lat,
      lng: input.lng,
      neighborhood_slug: input.neighborhood_slug,
      source: input.source ?? 'manual'
    })
    .select('id')
    .single();

  if (error) {
    // Postgres unique_violation = 23505 (citizens_contact_uniq)
    if ((error as any).code === '23505') {
      return { ok: false, code: 'conflict', message: 'a citizen with this contact already exists' };
    }
    return { ok: false, code: 'error', message: error.message };
  }
  if (!inserted) return { ok: false, code: 'error', message: 'insert returned no row' };
  return { ok: true, id: inserted.id };
}

export type CitizenUpdatePatch = Partial<{
  name: string;
  phone: string | null;
  email: string | null;
  address_line: string | null;
  lat: number | null;
  lng: number | null;
  neighborhood_slug: string | null;
  notes: string | null;
}>;

export async function updateCitizen(
  id: string,
  patch: CitizenUpdatePatch
): Promise<{ ok: true } | { ok: false; code: 'conflict' | 'error'; message: string }> {
  const sb = createAdminClient();
  const sanitized: Record<string, unknown> = {};
  if (patch.name !== undefined) sanitized.name = patch.name.trim();
  if (patch.phone !== undefined) sanitized.phone = patch.phone?.trim() || null;
  if (patch.email !== undefined) sanitized.email = patch.email?.trim().toLowerCase() || null;
  if (patch.address_line !== undefined) sanitized.address_line = patch.address_line;
  if (patch.lat !== undefined) sanitized.lat = patch.lat;
  if (patch.lng !== undefined) sanitized.lng = patch.lng;
  if (patch.neighborhood_slug !== undefined) sanitized.neighborhood_slug = patch.neighborhood_slug;
  if (patch.notes !== undefined) sanitized.notes = patch.notes;

  const { error } = await sb.from('citizens').update(sanitized).eq('id', id);
  if (error) {
    if ((error as any).code === '23505') {
      return { ok: false, code: 'conflict', message: 'a citizen with this contact already exists' };
    }
    return { ok: false, code: 'error', message: error.message };
  }
  return { ok: true };
}

export async function deleteCitizen(id: string): Promise<{ ok: true; unlinkedRequests: number } | { ok: false; message: string }> {
  const sb = createAdminClient();

  // Null out the FK on service_requests first so we don't violate the FK.
  const { count, error: nullErr } = await sb
    .from('service_requests')
    .update({ citizen_id: null }, { count: 'exact' })
    .eq('citizen_id', id);
  if (nullErr) return { ok: false, message: nullErr.message };

  const { error: delErr } = await sb.from('citizens').delete().eq('id', id);
  if (delErr) return { ok: false, message: delErr.message };

  return { ok: true, unlinkedRequests: count ?? 0 };
}
