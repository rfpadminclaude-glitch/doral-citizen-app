/**
 * seed-fake-conversations.ts
 *
 * Generates ~30 synthetic conversations spread across the last 7 days so the
 * analytics dashboard looks alive for the demo. Each fake conversation is
 * tagged with metadata.fake=true so demo-reset can remove them safely.
 *
 * Usage:
 *   pnpm tsx scripts/seed-fake-conversations.ts
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_DB_URL from .env.local.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

loadEnv();

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error('SUPABASE_DB_URL missing in .env.local');
  process.exit(1);
}

const SAMPLES = {
  en: [
    {
      question: 'How do I renew my business permit?',
      answer:
        'You can renew your Business Tax Receipt online at services.cityofdoral.com or in person at City Hall before September 30 to avoid late fees.',
      intent: 'permit',
      sentiment: 'neutral'
    },
    {
      question: 'When is trash pickup on NW 41st?',
      answer:
        'Trash on streets north of NW 41st is collected Mondays and Thursdays; south of NW 41st is Tuesdays and Fridays.',
      intent: 'general_chat',
      sentiment: 'neutral'
    },
    {
      question: 'There is a huge pothole on NW 50th, who fixes it?',
      answer:
        "Sorry to hear that. I'll open a service request with Public Works. They typically respond within 3 business days.",
      intent: 'code_violation',
      sentiment: 'frustrated'
    },
    {
      question: 'Can I book an inspection for next week?',
      answer:
        'Yes! Please pick a slot in the appointment calendar and we will confirm.',
      intent: 'appointment',
      sentiment: 'positive'
    },
    {
      question: 'What are the hours of City Hall?',
      answer:
        'City Hall is open Monday through Friday from 8 AM to 4 PM at 8401 NW 53rd Terrace.',
      intent: 'general_chat',
      sentiment: 'neutral'
    },
    {
      question: 'How much does a building permit cost?',
      answer:
        'Residential remodels typically run $150 to $1,200 based on valuation; roof permits are around $200 to $400.',
      intent: 'permit',
      sentiment: 'neutral'
    },
    {
      question: 'I want to file a complaint about a neighbor blocking my driveway',
      answer:
        "Got it — I'll log that with Code Enforcement. An officer should follow up within 3 business days.",
      intent: 'code_violation',
      sentiment: 'negative'
    },
    {
      question: 'Are there events for Memorial Day weekend?',
      answer:
        'Yes — the Doral Family Picnic at Doral Meadow Park is happening Memorial Day weekend. Free parking shuttle from outlying lots.',
      intent: 'general_chat',
      sentiment: 'positive'
    },
    {
      question: 'My kid lost a backpack at Veterans Park — can I report it?',
      answer:
        "I'll route this to Parks & Recreation. Lost items are usually held for 30 days at the rec center office.",
      intent: 'park_issue',
      sentiment: 'negative'
    }
  ],
  es: [
    {
      question: '¿Cómo renuevo mi permiso de negocio?',
      answer:
        'Puedes renovar tu BTR en línea en services.cityofdoral.com o en persona en el Ayuntamiento antes del 30 de septiembre.',
      intent: 'permit',
      sentiment: 'neutral'
    },
    {
      question: '¿Cuál es el horario del Ayuntamiento?',
      answer:
        'El Ayuntamiento abre de lunes a viernes de 8 AM a 4 PM en 8401 NW 53rd Terrace.',
      intent: 'general_chat',
      sentiment: 'neutral'
    },
    {
      question: 'Quiero reportar un bache enorme en NW 50th',
      answer:
        'Lo siento. Voy a abrir una solicitud con Obras Públicas. Responderán en 3 días hábiles.',
      intent: 'code_violation',
      sentiment: 'frustrated'
    },
    {
      question: 'Quiero agendar una inspección',
      answer:
        '¡Perfecto! Elige un horario en el calendario y confirmaremos.',
      intent: 'appointment',
      sentiment: 'positive'
    }
  ]
} as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(p: number): boolean {
  return Math.random() < p;
}

function isoOffset(daysAgo: number, hoursOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(9 + hoursOffset, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

const SENTIMENT_BIAS = ['positive', 'neutral', 'neutral', 'neutral', 'negative', 'frustrated', 'positive'];

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('connected');

  const generatedAt = new Date().toISOString();
  let convCount = 0;
  let msgCount = 0;
  let srCount = 0;
  let apptCount = 0;
  let fbCount = 0;

  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const lang: 'en' | 'es' = chance(0.7) ? 'en' : 'es';
    const sessionId = `demo_${randomUUID()}`;
    const sample = pick(SAMPLES[lang]);
    const startedAt = isoOffset(daysAgo);
    const sentiment = sample.sentiment;

    const convRes = await client.query<{ id: string }>(
      `insert into conversations
        (session_id, channel, lang, resident_name, started_at, last_activity_at, overall_sentiment, status)
       values ($1, 'web', $2, $3, $4, $4, $5, 'active')
       returning id`,
      [
        sessionId,
        lang,
        chance(0.5) ? pick(['Maria', 'Jose', 'Lin', 'Ahmed', 'Priya', 'Carlos', 'Aisha', 'Diego']) : null,
        startedAt,
        sentiment
      ]
    );
    const convId = convRes.rows[0].id;
    convCount++;

    // 1 user + 1 assistant pair (the main intent), sometimes a follow-up
    const exchanges = chance(0.4) ? 2 : 1;
    let assistantMsgId: string | null = null;
    for (let e = 0; e < exchanges; e++) {
      const at = isoOffset(daysAgo, e);
      await client.query(
        `insert into messages (conversation_id, role, content, lang, created_at)
         values ($1, 'user', $2, $3, $4)`,
        [convId, sample.question, lang, at]
      );
      msgCount++;
      const aRes = await client.query<{ id: string }>(
        `insert into messages (conversation_id, role, content, lang, sentiment, llm_provider, latency_ms, created_at)
         values ($1, 'assistant', $2, $3, $4, 'gemini', $5, $6)
         returning id`,
        [
          convId,
          sample.answer,
          lang,
          pick(SENTIMENT_BIAS),
          800 + Math.floor(Math.random() * 2000),
          at
        ]
      );
      assistantMsgId = aRes.rows[0].id;
      msgCount++;
    }

    // Sometimes create a service request
    if (sample.intent !== 'appointment' && sample.intent !== 'general_chat' && chance(0.6)) {
      await client.query(
        `insert into service_requests
          (conversation_id, request_type, title, description, status, priority, resident_name, resident_contact, created_at)
         values ($1, $2, $3, $4, $5, 'normal', $6, $7, $8)`,
        [
          convId,
          sample.intent,
          sample.question.slice(0, 60),
          sample.answer,
          pick(['new', 'new', 'in_progress', 'resolved']),
          pick(['Jane Doral', 'Carlos M.', 'Maria L.', 'Ahmed K.']),
          pick(['+13055550111', '+13055550112', 'jane@example.com']),
          startedAt
        ]
      );
      srCount++;
    }

    // Sometimes create an appointment
    if (sample.intent === 'appointment' || chance(0.25)) {
      const slot = new Date(startedAt);
      slot.setDate(slot.getDate() + Math.floor(Math.random() * 5) + 1);
      slot.setHours(9 + Math.floor(Math.random() * 7), 0, 0, 0);
      const end = new Date(slot);
      end.setMinutes(45);
      await client.query(
        `insert into appointments
          (conversation_id, appointment_type, slot_start, slot_end, resident_name, resident_contact, status, created_at)
         values ($1, $2, $3, $4, $5, $6, 'booked', $7)`,
        [
          convId,
          pick(['permit_renewal', 'consultation', 'inspection']),
          slot.toISOString(),
          end.toISOString(),
          pick(['Jane Doral', 'Carlos M.', 'Maria L.']),
          pick(['+13055550111', '+13055550112']),
          startedAt
        ]
      );
      apptCount++;
    }

    // 50% chance to leave feedback
    if (assistantMsgId && chance(0.5)) {
      const rating = chance(0.75) ? 5 : 1;
      await client.query(
        `insert into feedback_ratings (conversation_id, message_id, rating, comment, created_at)
         values ($1, $2, $3, $4, $5)`,
        [
          convId,
          assistantMsgId,
          rating,
          rating === 1 ? pick(['Answer was vague', 'Needed more detail', 'Wrong info']) : null,
          startedAt
        ]
      );
      fbCount++;
    }
  }

  // Mark seeded run via audit_log
  await client.query(
    `insert into audit_log (actor_type, action, entity_type, metadata)
     values ('system', 'demo.seed', 'conversations', $1)`,
    [JSON.stringify({ fake: true, generated_at: generatedAt, count: convCount })]
  );

  console.log(
    `seeded: ${convCount} conversations, ${msgCount} messages, ${srCount} service requests, ${apptCount} appointments, ${fbCount} feedback`
  );
  await client.end();
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
  console.error('seed failed', e);
  process.exit(1);
});
