# Doral Citizen Assistant — PoC

End-to-end working PoC for the City of Doral ITN 2025-20 AI-Powered Chatbot.
Demo target: **Friday 2026-05-22**.

> Sibling design pipeline (RFP analyst, AC author, Figma designer agents) lives
> in `../doral-poc-workflow/`. This folder is the buildable app.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, Framer Motion, Recharts, next-intl |
| Backend | Supabase (Postgres + pgvector + Edge Functions + Auth + Storage + Realtime) |
| LLM | Groq Llama 3.3 70B primary, Gemini 2.0 Flash fallback |
| Embeddings | Google `text-embedding-004` (768-dim) |
| SMS | Twilio Programmable SMS |
| Hosting | Vercel + Supabase Cloud |

---

## Monday-end setup (do this in order)

### 1. Install dependencies
```bash
cd doral-citizen-app
pnpm install
# or: npm install / yarn install
```
Requires Node 20+.

### 2. Create a Supabase project
1. <https://app.supabase.com> → New project (pick a region close to you).
2. Once it's up, in **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. In **Settings → Database**, copy the connection string → `SUPABASE_DB_URL`.

### 3. Run the migration
```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <YOUR_PROJECT_REF>
pnpm db:push
```
This applies `supabase/migrations/0001_init.sql` (schema, RLS, pgvector, RPC).

> If `pgsodium` isn't available on your Supabase plan, comment out
> `create extension if not exists pgsodium;` at the top of the migration and
> rerun.

### 4. Seed an admin user
1. In Supabase dashboard → **Authentication → Users → Add user**, create an
   email/password user (e.g. `admin@doral.local`).
2. Copy that user's UUID.
3. Open `supabase/seed/seed_admin.sql`, replace `YOUR_AUTH_UID`, paste into the
   Supabase SQL editor, run.

### 5. Get LLM keys
- **Groq**: <https://console.groq.com/keys> → `GROQ_API_KEY`
- **Gemini**: <https://aistudio.google.com/app/apikey> → `GEMINI_API_KEY`
  (the same key powers embeddings; `EMBED_API_KEY` defaults to it).

### 6. Get Twilio credentials
1. <https://console.twilio.com/> trial signup.
2. From the console: Account SID, Auth Token, Trial phone number.
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER` (E.164, e.g. `+15555555555`)
3. **Verify** 2 stakeholder phones in **Phone Numbers → Verified Caller IDs**.
4. Comma-separate them into `TWILIO_VERIFIED_NUMBERS`. The `send-sms` Edge
   Function will simulate sends to non-verified numbers so the demo never
   hard-fails on stage.

### 7. Populate `.env.local`
```bash
cp .env.local.example .env.local
# fill in every value
```

### 8. Set Supabase Edge Function secrets
Edge Functions read environment variables separately from the Next.js app.
Push the relevant keys:
```bash
pnpm dlx supabase secrets set --env-file .env.local
```
(Only the keys named in `_shared/*` and the function files are needed there;
the command is happy to set them all.)

### 9. Deploy the Edge Functions
```bash
pnpm functions:deploy
# equivalent to: supabase functions deploy chat-completion send-sms
```

### 10. Smoke test locally
In one terminal:
```bash
pnpm dev
```
In another:
```bash
pnpm smoke
# or with SMS:
pnpm smoke -- --sms +15555555555   # must be one of your verified numbers
```
Expected: `[smoke] chat ok — provider=groq latency=…ms` and an actual SMS on
the verified phone.

### 11. Visit the app
- Resident chat: <http://localhost:3000/>
- Admin login: <http://localhost:3000/login>
- Dashboard (after login): <http://localhost:3000/admin>

### 12. Deploy to Vercel (preview URL for stakeholder review)
1. <https://vercel.com/new> → import the `doral-citizen-app` directory
   (or push to GitHub and import).
2. In **Project Settings → Environment Variables**, paste in the values from
   `.env.local`. (At minimum: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.)
3. Deploy. Note the preview URL — that's what we'll demo Friday.

---

## What ships each day

| Day | Ships |
|---|---|
| Mon | Scaffold + schema + auth + chat round-trip + Twilio verified |
| Tue | RAG over seeded docs + bilingual quality + appointment-booking stub |
| Wed | Real SMS, service requests, CMS, announcements, audit log |
| Thu | Analytics, feedback, WCAG audit, polish, dry runs |
| Fri | Demo 🎬 |

Full plan: `../../.claude/plans/analysis-the-entire-rfp-memoized-wirth.md`.

---

## Project structure

```
doral-citizen-app/
├── app/
│   ├── (resident)/page.tsx       — resident chat landing
│   ├── (admin)/admin/…           — auth-gated dashboard
│   ├── login/page.tsx            — admin sign-in
│   ├── api/chat/route.ts         — Next.js proxy to Edge Function
│   └── layout.tsx                — root layout (next-intl provider, skip-link)
├── components/
│   ├── chat/{ChatWidget,LangToggle,setLocale}.tsx
│   └── admin/LogoutButton.tsx
├── lib/
│   ├── supabase/{client,server,admin}.ts
│   ├── i18n/request.ts
│   └── utils.ts
├── messages/{en,es}.json         — UI strings
├── middleware.ts                 — Supabase Auth session refresh
├── supabase/
│   ├── migrations/0001_init.sql
│   ├── seed/seed_admin.sql
│   └── functions/
│       ├── chat-completion/index.ts
│       ├── send-sms/index.ts
│       └── _shared/{llm-router,supabase,audit}.ts
├── scripts/smoke-eval.ts
├── styles/globals.css
├── .env.local.example
└── README.md  (this file)
```

---

## Pre-demo checklist (Thursday PM)

See the full checklist in the plan file. Highlights:
- [ ] Prod URL `/`, `/login`, `/admin` load < 2s cold.
- [ ] EN: "How do I renew my permit?" → grounded answer with citation.
- [ ] ES: same question → grounded ES answer.
- [ ] `?forceFail=groq` → Gemini answers; `llm_provider` field correct.
- [ ] Appointment booking E2E → real SMS arrives on a pre-verified phone.
- [ ] axe-core: zero serious/critical findings on resident + admin pages.
- [ ] Keyboard-only walk-through works.
- [ ] Loom recording of the full demo on hand as a worst-case fallback.

---

## Troubleshooting

- **`Both providers failed` error in chat** → Check `GROQ_API_KEY` and
  `GEMINI_API_KEY` in Edge Function secrets (`supabase secrets list`). Edge
  Functions don't read `.env.local`.
- **`relation "match_chunks" does not exist`** → Re-run `pnpm db:push`. The
  RPC ships in migration 0001.
- **Twilio trial says "unverified" target** → Either verify the number in
  Twilio console or accept the `{simulated: true}` response — the demo flow
  still shows in-app confirmation.
- **Spanish answers come back in English** → Confirm the locale cookie is
  being set (`NEXT_LOCALE=es`) and that the chat request body includes
  `lang: 'es'`. The LLM follows the system prompt's language directive.
