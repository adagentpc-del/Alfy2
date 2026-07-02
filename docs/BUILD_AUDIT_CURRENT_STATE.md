# Build Audit — Current State

Point-in-time audit of the whole repo, taken **2026-07-02** on branch `claude/alfy2-enterprise-audit-bkr855`.
The *living* status doc remains `AI_PROJECT_OS/10_CURRENT_STATE.md`; this file is the deep audit behind the
Enterprise OS work (`docs/ALFY2_ENTERPRISE_OPERATING_SYSTEM.md`). Where older governance docs disagree with
this audit, this audit and `AI_PROJECT_OS/*` win (see §7).

## 1. What exists (verified)

**Scale:** 243 migrations → **245 live tables, all RLS deny-by-default**; **177 Zod contracts**
(`packages/shared/src/contracts/`); **~179 domain engines** (`packages/core/src/`, one folder per concern);
**~123 smoke scripts** (`scripts/*-smoke.mts`, in-memory, deterministic); ~80 Python contract tests
(`workers/tests/`); `tsc -b` green in ~14s.

**Runtime that is real today:**
- `services/api` — Hono gateway: CORS → Supabase-JWT auth → tenant context (RLS GUC) → **approval-gate
  middleware (deny-by-default, one-time-consume tokens, DB-backed via `api_approval_requests`)** → ~28
  endpoints across `/inbox`, `/actions`, `/approvals`, `/mission-control`, `/founder`, `/revops`,
  `/decisions`, `/capital`, `/org`.
- `packages/db` — 11 real Postgres repositories (mission-control, inbox, approvals, ai-org delegation,
  revops, capital, founder-capacity, memory, decisions, alerts).
- `apps/web` — one static `index.html` (Vercel, no build): Mission Control / Inbox / Approvals / Founder
  views on mock data, with a `Connect` hook that live-fetches **only** `/mission-control` tiles.
- Deploy: Render blueprint (`render.yaml`, service `alfie-api`) + Vercel static (`vercel.json`).

**Strongest domain clusters:** approvals (`api-approval`, `persistent-approval`, gate middleware), AI org
(`ai-org` — 78 seeded role cards + chain of command + delegation packets, `ai-org-runtime`,
`department-os` — 15 departments / 94 scorecards), revenue (`revenue-command` 618 lines + `revops` +
`deal-desk` + `revenue-factory`), mission control (engine + read model + alert service + Pg repo + routes).

## 2. What is missing

| Gap | Detail |
|---|---|
| **GTM module** | No `gtm`/go-to-market engine; nearest are `campaign`, `conversion`, `revenue-factory`. → being added as `packages/core/src/gtm-factory` (see `docs/GTM_FACTORY_SPEC.md`). |
| **AI avatar / digital double** | Only `digital-twin` (a *business* what-if model, 120 lines) + `voice_personas` tables. No avatar/likeness/video engine, no external avatar tool adapter. Spec: `docs/AI_AVATAR_ENGINE_SPEC.md`. |
| **Orchestrator runtime** | `services/orchestrator` is a README stub. Core `orchestration/*` (planner/assembler/dispatcher/approval-gate) exists but nothing schedules or runs jobs. Spec: `docs/AUTOMATION_ORCHESTRATION_SPEC.md`. |
| **Live connectors** | Everything external is a **blueprint/descriptor only** (GitHub, Gmail, Stripe, Calendar, Drive, Slack, Notion, CRM). GoHighLevel, Apollo, Obsidian, social schedulers are doc-only strings. Only Supabase/Postgres is live. `POST /actions/send-email` returns `{sent:false, note:"connector not yet wired"}` — by design. |
| **Obsidian / knowledge sync** | No sync code at all. Spec: `docs/KNOWLEDGE_BRAIN_SYNC_SPEC.md`. |
| **`packages/agents-sdk`** | README stub. |
| **UI surface** | No agents, portfolio, revenue, media, or org views; approvals buttons are decorative; only 5 Mission-Control tiles are live-wired. |
| **Seed/demo data** | `supabase/seed.sql` seeds exactly one default tenant. **No businesses, agents, deals, or content are seeded** — a fresh live DB renders $0/"—" everywhere. |
| **Test/lint gates** | `pnpm test` / `lint` / `format` are placeholder echoes; no vitest/jest. Real gates are `tsc -b` + individual smokes. |

## 3. Broken / incomplete areas

- Old Python `Alfy2` Render service errors (name-collision artifact; delete once `alfie-api` is green) —
  `AI_PROJECT_OS/15_KNOWN_ISSUES.md`.
- Render `alfie-api` needs re-sync + env vars (`ALFY_API_TOKEN`, `DATABASE_URL`, `SUPABASE_URL`) after the
  lockfile fix; then verify `/healthz`.
- Dashboard: hardcoded date ("Friday, Jun 26"), dead `.empty` style, `window.prompt` token entry, no view
  persistence, brand said "Alfie2" (fixed to Alfy2 in this change).
- Only **one** route is in the approval gate's `GATED_ROUTES` registry (`POST /actions/send-email`); the
  other 11 gated action classes have no HTTP surface yet.
- Specialist-agent roster (below `ai_employee`) is a pattern only — not yet seeded.

## 4. Duplicate / conflicting architecture

- **Capital ×4:** `capital-allocation` (wired, has repo) vs `capital-allocator` / `capital-board` /
  `capital-engine` (in-memory takes). Canonical: `capital-allocation`.
- **Revenue ×5:** `revenue-command` (canonical, wired) vs `revenue`, `revenue-factory`, `revenue-truth`, `revops`.
- **Dashboards ×5:** `mission-control` (canonical, wired) vs `control-tower`, `flight-deck`,
  `life-dashboard`, `war-room`. Reconciled in `docs/EXECUTIVE_DASHBOARD_SPEC.md`.
- **Decision ×3**, **knowledge/memory ×7**, **build ×6**, **improvement ×3** — same pattern: many
  exploratory engines, one wired winner. None are deleted (they are cheap, additive, and referenced by
  ADRs); each umbrella spec below names the canonical module.
- `infra/supabase/` is a **physical mirror** of `supabase/migrations/` (+ concatenated
  `ALL_MIGRATIONS.sql`). Canonical set: `supabase/migrations/`.
- Root `modules/` is an older thin scaffold parallel to `packages/core` — legacy, untouched.
- **Naming split:** code/env/packages/live-URL say **Alfy2** (`@alfy2/*`, `ALFY_`, alfy2.vercel.app);
  upper governance docs say **Alfie2** (`ALFIE_MASTER_CONTROL.md`, service `alfie-api`). **Canonical: Alfy2**
  (code is load-bearing). "Alfie2" in older docs is historical; do not introduce new "Alfie" spellings.

## 5. Current UI state

Single static file `apps/web/index.html` (~253 lines, inline CSS/JS, no framework, no router). Four views
(Mission Control, Executive Inbox, Approvals, Founder), all mock except the 5 live Mission-Control tiles.
Prior palette was slate + teal-green — replaced in this change with the luxury command-center tokens
(ivory base `#f7f6f2`, deep navy structure, luminous gold accents; see `docs/EXECUTIVE_DASHBOARD_SPEC.md` §4).

## 6. Current data / schema / integration state

- Schema: 245 tables, strict odd/even table+RLS migration pairing, tenant-scoped via
  `current_setting('app.tenant_id')`; approval classes in `0239_api_approval_requests.sql` (12 classes,
  only `internal_action` exempt).
- Businesses on record: business-profile engine seeds 5 (`alfie2`, `move_mi`, `divini_procure`,
  `divini_partners`, `stratalogic`); brand-dna seeds 9 brands (adds `founderos`, `oralia`,
  `decoded_podcast`, `alyssa_personal`, `funsies_ai`). **Divini Group, DatingModern.ai, Black Flag
  Innocence Foundation, AI Builder Pro appear nowhere in code/docs** — now captured in the canonical
  roster in `docs/PORTFOLIO_COMPANY_OS.md`.
- Secrets hygiene: **clean.** Only `.env.example` placeholders; `render.yaml` uses `sync:false`; no
  credential columns anywhere; no tokens in git.

## 7. Doc-vs-doc conflicts (resolved direction)

`ALFIE_MASTER_CONTROL.md` + `ALFIE_RELEASE_PLAN.md` still say "runtime not built / ~5% / 237 tables /
622 tests" — **stale**. `AI_PROJECT_OS/10_CURRENT_STATE.md` + `04_SYSTEM_ARCHITECTURE.md` (newest) say
runtime ~60%, 245 tables, ~28 endpoints, dashboard live — **current**. Treat AI_PROJECT_OS as truth;
the stale counts in AMC/Release Plan should be updated in a docs-maintenance pass, not silently edited here.

## 8. Highest-risk gaps (ranked)

1. **Nothing real flows end-to-end**: no live connector + empty DB ⇒ the live system shows zeros. (Demo
   risk, trust risk.)
2. **Orchestrator absent**: no cadence runs without a human kicking it.
3. **Approval surface too narrow**: 1 of 12 action classes actually routable; agent work that needs gates
   has no HTTP path.
4. **UI far behind backend**: 8 route groups exposed, 1 partially consumed; approvals not actionable.
5. **No aggregate test gate**: 123 smokes exist but nothing runs them all in CI.

## 9. Fastest path to a working demo

1. Render re-sync → `/healthz` green → dashboard `Connect` (token). *(hours, mostly ops)*
2. Seed a **demo dataset** (businesses from the canonical roster + sample deals/alerts/approvals) so live
   mode isn't $0. *(small SQL/seed script)*
3. Wire Approvals + Inbox views to their existing live endpoints (approve/deny actually works — the gate
   is already real). *(one file, `apps/web/index.html`)*
4. One mock connector (Move Mi email → `/inbox/ingest`) to show ingest → triage → approval → action.
5. Orchestrator daily-brief job hitting `/mission-control/brief`.

Full sequencing: `docs/FIVE_DAY_COMPLETION_PLAN.md`.
