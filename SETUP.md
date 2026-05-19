# Setup Guide — Doral Citizen App (beginner-friendly)

Follow these steps **in order**. Don't skip ahead. Total time: ~90 minutes if everything works the first time. After each step, the **"You should see"** line tells you whether it worked.

If anything fails, copy the error message and paste it back to Claude — don't try to "push through".

---

## What you'll need before starting

- A web browser (Chrome / Edge)
- A phone you can receive SMS on
- An email address for service signups
- About 90 minutes of focused time

---

## Stage 1 — Open the project in PowerShell

### Step 1.1 — Open PowerShell

Press the **Windows key**, type `PowerShell`, hit Enter.

### Step 1.2 — Navigate to the project folder

Copy-paste this exact command (with the quotes), press Enter:

```powershell
cd "C:\Users\New Users\Downloads\Claude1\Doral AI Citizen Assistant Platform\doral-citizen-app"
```

**You should see:** your prompt now ends with `\doral-citizen-app>`. If you see "path not found", double-check that the folder exists at that exact location.

### Step 1.3 — Confirm Node.js is installed

```powershell
node --version
```

**You should see:** something like `v24.13.0` or `v20.x.x` or higher.
**If you see "not recognized":** install Node.js from <https://nodejs.org/> (pick the LTS version), then close PowerShell and reopen from Step 1.1.

---

## Stage 2 — Install project dependencies (10–15 min)

### Step 2.1 — Install all the packages

In the same PowerShell window, run:

```powershell
npm install
```

This downloads ~400 MB of packages. **It will take 5–15 minutes.** You'll see a lot of scrolling text — that's normal.

**You should see (at the end):** `added NNN packages in Xs` and your prompt back. A few yellow `npm warn` lines are fine; red `npm error` is a problem.

**If you see errors:**
- `EACCES` permission denied → close PowerShell, right-click PowerShell in the Start menu, choose "Run as administrator", repeat from Step 1.2
- `ENOTFOUND` / network → check your internet, try again
- Anything else → paste it to Claude

---

## Stage 3 — Set up Supabase (20 min)

Supabase is the database + auth + storage + serverless functions. Free tier is plenty for this PoC.

### Step 3.1 — Create a Supabase account

Go to <https://app.supabase.com/> in your browser. Click **Sign up**. Use GitHub or email — whichever is easier. Confirm your email if asked.

### Step 3.2 — Create a new project

1. Once logged in, click **New Project**.
2. Choose your organization (the default is fine).
3. Fill in:
   - **Name:** `doral-citizen-app` (anything works)
   - **Database password:** click the **Generate a password** button. **COPY THIS PASSWORD AND PASTE IT INTO A NOTEPAD** — you'll need it in Step 3.5. Save the notepad somewhere safe.
   - **Region:** pick one geographically close to you (e.g. `East US (Ohio)` for Florida)
   - **Pricing plan:** **Free**
4. Click **Create new project**.

**You should see:** a loading screen, then "Project is ready" after 1–3 minutes.

### Step 3.3 — Copy your API keys

When the project is ready:

1. In the left sidebar, click the **gear icon (Project Settings)**.
2. Click **API** in the settings menu.
3. You'll see three values you need to copy. Keep this tab open — you'll come back to it in Step 3.7.

The three values:
- **Project URL** (looks like `https://abcdefgh.supabase.co`)
- **Project API keys → anon public** (long string starting with `eyJ...`)
- **Project API keys → service_role** ← click "Reveal" to see this one (also `eyJ...`, but **never share this one publicly**)

### Step 3.4 — Find your project reference ID

In the URL of your Supabase dashboard, the part right after `project/` is your project ref. For example, if the URL is:

```
https://app.supabase.com/project/abcdefghijklmnop/settings/api
```

then `abcdefghijklmnop` is your project ref. Copy it to your notepad.

### Step 3.5 — Find your database connection string

1. In Project Settings, click **Database** (in the same settings menu).
2. Scroll to **Connection string** section.
3. Click the **URI** tab.
4. Click the copy icon. The string looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefgh.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the actual password you saved in Step 3.2.
6. Paste the final URL into your notepad.

### Step 3.6 — Install the Supabase CLI

Back in PowerShell:

```powershell
npm install -g supabase
```

**You should see:** `added 1 package` after a minute or two.

### Step 3.7 — Create your `.env.local` file

In PowerShell:

```powershell
copy .env.local.example .env.local
notepad .env.local
```

Notepad will open the file. Fill in these values from your Supabase dashboard (Step 3.3) and notepad:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co      ← Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                        ← anon public key
SUPABASE_SERVICE_ROLE_KEY=eyJ...                            ← service_role key
SUPABASE_DB_URL=postgresql://postgres:YOURPASSWORD@db...    ← connection string from Step 3.5
```

Leave the other values (GROQ_API_KEY, GEMINI_API_KEY, TWILIO_*) for now — we'll fill them in later stages.

**Save the file** (Ctrl+S) and close Notepad.

### Step 3.8 — Link the Supabase CLI to your project

In PowerShell:

```powershell
supabase login
```

This opens your browser. Click **Authorize**. Come back to PowerShell.

**You should see:** `You are now logged in.`

Then link your project (replace `<YOUR_PROJECT_REF>` with the ref from Step 3.4):

```powershell
supabase link --project-ref <YOUR_PROJECT_REF>
```

It'll ask for your database password (the one you saved in Step 3.2). Paste it (you won't see the characters as you type — that's normal). Press Enter.

**You should see:** `Finished supabase link.`

### Step 3.9 — Apply the database schema

```powershell
supabase db push
```

This runs the migration that creates all the tables.

**You should see:** something like `Applying migration 0001_init.sql... done.`

**If you see `extension "pgsodium" is not available`:**
1. Open `supabase\migrations\0001_init.sql` in Notepad.
2. Find the line `create extension if not exists pgsodium;`
3. Put two dashes in front: `-- create extension if not exists pgsodium;`
4. Save. Re-run `supabase db push`.

### Step 3.10 — Create your admin user in Supabase

1. Back in the Supabase dashboard, click **Authentication** in the left sidebar.
2. Click **Users**.
3. Click **Add user** → **Create new user**.
4. Email: `admin@doral.local` (or any email)
5. Password: pick something memorable — **save this password to your notepad too**, you'll log in with it later
6. Check **Auto Confirm User**.
7. Click **Create user**.

A new row appears with a long UUID. **Copy that UUID** to your notepad.

### Step 3.11 — Grant your user admin role in the app

1. In Supabase, click **SQL Editor** in the left sidebar.
2. Click **+ New query**.
3. Paste this (replace `YOUR_AUTH_UID` with the UUID you copied in Step 3.10):

```sql
insert into public.admin_users (auth_id, email, role, display_name)
values (
  'YOUR_AUTH_UID'::uuid,
  'admin@doral.local',
  'admin',
  'Demo Admin'
)
on conflict (auth_id) do update
  set role = excluded.role,
      display_name = excluded.display_name;
```

4. Click **Run** (top right, green button).

**You should see:** `Success. No rows returned.` or `1 row affected`.

---

## Stage 4 — Get the AI keys (5 min)

### Step 4.1 — Groq API key (free, very fast)

1. Go to <https://console.groq.com/keys>
2. Sign up (Google sign-in is fastest)
3. Click **Create API Key**, give it a name like `doral-poc`
4. **Copy the key immediately** — it starts with `gsk_...` — Groq only shows it once
5. Paste into your notepad

### Step 4.2 — Gemini API key (free)

1. Go to <https://aistudio.google.com/app/apikey>
2. Sign in with Google
3. Click **Create API key**
4. **Copy the key** — paste into your notepad

### Step 4.3 — Add both to `.env.local`

```powershell
notepad .env.local
```

Update these two lines:

```
GROQ_API_KEY=gsk_your-key-here
GEMINI_API_KEY=your-gemini-key-here
```

Save and close Notepad.

---

## Stage 5 — Set up Twilio (15 min)

### Step 5.1 — Sign up for Twilio trial

1. Go to <https://www.twilio.com/try-twilio>
2. Sign up. They'll ask for a real phone number to verify — use yours.
3. After verification, you'll land on the Twilio console.
4. Skip / Cancel any "Onboarding wizard" — go straight to the dashboard.

### Step 5.2 — Get a trial phone number

1. In the Twilio console, click **Phone Numbers → Manage → Buy a number** (or you may already have one assigned — look at the dashboard "Account info" panel).
2. If you need one: filter to **United States**, **SMS** capability. Click **Buy** on any number (trial credit covers it).
3. **Copy the phone number** (format: `+15551234567`) to your notepad.

### Step 5.3 — Copy your Twilio credentials

On the Twilio **Console dashboard** (home page), in the "Account Info" panel:

- **Account SID** — starts with `AC...`
- **Auth Token** — click the eye icon to reveal
- **My Twilio phone number** — the one from Step 5.2

Paste all three to your notepad.

### Step 5.4 — Verify YOUR phone number for trial SMS

Twilio trial accounts can only text **verified** numbers. Add yours (and any stakeholder phones you want to demo to on Friday):

1. In Twilio console: **Phone Numbers → Manage → Verified caller IDs**
2. Click **Add a new Caller ID**
3. Choose **Phone number**, enter your number with country code (e.g. `+15551234567`)
4. Twilio calls or texts you a 6-digit code
5. Enter the code in the Twilio form

Repeat for any other phone you want to demo to (max 2 for the PoC).

### Step 5.5 — Add Twilio creds to `.env.local`

```powershell
notepad .env.local
```

Update:

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+15555555555
TWILIO_VERIFIED_NUMBERS=+15555550001,+15555550002
```

`TWILIO_VERIFIED_NUMBERS` is a comma-separated list of every number you verified in Step 5.4 (no spaces between commas).

Save and close.

---

## Stage 6 — Push secrets and deploy backend functions (5 min)

### Step 6.1 — Send your secrets to Supabase Edge Functions

The Next.js app reads `.env.local` directly, but Supabase Edge Functions are separate — they need their own copy of the secrets. Run:

```powershell
supabase secrets set --env-file .env.local
```

**You should see:** `Finished supabase secrets set.`

### Step 6.2 — Deploy the chat-completion and send-sms functions

```powershell
npm run functions:deploy
```

(Equivalent to: `supabase functions deploy chat-completion send-sms`)

**You should see:** `Deployed Functions: chat-completion, send-sms` (and a URL for each).

**If you see "Docker not running":** you don't need Docker for cloud deploy. Try with the `--use-api` flag:

```powershell
supabase functions deploy chat-completion --use-api
supabase functions deploy send-sms --use-api
```

---

## Stage 7 — Run the app locally (5 min)

### Step 7.1 — Start the dev server

```powershell
npm run dev
```

**You should see:**
```
▲ Next.js 14.2.13
- Local:        http://localhost:3000
✓ Ready in 2.3s
```

**Leave this PowerShell window running.** Don't close it. The dev server keeps the app alive.

### Step 7.2 — Open the resident chat

In your browser: <http://localhost:3000>

**You should see:** the Doral chat widget with "Hi! I can help you find city services" and three suggested questions.

### Step 7.3 — Send your first message

Click one of the suggestions, OR type "How do I renew my business permit?", press Enter.

**You should see:** a typing indicator for a couple of seconds, then a response from the assistant.

The response is from Groq (powered by Llama 3.3 70B). The little tag under the message says `via groq`.

**If you see an error instead:** copy the error and paste to Claude. Common issues:
- `Both providers failed` → API keys wrong in Supabase secrets (re-run Step 6.1)
- `conversation upsert failed` → migration didn't run (re-run Step 3.9)
- The widget never responds at all → check the PowerShell window for red text

### Step 7.4 — Open admin in a new browser tab

Go to <http://localhost:3000/login>

Sign in with the email + password from Step 3.10.

**You should see:** the admin dashboard with KPI cards (Conversations: 1, Service requests: 0, Appointments: 0).

### Step 7.5 — Run the SMS smoke test

Open a **second** PowerShell window (keep the dev server running in the first one). Navigate to the project folder again:

```powershell
cd "C:\Users\New Users\Downloads\Claude1\Doral AI Citizen Assistant Platform\doral-citizen-app"
```

Run (replace `+15551234567` with your verified phone number from Step 5.4):

```powershell
npm run smoke -- --sms +15551234567
```

**You should see:** `[smoke] chat ok — provider=groq …` and `[smoke] sms ok — { sid: 'SM…' }`. And then **a text message arrives on your phone** that says "Doral smoke test — if you got this, Twilio is wired up."

---

## You're done with Monday! 🎉

Take a screenshot of the SMS arriving. That's proof Monday's foundation is solid:

- ✅ Database schema live
- ✅ Auth working
- ✅ Chat works (Groq → reply → message saved → admin sees it)
- ✅ Twilio sending real SMS to your phone

**Ping Claude with "Monday is green"** and I'll start Tuesday's work — adding RAG retrieval over real Doral content, bilingual support, and the appointment-booking workflow.

---

## Troubleshooting cheat sheet

| Problem | Fix |
|---|---|
| `cd: path not found` | Make sure you're typing the folder path inside double quotes |
| `npm: not recognized` | Install Node.js from nodejs.org, restart PowerShell |
| `supabase: not recognized` (after Step 3.6) | Try `npx supabase ...` instead of `supabase ...` |
| Notepad doesn't show file extensions | That's normal on Windows. `.env.local` may show as just `.env` — it's the same file |
| Migration fails on `pgsodium` | See Step 3.9 fallback — comment out that one line |
| Chat says "Both providers failed" | Re-run Step 6.1 (`supabase secrets set --env-file .env.local`) and redeploy functions |
| SMS not arriving | The number must be in `TWILIO_VERIFIED_NUMBERS` AND verified inside the Twilio console. If both, check Twilio logs at <https://console.twilio.com/us1/monitor/logs/sms> |
| Admin login says "not_admin" | Step 3.11 didn't run — re-run that SQL with the correct UUID |
| `npm run dev` crashes immediately | Read the error in the terminal. Usually a missing env var. Recheck `.env.local`. |

---

## A note on what NOT to do

- **Don't commit `.env.local` to git.** It contains real secrets. `.gitignore` already excludes it — leave it that way.
- **Don't share your `SUPABASE_SERVICE_ROLE_KEY` or `TWILIO_AUTH_TOKEN`.** They let anyone read/write your database or rack up your Twilio bill.
- **Don't close the PowerShell window running `npm run dev`** while you're testing — that stops the server.
