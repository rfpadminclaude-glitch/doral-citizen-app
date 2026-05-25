/**
 * seed-citizens.ts
 *
 * Upserts ~50 fictional citizens into the master DB so the GIS map looks
 * populated on day one. Idempotent: matches existing rows by lowercased
 * email/phone (the citizens_contact_uniq index).
 *
 * Usage:
 *   npm run seed:citizens
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { SEED_CITIZENS } from '../supabase/seed/citizens';

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log(`seeding ${SEED_CITIZENS.length} citizens…`);

  let inserted = 0;
  let updated = 0;

  for (const c of SEED_CITIZENS) {
    const contactKey = (c.email ?? c.phone ?? '').toLowerCase();

    // Look up existing by lowercased contact (mirrors the unique index).
    const { data: existing } = await sb
      .from('citizens')
      .select('id')
      .or(
        c.email ? `email.ilike.${c.email}` : `phone.eq.${c.phone}`
      )
      .maybeSingle();

    if (existing) {
      const { error } = await sb
        .from('citizens')
        .update({
          name: c.name,
          phone: c.phone,
          email: c.email,
          address_line: c.address_line,
          lat: c.lat,
          lng: c.lng,
          neighborhood_slug: c.neighborhood_slug,
          source: 'seed'
        })
        .eq('id', existing.id);
      if (error) {
        console.error(`  update failed for ${contactKey}:`, error.message);
      } else {
        updated++;
      }
    } else {
      const { error } = await sb.from('citizens').insert({
        name: c.name,
        phone: c.phone,
        email: c.email,
        address_line: c.address_line,
        lat: c.lat,
        lng: c.lng,
        neighborhood_slug: c.neighborhood_slug,
        source: 'seed'
      });
      if (error) {
        console.error(`  insert failed for ${contactKey}:`, error.message);
      } else {
        inserted++;
      }
    }
  }

  console.log(`done — inserted ${inserted}, updated ${updated}, skipped ${SEED_CITIZENS.length - inserted - updated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// ---------------------------------------------------------------------------

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const [, k, v] = m;
      if (!process.env[k]) {
        process.env[k] = v.replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {
    /* no .env.local — rely on the shell environment */
  }
}
