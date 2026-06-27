# Deploy the Alfie dashboard to Vercel

This puts the Alfie **dashboard UI** (`apps/web/index.html`) on a live, shareable URL. It is a
self-contained static page running on representative data for now; wiring it to live API data is the
next step (see bottom).

> Important: this is the **Alfy2** repo (`adagentpc-del/Alfy2`) — a *different* project from your
> existing `site-survey` Vercel project. Import it as its own new Vercel project.

## What's already prepared
- `vercel.json` at the repo root tells Vercel to **skip building the monorepo** and just serve the
  static dashboard from `apps/web/`. You don't need to configure anything in the Vercel UI.

## Steps

1. **Push** the latest commit (so `vercel.json` is on GitHub). In GitHub Desktop: click **Push origin**.

2. In **vercel.com → Add New… → Project**.

3. **Import** the **`Alfy2`** repository (not `site-survey`). If you don't see it, click *Adjust GitHub
   App Permissions* and grant Vercel access to the `Alfy2` repo.

4. On the configure screen, **leave everything default** — `vercel.json` already sets framework = none,
   no install, no build, output = `apps/web`. Just click **Deploy**.

5. When it finishes you'll get a URL like `alfy2-xxxx.vercel.app`. Open it → the **Mission Control**
   dashboard with the Inbox / Approvals / Founder tabs.

## If the build errors
The static config should prevent it, but if a deploy fails: in the Vercel project → **Settings →
Build & Deployment**, confirm **Framework Preset = Other**, **Build Command** and **Install Command**
are **Override = ON** with the values from `vercel.json` (`echo skip`), and **Output Directory =
`apps/web`**. Redeploy. (Send me the build error and I'll pinpoint it.)

## Making the dashboard show LIVE data (next step)
The dashboard currently renders representative data so you can see and react to the UX. To show real
numbers it needs to call the live API (`services/api`), which requires:
1. The API hosted somewhere that runs Node persistently (Render/Railway), with the `.env` set
   (`DATABASE_URL` + `SUPABASE_*` + `ALFY_DEFAULT_TENANT_ID`), **or** run locally with `pnpm dev`.
2. The UI pointed at that API base URL.
Say the word and I'll build that connection (a dev-friendly run mode + the UI fetch wiring) so the
dashboard fills with your real Supabase data.
