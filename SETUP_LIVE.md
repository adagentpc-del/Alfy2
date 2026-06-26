# Go Live — Setup Runbook

Get Alfy² running on your Supabase + GitHub so you can pull and update it from any computer or phone (any Claude Code / Cowork session connects to the same repo + database).

You'll do this once. The steps marked **[YOU]** need your credentials and only take a minute; everything else is already prepared.

---

## What's already done for you

- ✅ All 223 migrations are in `supabase/migrations/` (Supabase CLI / GitHub-integration ready).
- ✅ A single combined `infra/supabase/ALL_MIGRATIONS.sql` you can paste-and-run (no install needed).
- ✅ `.env.example` has the Supabase + tenant variables.
- ✅ `.gitignore` excludes `.env` and `node_modules` — secrets and deps won't be committed.
- ✅ The project has an initial git commit ready to push.

---

## Step 1 — Push the code to your GitHub repo  **[YOU]**

In a terminal, in your Alfy² project folder:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

(If `git remote add origin` says it already exists, run `git remote set-url origin <url>` instead.)

This is the portability win: the repo is now the single source of truth you can clone on any machine.

---

## Step 2 — Apply the database schema

Pick ONE option.

### Option A — Supabase SQL Editor (fastest, no install)
1. Supabase Dashboard → your project → **SQL Editor** → **New query**.
2. Open `infra/supabase/ALL_MIGRATIONS.sql`, copy ALL of it, paste, press **Run**.
3. It creates every table, RLS policy, and trigger in order. (Re-running is safe — it's idempotent.)

### Option B — Supabase CLI (repeatable from any device — recommended long-term)  **[YOU]**
```bash
npx supabase login            # opens browser to authorize
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase db push          # applies supabase/migrations in order, tracks history
```
Your `<YOUR_PROJECT_REF>` is the subdomain in your project URL (`https://<ref>.supabase.co`) — also under Dashboard → Settings → General.

After this, applying future schema changes from any machine is just `git pull` + `supabase db push`.

---

## Step 3 — Fill your environment  **[YOU]**

```bash
cp .env.example .env
```
Then open `.env` and paste, from Supabase Dashboard → **Settings → API**:
- `SUPABASE_URL` = your project URL (`https://<ref>.supabase.co`)
- `SUPABASE_ANON_KEY` = the `anon` / publishable key
- `SUPABASE_SERVICE_ROLE_KEY` = the `service_role` key  ⚠️ server-only, never commit, never paste into a client

And set your operator tenant:
- `ALFY_DEFAULT_TENANT_ID` = the seeded default tenant UUID (from `infra/supabase/seed/0001_default_tenant.sql`, applied with the migrations).

`.env` is gitignored, so these never leave your machine.

---

## Step 4 — Update it from any device

On any computer (or phone with a terminal / Claude Code):
```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
cp .env.example .env   # paste the same Supabase keys
```
You're now editing the same codebase against the same database. Push changes with `git push`; pull others' changes with `git pull`. Schema changes apply with `supabase db push`.

---

## The only things that need you (the human-only 5%)

| Action | Where | Why |
|---|---|---|
| GitHub push auth | Step 1 | Publishing code to your repo (your credentials) |
| Supabase login / link | Step 2B | Authorizing the CLI to your project |
| Paste the API keys | Step 3 | Secrets — they belong only in your local `.env` |

Everything else is prepared. Once Steps 1–3 are done, the database is live and the project is portable.

---

## What comes next (after this is live)

This stands up the **code + database**. To actually click "connect Move Mi's Gmail" and have engines read/write the real tables, the next build is the runtime layer: the Supabase repository adapters (so engines persist instead of using in-memory stores), `services/api` with auth + tenant/business context, and the real connector adapters behind the Connections Hub. Say the word and I'll build that next.
