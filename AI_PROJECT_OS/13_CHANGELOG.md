# 13 · Changelog

**Canonical, detailed changelog:** `docs/CHANGELOG.md` (prepended newest-first). This file is the
high-level rollup. After completing work, append an entry here AND a detailed one in `docs/CHANGELOG.md`.

Format per entry: **what changed · why · files · risks · next recommendation.**

## Rollup (newest first)
- **Platform Registry (Forge MVP feature #1):** `/forge/registry` — 15 seeded platforms × the 24
  contract fields (providers, secrets location, backups, risks, owner, next action…); status +
  compliance/privacy risk badges; missing-infrastructure warnings (65 across the ledger at seed —
  honest); per-platform **provider switch** (audited); **"Migrate to Divini Forge"** drafts a
  reversible dual-run cutover plan (preconditions + per-provider steps + rules, sets next_action);
  Open Platform / Generate docs / Add Platform actions. Existing builds live as-is; nothing migrates
  without tokens. `pnpm forge:smoke` scenario 6 covers the registry.
- **Alfy Forge / Divini Sovereign Cloud (Phase 1):** `/forge` + `apps/web/assets/forge.mjs` — private
  build-cloud layer: 12-question New Platform Wizard → **24-step pipeline** (6 source-of-truth docs,
  scaffold, Drizzle schema w/ WebAuthn + RLS notes, migrations, env template, storage/auth/email
  configs, deploy service, backup policy — infra steps as execution packets, remote deploys
  deploy-class gated); **reference-only secrets vault** (raw material rejected; AI exposure off by
  default, reasoned grants audited); **platform registry** (12 existing platforms + SaaS dependency
  maps + honest migration-readiness scoring + task generation); 17 dashboard sections with truthful
  phase labels (Forgejo P2 → k3s P9); **14-agent infrastructure desk** under the CTO. Plan:
  `docs/ALFY_FORGE_IMPLEMENTATION_PLAN.md` (20 sections). Readiness now 46 checks. `pnpm forge:smoke`.
- **Divini Pay (privacy-first payment OS, Phase 1 Lite mock):** `/pay` + `apps/web/assets/divini-pay.mjs`
  — ACH-first fee engine (honest calculator: $2,500 → $5 ACH vs $72.80 card), consent-gated onboarding,
  tokenized instruments only (raw numbers rejected), W-9-before-payout enforced, append-only double-entry
  **PII-free** ledger, exact splits (platform fee + referral commission), **every payout/refund gated as
  move_money**, milestones, dispute holds, RBAC w/ audited denials, owner-only reasoned overrides, recon
  export, privacy dashboard that verifies its own promises, **Phase-3 wallet designed but hard-locked in
  code pending compliance review**, 12-agent payments desk under the CFO Agent. Docs: DIVINI_PAY_SPEC +
  COMPLIANCE_CHECKLIST (binding; lawful-oversight posture explicit) + AGENTS. Readiness now 40 checks.
  `pnpm pay:smoke` (8 scenarios).
- **Readiness verification + R&D bench (ASI-Arch):** `/readiness` runs 34 live checks proving the
  command center is loaded, connected, and governed — hierarchy (Alyssa → Alfy2 "Chief Operating
  Intelligence System" → 16 cabinet → 10 sponsored portfolio agents), complete dossiers, guardrails +
  approvals, all functional-layer surfaces (10 service + 10 factory + 20 studio fns, 22 studio data
  objects), avatar governance, R&D bench. Tamper test proves checks have teeth. GAIR-NLP/ASI-Arch
  vetted into R&D (`docs/RND_ASSET_ASI_ARCH.md`): Apache-2.0, verified live; **sandbox-only** (it
  executes generated code + trains models), CTO owner / CKO steward. `pnpm readiness:smoke`.
- **Orchestrator v0 + luxury UI polish + design system:** `services/orchestrator` is no longer a stub —
  scheduler with idempotent-per-period cadence jobs (daily-brief hits `GET /mission-control/brief` once
  per day, bounded retries → exhaustion alert; kill switch `ORCH_PAUSED`; boot-safe without env);
  `pnpm orch:smoke`. UI: motion system (staggered card rise, animated nav bar, reduced-motion safe),
  nine-fact **executive strip on every screen** (status/priority/owner/next/blocked/approvals/revenue/
  updated/**recommended decision**), approval **drawer** (full context + decide from any screen),
  skeleton loading, refined empty states. Six design docs added + indexed (DESIGN_SYSTEM,
  UI_COMPONENT_GUIDE, EXECUTIVE_DASHBOARD_COMPONENTS, STATUS_CHIP_SYSTEM, PORTFOLIO_COMPANY_VIEW,
  ENTERPRISE_NAVIGATION_STRUCTURE). *Next:* Render re-sync (needs Alyssa), then deploy the orchestrator
  pointing at the live API.
- **Media Studio + AI Avatar command layer + Divini branding:** `/studio` (series → episode workspace
  with 11 modules and **five enforced gates**: concept, talking points, clips, publishing pack,
  sensitive claims), deterministic clip detection from imported transcripts, monetization/claims
  scanner, repurposing board, publishing jobs (manual until scheduler connector); `/studio/avatar`
  (consent-backed profiles, approved use cases, **hash-bound script approvals** — edits invalidate
  tokens, vendor export packets with guardrails + ai_generated disclosure, output review gate,
  append-only usage log). Theme reskinned to Divini Group brand (cream/emerald/gold, Playfair/
  Montserrat w/ fallbacks). `apps/web/assets/media-studio.mjs`, smoke `pnpm studio:smoke` (7 gate
  scenarios). *Risks:* browser-local state; fonts require network (clean fallbacks). *Next:* Day-1
  Render re-sync.
- **Four creation factories + live approval wiring:** `/factory` hub + 4 creation modes (company 14 /
  software 12 / gtm 13 / media 17 deterministic editable sections) + `/factory/packets/:id` viewer
  (edit→version, submit→Approval Center with correct action class, export markdown/Obsidian/agent JSON
  incl. Fable/Claude/OpenClaw prompt packets); Approval Center now shows the **live gate queue**
  (GET /approvals + decide) and command-center tiles update from the live API when connected.
  `apps/web/assets/factories.mjs`, smoke `pnpm factorymodes:smoke`. *Risks:* factory state is
  browser-local; live queue needs the Render API green. *Next:* Day-1 (Render re-sync + demo seed).
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
