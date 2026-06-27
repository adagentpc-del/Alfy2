# 23 · Deployment

**Canonical runbooks:** `docs/DEPLOYMENT.md` (policy), `docs/DEPLOY_API_RENDER.md` (API on Render),
`docs/DEPLOY_DASHBOARD_VERCEL.md` (dashboard on Vercel), `docs/SETUP_LIVE.md` (push + DB + local run).

## Summary
- **Dashboard (UI):** Vercel, static, served from `apps/web/` via root `vercel.json`. Live:
  https://alfy2.vercel.app. Deploys on push to `main`.
- **API:** Render, Node web service `alfie-api` from `render.yaml` (Blueprint). Build:
  `corepack enable && pnpm install --prod=false --no-frozen-lockfile`. Start:
  `pnpm --filter @alfy2/api exec tsx src/main.ts`. Binds `process.env.PORT`. Health: `/healthz`.
- **Database:** migrations applied **directly** via Supabase MCP (auto-deploy disabled).

## Gotchas (learned)
- Render must be a **Node** service (Python runtime fails: `requirements.txt` not found).
- Keep `pnpm-lock.yaml` current when adding deps (stale lockfile breaks frozen install).
- The gateway needs only `DATABASE_URL` + `SUPABASE_URL` (+ `ALFY_API_TOKEN` in token mode); the
  anon/service keys are optional.
