# Host the Alfie API on Render

This puts the API gateway (`services/api`) on a live URL so the dashboard at `alfy2.vercel.app` can
show your real Supabase data. `render.yaml` at the repo root is a Blueprint — Render reads it and sets
everything up; you only paste the secret values.

## One-time setup

1. **Generate a personal API token.** Any long random string (this is your private key to the API).
   On a Mac terminal: `openssl rand -hex 24` and copy the result. Keep it somewhere safe.

2. **Render → New → Blueprint.** Connect your GitHub and pick the **`Alfy2`** repo. Render detects
   `render.yaml` and proposes a service named **`alfie-api`**. Click **Apply**.

3. **Fill the secret env vars** (Render will prompt for the ones marked "sync: false"):
   - `ALFY_API_TOKEN` = the random token from step 1
   - `DATABASE_URL` = your Supabase **Transaction pooler** connection string (port 6543), with the
     password filled in (Supabase → Connect)
   - `SUPABASE_URL` = `https://oxromxpjoiifvamxjluz.supabase.co`
   - `SUPABASE_ANON_KEY` = your publishable/anon key (Supabase → Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` = your secret/service_role key (Supabase → Settings → API)
   (The non-secret ones — `ALFY_ENV`, `ALFY_DEFAULT_TENANT_ID`, `ALFY_AUTH_MODE`, `ALFY_CORS_ORIGINS` —
   are already set by the Blueprint.)

4. **Deploy.** Render builds (`pnpm install`) and starts the service. When it's live you get a URL like
   `https://alfie-api.onrender.com`.

5. **Verify it's up:** open `https://alfie-api.onrender.com/healthz` in a browser → you should see
   `{"ok":true}`. No token needed for health.

## Connect the dashboard to it

On `alfy2.vercel.app`, click **Connect** (top of the page), paste your **API URL**
(`https://alfie-api.onrender.com`) and your **API token**, and Save. The dashboard stores them in your
browser only (never on the page) and starts pulling live Mission Control data.

## Notes & safety

- **Auth:** the service runs in `token` mode — every request must carry your `ALFY_API_TOKEN`. The token
  lives in Render's env and in your browser's local storage only; it is never in the repo or the public
  page. For multi-user later, switch `ALFY_AUTH_MODE` to `jwks` (real Supabase logins).
- **Money stays safe:** the gateway's approval gate and the recommend-only capital rules are enforced
  server-side regardless of who calls it.
- **Free plan** spins the service down when idle, so the first request after a pause takes ~30s to wake.
  Upgrade the plan to keep it warm.
- **CORS** already allows `alfy2.vercel.app`, any `*.vercel.app` preview, and localhost. To allow another
  origin, edit `ALFY_CORS_ORIGINS` in Render.
