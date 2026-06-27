# 11 · Active Sprint

**Sprint goal:** the dashboard at alfy2.vercel.app shows the founder's **real Supabase data**, served by
the hosted API.

## In progress
- [ ] Render `alfie-api` deploy green (lockfile fix pushed → Manual sync).
- [ ] Env vars on `alfie-api`: `ALFY_API_TOKEN`, `DATABASE_URL`, `SUPABASE_URL`. **[needs Alyssa]**
- [ ] Verify `https://alfie-api….onrender.com/healthz` → `{"ok":true}`.
- [ ] Dashboard → **Connect** → Render URL + token → live Mission Control tiles.
- [ ] Delete the old broken Python `Alfy2` Render service.

## Next up (this/next sprint)
- [ ] Release 3 — Move Mi email connector (inbound → context-scoped inbox_items). **[needs email creds + Alyssa approval for sends]**
- [ ] Wire revops/decisions/capital/org tabs in the dashboard to their live endpoints.
- [ ] services/orchestrator — first scheduled job (daily brief).

Full ordered plan: `docs/ALFIE2_BUILD_QUEUE.md` and `docs/ALFIE_RELEASE_PLAN.md`.
