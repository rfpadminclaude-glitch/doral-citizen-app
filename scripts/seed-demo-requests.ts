/**
 * seed-demo-requests.ts
 *
 * Creates ~80 fictional service_requests linked to seeded citizens so the
 * GIS dashboard has interesting data on day one. Statuses, types, and
 * created_at timestamps are randomized across the last 30 days.
 *
 * Tags rows with mock_crm_payload.demo = true so demo-reset can clean
 * them up later.
 *
 * Usage:
 *   npm run seed:demo-requests
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

const TARGET_COUNT = 80;

const TYPES = [
  'pothole', 'pothole', 'pothole',
  'code_violation', 'code_violation',
  'park_issue',
  'permit',
  'inspection',
  'complaint',
  'general'
] as const;

const STATUSES = [
  'new', 'new', 'new', 'new',
  'in_progress', 'in_progress',
  'resolved', 'resolved',
  'closed'
] as const;

const PRIORITIES = [
  'normal', 'normal', 'normal', 'normal',
  'low',
  'high',
  'urgent'
] as const;

const TITLES: Record<string, string[]> = {
  pothole: ['Pothole near intersection', 'Big pothole on the street', 'Pavement damage', 'Sinkhole forming'],
  code_violation: ['Tall grass on vacant lot', 'Illegal dumping', 'Sign in right-of-way', 'Blocked sidewalk'],
  park_issue: ['Broken park bench', 'Vandalism at playground', 'Missing equipment', 'Lights out at park'],
  permit: ['Permit renewal question', 'Permit status check', 'BTR issue'],
  inspection: ['Schedule inspection', 'Roofing inspection request', 'Final inspection'],
  complaint: ['Noise complaint', 'Concern about traffic', 'Streetlight out'],
  general: ['General question', 'Other concern', 'Service follow-up']
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateLastNDays(n: number): string {
  const now = Date.now();
  const offset = Math.floor(Math.random() * n * 24 * 60 * 60 * 1000);
  return new Date(now - offset).toISOString();
}

async function main() {
  const { data: citizens, error: cErr } = await sb
    .from('citizens')
    .select('id, name, phone, email, address_line, lat, lng, neighborhood_slug')
    .eq('source', 'seed');

  if (cErr || !citizens || citizens.length === 0) {
    console.error('No seeded citizens found — run `npm run seed:citizens` first.', cErr?.message);
    process.exit(1);
  }
  console.log(`found ${citizens.length} seeded citizens`);

  const rows: any[] = [];
  for (let i = 0; i < TARGET_COUNT; i++) {
    const citizen = pick(citizens);
    const type = pick(TYPES);
    const status = pick(STATUSES);
    const title = pick(TITLES[type] ?? TITLES.general);
    const createdAt = randomDateLastNDays(30);

    rows.push({
      conversation_id: null,
      request_type: type,
      title: title,
      description: `Demo seeded request. ${title} reported near ${citizen.address_line}.`,
      status,
      priority: pick(PRIORITIES),
      resident_name: citizen.name,
      resident_contact: citizen.email ?? citizen.phone ?? '',
      citizen_id: citizen.id,
      address_line: citizen.address_line,
      lat: citizen.lat,
      lng: citizen.lng,
      neighborhood_slug: citizen.neighborhood_slug,
      mock_crm_payload: { demo: true },
      created_at: createdAt,
      updated_at: createdAt
    });
  }

  const { error } = await sb.from('service_requests').insert(rows);
  if (error) {
    console.error('insert failed:', error.message);
    process.exit(1);
  }
  console.log(`inserted ${rows.length} demo service requests`);
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
