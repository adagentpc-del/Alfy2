# 13 · Changelog

**Canonical, detailed changelog:** `docs/CHANGELOG.md` (prepended newest-first). This file is the
high-level rollup. After completing work, append an entry here AND a detailed one in `docs/CHANGELOG.md`.

Format per entry: **what changed · why · files · risks · next recommendation.**

## Rollup (newest first)
- **Enterprise Command Center v2 (functional layer):** build-free static SPA (ADR-0127) with 8 screens —
  command center (8 cards + next-best-action), agent cabinet (16 execs + 10 portfolio agents, full
  dossiers), portfolio (11 companies) + Company OS Viewer, Approval Center (approve/deny work against
  local preview state), weekly operating report generator, Obsidian-style Brain Center graph. Mock data
  + service layer (`apps/web/assets/{data,services}.mjs`, smoke `pnpm ui:smoke`); Vercel rewrite for
  real paths. *Risks:* preview-only mutations (localStorage), live hook limited to mission-control tile.
  *Next:* wire services.mjs to the live API view-by-view (Day 2 of the five-day plan).
- **Enterprise OS layer (audit + 21 docs + GTM factory + dashboard retheme):** deep build audit
  (`docs/BUILD_AUDIT_CURRENT_STATE.md`), enterprise spine + agent cabinet/registry/authority/reporting/
  cadence/KPI docs + 12 system specs + `docs/FIVE_DAY_COMPLETION_PLAN.md`, all indexed in
  `docs/DOCUMENTATION.md`; naming settled as **Alfy2**; new `gtm-factory` module (contract + engine +
  `pnpm gtm:smoke`, approval classes on every external step); dashboard rethemed ivory/navy/gold +
  dynamic date + Alfy2 brand. *Why:* the enterprise layer was built but unnavigable, GTM was the one
  missing module, UI was off-brand. *Risks:* none live (docs + in-memory module + CSS values).
  *Next:* Day 1 of the five-day plan (Render re-sync + demo seed).
- **Deploy fixes:** regenerated `pnpm-lock.yaml` (hono/jose) + `--no-frozen-lockfile`; made
  `SUPABASE_ANON_KEY`/`SERVICE_ROLE_KEY` optional (gateway boots without them); Render blueprint +
  token-auth mode + CORS + `process.env.PORT` binding. *Risk:* token auth is single-operator. *Next:*
  re-sync Render, connect dashboard.
- **Dashboard live on Vercel** (alfy2.vercel.app) + a **Connect** button that pulls live Mission Control
  data with a personal token (stored in-browser only).
- **AI-Org runtime:** delegation packets + report-back persisted; `/org/*` routes; "no work without an
  accepted packet" enforced.
- **R6 Revenue OS:** RevOps brief + fastest-path-to-cash, Decision Engine (13 lenses), Capital
  Allocation (Profit-First, recommend-only). Migrations 0242–0243.
- **R5 FounderOS** (capacity → work mode), **R1 Mission Control** (snapshot/brief/persistent alerts),
  **R0 gateway** (auth → tenant → approval gate → inbox). Migrations 0239–0241.
- **Bug-fix scan:** bound+consume approval tokens (security), UUID-validate business_id (400 not 500),
  tenant predicates on the mission-control read-model, clean `/org/reports` error semantics.
- Earlier: ~179 domain engines + 245-table schema built and applied live (see `docs/CHANGELOG.md`).
