# Deploy Guide — Doral Citizen App (beginner-friendly)

You're going to put the app on the internet at a real URL like
`https://doral-citizen-app.vercel.app` so anyone (stakeholders, your phone, the
demo laptop) can use it without you running `npm run dev` first.

**Total time:** ~45 minutes if everything goes smoothly. Most of it is waiting
for Vercel to build and you copy-pasting environment variables.

**What you'll get at the end:**
- A live URL for the resident chat (`/`) and admin portal (`/admin`)
- Auto-deploys: every time you push code to GitHub, Vercel rebuilds and ships

If anything errors out, copy the error message and ping back. Don't try to push through.

---

## What you'll need before starting

- The local app works (you can run `npm run dev` and chat with the bot)
- You're signed in to GitHub
- Your `.env.local` file is filled in with real values (Supabase, Gemini)
- About 45 minutes of focused time

---

## Stage 1 — Pre-flight check (3 min)

Open PowerShell and navigate to the project:

```powershell
cd "C:\Users\New Users\Downloads\Claude1\Doral AI Citizen Assistant Platform\doral-citizen-app"
```

Confirm the dev server starts and works:

```powershell
npm run dev
```

**You should see:** `✓ Ready in Xs` and `http://localhost:3001` (or 3000).

Open the URL in a browser, ask the bot "What are city hall hours?" and confirm
you get a grounded answer. Stop the dev server with **Ctrl + C** in PowerShell
when done — Vercel will run its own server.

---

## Stage 2 — Initialize git and make the first commit (5 min)

The `doral-citizen-app/` folder isn't a git repository yet. Let's make it one.

### Step 2.1 — Check git is installed

```powershell
git --version
```

**You should see:** something like `git version 2.43.0` or higher.
**If you see "not recognized":** install Git from <https://git-scm.com/download/win>, then restart PowerShell.

### Step 2.2 — Tell git who you are (first time only)

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Use the email that matches your GitHub account.

### Step 2.3 — Initialize the repo

```powershell
git init -b main
```

**You should see:** `Initialized empty Git repository in ...`.

### Step 2.4 — Verify nothing sensitive will be committed

```powershell
git status
```

**Important check:** scroll through the file list. You should see:
- ✅ `app/`, `components/`, `lib/`, `supabase/`, etc. listed
- ❌ NO `.env.local`, `.env`, `node_modules/`, or `.next/` listed

If you see `.env.local` in the list, **STOP**. Your `.gitignore` isn't doing
its job. Type `cat .gitignore` and paste the output here.

### Step 2.5 — First commit

```powershell
git add .
git commit -m "Initial commit — Doral citizen assistant PoC"
```

**You should see:** something like `[main (root-commit) abc1234] Initial commit — Doral citizen assistant PoC` with a list of changed files.

---

## Stage 3 — Create the GitHub repo and push (10 min)

Two paths — pick the easier one for you.

### Option A: GitHub website (most beginner-friendly)

1. Open <https://github.com/new> in your browser.
2. **Repository name:** `doral-citizen-app`
3. **Description:** `City of Doral citizen assistant — PoC`
4. **Visibility:** **Private** (recommended — keeps the code internal)
5. **Do NOT** check "Add a README", "Add .gitignore", or "Choose a license"
   (your local repo already has these — adding them on GitHub creates a conflict)
6. Click **Create repository**.

You'll see a "Quick setup" page with commands. Copy the SSH or HTTPS URL it shows.

Back in PowerShell:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/doral-citizen-app.git
git push -u origin main
```

(Replace `YOUR_USERNAME` with your GitHub username.)

The first time you push, Git will pop up an auth window. Sign in with your
browser when prompted, or paste a Personal Access Token.

**You should see:** something like `* [new branch] main -> main`.

### Option B: GitHub CLI (faster if installed)

```powershell
gh --version
```

If installed (`gh version 2.x.x`), then:

```powershell
gh auth login
gh repo create doral-citizen-app --private --source=. --remote=origin --push
```

That single command creates the repo on GitHub, links it as your remote, and pushes.

### Step 3.x — Confirm the code is on GitHub

Open `https://github.com/YOUR_USERNAME/doral-citizen-app` in your browser.

**You should see:** all your folders + a README-less file tree.

**Critical check:** click around. Make sure you DON'T see `.env.local` in the
list. If you do, you accidentally committed your secrets. Stop and tell me.

---

## Stage 4 — Sign up for Vercel + connect GitHub (5 min)

### Step 4.1 — Sign up

1. Go to <https://vercel.com/signup>
2. Click **Continue with GitHub** (uses your GitHub account, no separate password)
3. Authorize Vercel to access your GitHub account
4. Pick the **Hobby (Free)** plan — it's the only one you need for the demo

You'll land on the Vercel dashboard.

### Step 4.2 — Install the Vercel GitHub app

The first time, Vercel will ask "Where to install?":

- Choose **Only select repositories**
- Pick **doral-citizen-app**
- Click **Install**

This lets Vercel see your repo (and only that repo).

---

## Stage 5 — Import the project (3 min)

1. On the Vercel dashboard, click **Add New… → Project**
2. You'll see a list of GitHub repos. Find **doral-citizen-app** and click **Import**.
3. Vercel auto-detects:
   - **Framework Preset:** Next.js (already set — don't change)
   - **Root Directory:** `./` (the repo root — already correct)
   - **Build Command:** `next build` (default — leave it)
   - **Output Directory:** `.next` (default — leave it)
4. **Do NOT click Deploy yet.** First, set environment variables in Stage 6.

---

## Stage 6 — Add environment variables (10 min)

This is where most beginners get stuck. Take your time.

### Step 6.1 — Open your local `.env.local`

In PowerShell:

```powershell
notepad .env.local
```

You'll need to copy values from this file into Vercel.

### Step 6.2 — In Vercel, expand the "Environment Variables" section

Still on the import page. Scroll down to find **Environment Variables**.

For **each** of the variables below, do:
1. Type the **Name** (left field) — exact spelling matters
2. Paste the **Value** (right field) — copy from `.env.local`
3. Make sure all three environments are checked: **Production**, **Preview**, **Development**
4. Click **Add another** to add the next one

### Step 6.3 — The 8 variables to add

| Name | Where to find the value in `.env.local` | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | line starting `NEXT_PUBLIC_SUPABASE_URL=` | e.g. `https://clfbnyfbuxbbgjwjvpvr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | line starting `NEXT_PUBLIC_SUPABASE_ANON_KEY=` | long `eyJ...` string |
| `SUPABASE_SERVICE_ROLE_KEY` | line starting `SUPABASE_SERVICE_ROLE_KEY=` | another long `eyJ...` string — **sensitive** |
| `GEMINI_API_KEY` | line starting `GEMINI_API_KEY=` | starts with `AIza...` |
| `GEMINI_MODEL` | line starting `GEMINI_MODEL=` | e.g. `gemini-2.5-flash-lite` |
| `GEMINI_MODELS` | line starting `GEMINI_MODELS=` | the comma-separated chain |
| `EMBED_API_KEY` | line starting `EMBED_API_KEY=` | usually same as `GEMINI_API_KEY` |
| `PRIMARY_LLM` | line starting `PRIMARY_LLM=` | usually `gemini` |

**Do NOT add:** `SUPABASE_DB_URL` (only needed locally by scripts; never used by the deployed app).
**Do NOT add:** Twilio variables (we deferred SMS for the PoC).

### Step 6.4 — Verify, then Deploy

Double-check spelling on every variable name. Then click **Deploy** at the bottom of the page.

**You should see:** a build log scrolling by. The build takes 2–5 minutes the first time. Watch for:
- `Cloning github.com/...` (Vercel fetches your code)
- `Running "npm install"` (installs dependencies)
- `Running "next build"` (builds the app)
- `Compiled successfully` ✅
- A deployment URL like `doral-citizen-app-abc123.vercel.app`

If the build fails, see the **Troubleshooting** section at the bottom.

---

## Stage 7 — Update Supabase Auth allowlist (3 min)

Your local app uses `http://localhost:3001` for auth callbacks. The deployed app
uses your new Vercel URL. Supabase needs to know about it.

1. Open your Supabase dashboard: <https://supabase.com/dashboard/project/clfbnyfbuxbbgjwjvpvr/auth/url-configuration>
   (replace the project ref if yours is different)
2. **Site URL:** change to your Vercel URL (e.g. `https://doral-citizen-app-abc123.vercel.app`)
3. **Redirect URLs:** add the same URL plus a wildcard:
   ```
   https://doral-citizen-app-abc123.vercel.app
   https://doral-citizen-app-abc123.vercel.app/**
   http://localhost:3001
   http://localhost:3001/**
   ```
   (Keep both prod and local so you can still develop locally.)
4. Click **Save**.

**You should see:** "URL configuration updated".

---

## Stage 8 — Smoke-test the deployed app (5 min)

Open your Vercel URL in a fresh browser tab (or incognito for a clean test).

### Test the resident chat

1. Visit `https://YOUR-PROJECT.vercel.app/`
2. The chat widget should load with the Doral header, animated skyline, wave 👋
3. Type **"How do I renew my permit?"** → expect a grounded answer in ~3 seconds
4. Toggle to Spanish → ask **"¿Cómo renuevo mi permiso?"** → expect Spanish answer
5. Wait 18 seconds → idle entertainment card should appear
6. Type your name in the prompt → save → "Hi, {name}" pill appears

### Test the admin portal

1. Visit `https://YOUR-PROJECT.vercel.app/login`
2. Sign in with `admin@doral.local` / your admin password
3. Dashboard loads with KPI sparkline cards, sentiment donut, activity feed
4. Navigate to `/admin/conversations` → your test chat appears at the top
5. Navigate to `/admin/announcements` → click "+ New announcement" → fill in English + Spanish → publish
6. Open the resident chat in another tab → the announcement banner appears in real time (Supabase Realtime over the deployed URL)
7. Navigate to `/admin/knowledge` → edit any doc → save & re-index → confirm toast "Saved and re-indexed · N chunks"

### Test the LLM router robustness (the demo close)

In an incognito tab, visit `https://YOUR-PROJECT.vercel.app/` and chat with the bot.
The console at `/admin/audit` should show `llm.call` entries with `attempts_before_success`
showing which Gemini model was used.

If everything works — **you're deployed.** 🎉

Save the URL somewhere visible (sticky note, Slack message to yourself, browser bookmark)
so you can find it for Friday's demo.

---

## Optional next steps (not needed for the demo)

### Connect a custom domain

In your Vercel project → **Settings → Domains** → add `chat.cityofdoral.com` (or any
domain you control). Vercel walks you through the DNS records.

### Enable Vercel Analytics

Vercel project → **Analytics** → **Enable**. Free for hobby projects. Tracks real user
performance metrics (no PII).

### Set up preview deploys for feature branches

When you push to a non-`main` branch (e.g. `feature/sms`), Vercel automatically
deploys it to a unique preview URL. Already enabled by default once you connect
GitHub — just push a feature branch to try it.

### Limit auto-deploys to `main` only

Vercel project → **Settings → Git** → under "Ignored Build Step", set:
```
git diff --quiet HEAD^ HEAD ./
```
Only commits that actually change files in the project root will trigger builds.

---

## Troubleshooting

### Build fails: "Module not found"
Vercel can't find a package. Usually means it's a peer dep that wasn't installed locally either.
- Locally run `npm install`
- Run `npm run build` locally — does the same error happen?
- If yes, install the missing package: `npm install <name>`
- Commit, push, Vercel auto-builds again

### Build fails: "Missing environment variable"
A required env var isn't set in Vercel.
- Go to **Settings → Environment Variables** in your Vercel project
- Check the spelling against the table in Stage 6
- Re-deploy from the **Deployments** tab → click the latest deploy → **Redeploy**

### Chat returns "llm unavailable" on production
The Gemini key works (you verified locally), but Vercel isn't using it.
- Confirm `GEMINI_API_KEY` is set in Vercel env vars
- Check Vercel **Logs** for the failed `/api/chat` request — it'll show the actual error
- Remember: `chat-completion` runs on Supabase Edge Functions, not Vercel. Confirm Supabase secrets are still set (`npx supabase secrets list`). Vercel only proxies; it doesn't run the LLM call itself.

### Admin login fails: "redirect URL not in allowlist"
You forgot Stage 7.
- Go to Supabase **Authentication → URL Configuration**
- Add your Vercel URL to **Site URL** and **Redirect URLs**

### Realtime announcement banner not appearing on prod
- Open the production resident chat in one tab
- Open the production admin announcements in another tab, publish one
- Banner should appear within ~5 seconds
- If not: check Vercel **Logs** for any 401/403 from Supabase. Most likely cause: the anon key in Vercel env vars doesn't match the one in your Supabase project. Verify both.

### "vercel.app" URL is fine, but I want a shorter URL
Rename the project in **Settings → General → Project Name**. The URL becomes `https://<new-name>.vercel.app`.

### Where do I see logs from production traffic?
- Vercel: **Logs** tab → real-time stream of every request to your Vercel routes
- Supabase: **Edge Functions → chat-completion → Logs** for the LLM-router calls
- Database queries: **Supabase → Database → Logs**

### I want to rollback to a previous deploy
Vercel **Deployments** tab → find the deploy that was working → **⋮ menu → Promote to Production**. Takes ~10 seconds.

---

## You're live 🚀

Going forward:
- Edit code locally → `git add` + `git commit` + `git push`
- Vercel builds automatically (you'll get an email + a Vercel dashboard notification when ready)
- New URL after every deploy: same `https://<project>.vercel.app` for production, plus a unique preview URL per push you can share for stakeholder review

For demo day rehearsal, just use your Vercel URL in two browser windows (resident + admin) and run through the 6-minute demo script.

If something breaks during rehearsal, you have ~10 seconds to rollback to a known-good deploy.
