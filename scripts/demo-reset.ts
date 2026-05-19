/**
 * demo-reset.ts
 *
 * Wipes session-scoped data so a fresh demo run starts clean, then re-seeds
 * fake conversations so analytics still looks populated. Keeps documents,
 * document_chunks, faqs, admin_users, announcements intact.
 *
 * Safety:
 *   - Requires `DORAL_ALLOW_RESET=1` env var (otherwise refuses to run).
 *   - 3-second countdown banner.
 *   - Logs every table count before/after.
 *
 * Usage:
 *   DORAL_ALLOW_RESET=1 npx tsx scripts/demo-reset.ts
 *   (or set in .env.local)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';

loadEnv();

const DB_URL = process.env.SUPABASE_DB_URL;
const ALLOW = process.env.DORAL_ALLOW_RESET === '1';

if (!DB_URL) {
  console.error('SUPABASE_DB_URL missing in .env.local');
  process.exit(1);
}
if (!ALLOW) {
  console.error('Refusing to run. Set DORAL_ALLOW_RESET=1 to proceed.');
  console.error('  Example: DORAL_ALLOW_RESET=1 npx tsx scripts/demo-reset.ts');
  process.exit(1);
}

const TABLES_TO_WIPE = [
  'feedback_ratings',
  'appointments',
  'service_requests',
  'messages',
  'conversations'
];

async function main() {
  console.log('\n⚠  DORAL DEMO RESET');
  console.log('   Wiping resident-side data only. Documents, FAQs, admin users, and announcements remain intact.');
  console.log('   Starting in 3 seconds — Ctrl+C to abort.');
  for (let i = 3; i > 0; i--) {
    process.stdout.write(`   ${i}…`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log('\n   Wiping.\n');

  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  for (const table of TABLES_TO_WIPE) {
    const before = await client.query(`select count(*)::int as n from ${table}`);
    await client.query(`delete from ${table}`);
    const after = await client.query(`select count(*)::int as n from ${table}`);
    console.log(`   • ${table.padEnd(22)} ${before.rows[0].n} → ${after.rows[0].n}`);
  }

  // Clean audit_log entries from resident/system actions; keep admin entries
  // so admin actions are traceable across demos.
  const auditBefore = await client.query(
    `select count(*)::int as n from audit_log where actor_type in ('resident','system','llm')`
  );
  await client.query(`delete from audit_log where actor_type in ('resident','system','llm')`);
  const auditAfter = await client.query(
    `select count(*)::int as n from audit_log where actor_type in ('resident','system','llm')`
  );
  console.log(`   • audit_log (resident+system+llm) ${auditBefore.rows[0].n} → ${auditAfter.rows[0].n}`);

  await client.end();

  console.log('\n   Reseeding fake conversations…\n');
  const here = dirname(fileURLToPath(import.meta.url));
  const result = spawnSync('npx', ['tsx', resolve(here, 'seed-fake-conversations.ts')], {
    stdio: 'inherit',
    shell: true
  });
  if (result.status !== 0) {
    console.error('   ✗ reseed failed');
    process.exit(1);
  }
  console.log('\n✓ Demo reset complete.\n');
}

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (!m) continue;
      const [, k, v] = m;
      if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, '');
    }
  } catch {
    // best-effort
  }
}

main().catch((e) => {
  console.error('reset failed', e);
  process.exit(1);
});
