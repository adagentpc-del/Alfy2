### Added — Release 1 completion: Mission Control alerts are now persistent + actionable
- `MissionControlAlertService` (core) + `MissionControlAlertRepository` port + InMemory + `PgMissionControlAlertRepository` (@alfy2/db) over the existing `mission_control_alerts` table (no new migration). `sync()` reconciles freshly-derived alerts with the persisted queue by (category, title) so conditions don't duplicate and operator status survives refresh.
- `services/api`: `GET /mission-control` now persists + returns the active alert queue; new `POST /mission-control/alerts/:id/ack` and `/escalate`. Gateway smoke proves an alert persists, acknowledges, and is not duplicated on re-compose. Full tsc -b green.

### Added — Release 5: FounderOS capacity (migration 0241)
- `FounderCapacityEngine` + `founder_capacity_snapshots` (append-only, RLS) + Pg adapter + Pydantic mirror. A check-in scores capacity 0..100 and recommends a work mode (protect / normal / high_capacity / recovery) deterministically.
- `services/api` routes `POST /founder/capacity` (check-in → scored snapshot) and `GET /founder/capacity` (latest). Mission Control's founder-capacity tile now reads the latest snapshot (mode + score) instead of a default.
- DB now 241 tables, 0 without RLS. Full tsc -b green; founder + gateway smokes pass (gateway covers 8 cases now); 636 pytest.

### Added — Release 1: Mission Control live (migration 0240)
- `PgMissionControlReadModel` (@alfy2/db) composes the Layer-0 aggregate from live tables — real pending approvals, open inbox loops, blocked high-urgency items, top scored revenue opportunities, due follow-ups; revenue/cash/runway return honest 0/null until RevOps + Capital land (R6). All five queries validated against the live schema.
- Migration 0240 — `mission_control_snapshots` (append-only history) + `mission_control_alerts` (mutable queue), RLS. DB now 240 tables, 0 without RLS.
- `services/api` routes: `GET /mission-control` (composed snapshot + derived alerts) and `GET /mission-control/brief` (daily CEO brief), wired through the tenant scope. Gateway smoke now exercises the route (45-day runway → warn cash alert, opportunity in snapshot, non-empty brief). Full tsc -b green, 633 pytest.

### Added — Release 0 Wave 2: services/api gateway (the runtime goes live)
- `@alfy2/api` Hono gateway: Supabase JWT auth (JWKS, injectable verifier) → tenant context (single-operator default tenant + optional x-business-id, runs inside `Db.withTenant`) → central **approval gate** middleware (default-deny `GATED_ROUTES`; gated routes park at 202 `approval_required` + create a pending `api_approval_requests` row, clear to 200 once approved) → routes: health, inbox (ingest/list/status), `/actions/send-email` (gated demo), approvals (queue + decide). `pg` stays isolated to @alfy2/db. Deps: hono, @hono/node-server, jose.
- Verified: full `tsc -b` green across the workspace incl. services/api; `api-gateway-smoke` passes in-process (401s, inbox round-trip, gate parks 202 then clears 200, health 200); 626 pytest; no live DB needed to verify. To serve live: fill `.env` (DATABASE_URL + SUPABASE_* + ALFY_DEFAULT_TENANT_ID) and `pnpm dev` in services/api. **Release 0 runtime foundation complete.**

### Added — Release 0 Wave 1: Approval-gate persistence (migration 0239)
- `ApprovalGateService` (core) + `ApprovalRequestRepository` port + InMemory + `PgApprovalRequestRepository` (@alfy2/db) + `api-approval` contract (shared, `Api*`-aliased to avoid collision with existing security `ApprovalRequest`) + Pydantic mirror. Deterministic gate: classifies action classes → requires_approval + risk; persists pending requests; operator decides. Table `api_approval_requests` (RLS). DB now 238 tables, 0 without RLS. tsc -b green, api-approval smoke pass, 626 pytest.

### Added — Knowledge Ops, Lifecycle+Growth, Market Intel, Oversight (4 engines, migrations 0235–0238)
- **Knowledge Ops** (`KnowledgeOpsEngine`): expert source library + pipeline (added→archived), weekly Elite Operator Digest (surfaces only likely-leverage), Alyssa Adaptation Filter (pass only if fits model/brand/energy + leverage + cheaply testable + not generic/too-manual), knowledge taxonomy + company-stage/business-model fit warnings, 6-lens scenario simulator, experiment design + learning repository. Tables `knowops_*` (6).
- **Lifecycle + Growth** (`LifecycleGrowthEngine`): 8-stage lifecycle (attention→advocacy) per business+stakeholder, growth-loop designer (referral/content/marketplace/review/donor), trust-asset audit, first-impression audit (8-point score), white-glove journey designer. Tables `lifecycle_maps`, `growth_loops`, `trust_asset_audits`, `first_impression_audits`, `white_glove_journeys`.
- **Market Intel** (`MarketIntelEngine`): voice-of-customer extraction, market-gap detector, AI-search/AEO + public-reputation visibility scoring (0–100). Tables `market_*` (3).
- **Oversight** (`OversightEngine`): leadership blind-spot detector, recursive system optimizer, billion-dollar standard checker (passes only if all 9 criteria hold; else revisions_needed). Tables `oversight_*` (3).
- DB now **237 tables, 0 without RLS**. Full `tsc -b` green; 4 new smokes pass; **622 Python contract tests** passing.
- Consolidation: **docs/ALFIE2_OPERATIONS_ARCHITECTURE.md** master blueprint (27 sections).

# Changelog

All notable changes to Alfy². Format: [Keep a Changelog](https://keepachangelog.com/).
Versioning: the platform foundation is pre-1.0; expect breaking changes between phases.

## [Unreleased]
### Added — Review Cadence + Expert Council + Org Health + Incentive Ecosystem (native features, LIVE)
- **Executive Review Cadence + Master Docs** (`ReviewCadenceEngine`) — structured monthly/quarterly/
  yearly reviews for each business AND the portfolio: collect department reports → assemble a
  board-quality master doc (exact section set per level + meeting agenda) → capture Alyssa's feedback
  (→ decisions/priorities/tasks/SOP changes/paused-killed/next-review goals). Migration `0231` (3 tables).
- **Expert Knowledge Council + Framework Library** (`ExpertCouncilEngine`) — a private advisory board:
  seeds 15 frameworks across 9 lenses (Hormozi, Gary Vee, Brunson, StoryBrand, Cialdini, Buffett,
  Munger, Naval, Dunford, Voss, Codie Sanchez…); lens selector, multi-lens application, conflict
  resolver, principle-to-execution converter, testing loop, advisory-board mode, "what would the
  greats do" — all ADAPTED to Alyssa's businesses (never imitation), money/investing approval-gated.
  Migration `0232` (4 tables).
- **Org Health / CODO** (`OrgHealthEngine`) — AI-employee wellness track (workload/failure/overload →
  split/automate/simplify, never "work harder"), communication auditor (10-dimension score), train-
  not-replace correction loop, org-health report, monthly CEO coaching report (what only Alyssa can
  do, what AI should own, decision fatigue, founder health). Migration `0233` (5 tables).
- **Incentive Alignment + Referral Ecosystem + Value Exchange** (`IncentiveEcosystemEngine`) —
  protects the business first; value-exchange scoring, referral programs, rev-share (payouts approval-
  gated), ecosystem health score, win-win-win review (approves only if all three parties win);
  rejects extractive designs. Migration `0234` (5 tables).
- Plus added **Creative Production** (14th) and **Organizational Development / CODO** (15th)
  departments to the Department OS seed (now 15 departments / 94 AI employees). NOTE: per the
  verify/merge rule, the rest of the giant spec (capital allocation, creative asset production,
  relationship tracking, conversion psychology, generic visibility, framework detection, learning
  loops) was mapped to existing live engines and NOT rebuilt. All four engines built by parallel
  agents, integrated + verified by the orchestrator. Database now **220 tables, all RLS-on**; full
  `tsc -b` green; all smokes pass; **599 pytest**.

### Added — R&D / Swarm Lab + Business Operating Profiles (native features, LIVE)
- **R&D department + Swarm Lab** (`SwarmLabEngine`) — added R&D as the **13th department**, and a
  bounded swarm as its capability: parallel exploration that **refuses to run without a delegation
  packet** (chain of command), is permission-scoped to draft/recommend only, produces non-executing
  candidates, converges + ranks them, reports up to the R&D Lead, and promotes top picks into the
  approval-gated pipeline. This is how Alfy² borrows swarm-style parallelism without losing
  accountability. Contract `swarm-lab.ts`, migration `0229` (4 tables + RLS, live).
- **Business Operating Profiles + Context Stack** (`BusinessProfileEngine`) — powers business-aware
  execution ("same global skill, different business execution"). Seeds the 5 Tier-1 profiles
  (Alfie2, Move Mi, Divini Procure, Divini Partners, StrataLogic) with mission, revenue model,
  offers, brand voice, **banned language**, channels, source-of-truth, compliance caution, KPIs, and
  backlog. `buildContextStack` assembles the canonical **11-layer context** (security first) scoped
  to one business; `enforceNoCrossBusiness` **throws** if two business contexts are mixed (Move Mi
  marketing can't use Divini pricing; StrataLogic carries health disclaimers; Black Flag bans
  aggressive sales language). Contract `business-profile.ts`, migration `0230` (2 tables + RLS, live).
  NOTE: the broader "AI Organization Operating System" master spec was ~95% already live (AI Org
  chain-of-command, Department OS, CRO, scorecards, KPIs, learning engines) — per the verify/merge
  rule it was NOT rebuilt; only these two genuine gaps were added. Database now **203 tables, all
  RLS-on**; full `tsc -b` green; smokes pass; **582 pytest**.

### Added — AI Organization + CRO/Revenue Command (native features, LIVE)
- **AI Organization / Chain of Command** (`AiOrgEngine`) — turns the agent set into an accountable
  AI company. Seeds **78 role cards** (4 executives, 11 department leaders, 63 employees) across 12
  departments, each with mission, responsibilities, operating loop, allowed actions, approval rules,
  inputs/outputs, tools, KPIs, failure signals, escalation rules, review cadence, **permission scope**
  (observe-only → admin-disabled), and reports-to chain. Enforces: delegation packets (an agent can't
  start work without one — `startWork` throws), report-backs, escalation ladder (specialist → employee
  → leader → executive → Alyssa), accountability records, department reports (daily/weekly/monthly),
  and `validateChainOfCommand`. Contract `ai-org.ts`, migration `0227` (6 tables + RLS, live).
- **CRO / Revenue Command** (`RevenueCommandEngine`) — the Chief Revenue Officer brain. Scores every
  revenue opportunity 0–100 across 10 factors (revenue, speed-to-cash, effort, risk, confidence,
  founder-time, strategic value, repeatability, margin, close probability) → 7 statuses
  (pursue_now/nurture/automate/delegate/reprice/pause/kill); builds a daily Revenue Command Center
  (top money actions, hottest leads, blockers); reviews offers (flags underpricing / missing payment
  link / unpaid consulting); seeds 6 business revenue missions (Move Mi, Divini Procure, Divini
  Partners, StrataLogic, FounderOS, Black Flag); high-risk money actions require approval. Contract
  `revenue-command.ts`, migration `0228` (6 tables + RLS, live). Built by two parallel build-agents,
  integrated + verified by the orchestrator (fixed a `RevenueCommandOptions` collision with the
  existing RevenueCommandSystem; full `tsc -b` green, both smokes pass). Database now **197 tables,
  all RLS-on**.

### Added — People Operations + Department OS (native features, LIVE)
- **People Operations + Hiring Lifecycle** (`PeopleOpsEngine`) — the full 13-stage hiring/team loop
  for humans OR AI employees: role-need detection → role design → **Billion-Dollar Hiring Standard
  gate** (10 criteria; a vague role is blocked from posting, a scoped role passes) → job post →
  candidate pipeline → interview → offer → onboarding docs → access setup → training → nurture →
  performance → delegation → offboarding (revokes all access). Contract `people-ops.ts`, migration
  `0225` (14 tables + RLS, applied live). Smoke `pnpm run peopleops:smoke`.
- **Department OS + AI Employee KPI/Scorecards** (`DepartmentOsEngine`) — organizes AI agents as
  departments in a billion-dollar operating company. Seeds the **12 departments** (Executive Office,
  Growth, Sales, Product, Engineering, Operations, Customer Success, Finance, Legal/Compliance, Data,
  People Ops, Fundraising) with their operating loops, **74 AI-employee scorecards**, and KPIs.
  Enforces governance: every AI employee belongs to a department, every department has a loop + KPIs,
  every KPI links to a business outcome (`validateGovernance`). Contract `department-os.ts`, migration
  `0226` (3 tables + RLS, applied live). Smoke `pnpm run deptos:smoke`. Built in parallel by two
  isolated build-agents, then integrated + verified by the orchestrator (full `tsc -b` green, both
  smokes pass). Database now 185 tables, all RLS-on.

### Added — Build From Brainstorm (native feature, LIVE)
- **Build From Brainstorm** — the bridge from raw founder conversation to an approval-gated build.
  Full 9-stage pipeline: brain dump → classify inputs (14 kinds; conversation is INPUT, never a
  command) → extract Decision Cards → 7-layer Strategy Map → Build Prompt Pack (10 categories) →
  Build Queue (12 statuses) → **Approval Gate** → agent execution (9 agent kinds) → QA → Changelog.
  NON-NEGOTIABLE RULE enforced in code and proven by smoke: `runApproved` executes nothing until the
  queue is explicitly approved. Contract `build-from-brainstorm.ts` (+ Pydantic mirror, +5 contract
  tests), engine `packages/core/src/build-from-brainstorm/`, migration `0224` (11 tables + RLS,
  **applied live** to Supabase oxromxpjoiifvamxjluz → 168 tables). Verified: `tsc -b` green,
  `pnpm run brainstorm:smoke`, 553 pytest passing. (UI tabs are the Phase-2 thin-UI brick.)

### Added — Phase 2 runtime layer (persistence, bricks 1–2)
- **Executive Inbox persistence (brick 2).** New `InboxRepository` port + `InMemoryInboxRepository`
  in `@alfy2/core`; `ExecutiveInbox` now accepts an optional `inbox` store and persists every
  processed drop (`process()` → save with status `new`), plus `getItem` / `listItems` (newest-first,
  status/category filters) / `markStatus`. `PgInboxRepository` in `@alfy2/db` maps the
  `inbox_items` table — scalar columns + a `payload` jsonb for the variable-shape fields (linked
  entities, tasks, missing info, agents, explanation, summary), rehydrated on read. Backward
  compatible (no store = route-only, as before). Verified: `tsc -b` green; the inbox smoke now
  exercises the full persistence path (persist 5, get, advance status, status filter, tenant
  isolation); `db-smoke` round-trips a Move-Mi-email-shaped item end-to-end when `DATABASE_URL` set.
- **`@alfy2/db`** — the first real persistence adapter package. `Db.withTenant(tenantId, fn)` opens a
  Postgres transaction and sets `app.tenant_id` (+ optional `app.business_id`) as a **LOCAL GUC**, so
  the schema's RLS policies (`current_setting('app.tenant_id', true)`) enforce isolation per
  connection. `PgMemoryRepository` implements the existing `MemoryRepository` port over the
  `memories`/`memory_links` tables (upsert, tenant-scoped get/search/all, links, cascade-safe
  cleanup) — the proven pattern the remaining engines will follow. `pg` is isolated to this package
  so `@alfy2/core` stays infrastructure-free. New `DATABASE_URL` config secret (optional, redacted)
  + `.env.example` docs. Verified: full `tsc -b` green across shared → config → core → db under
  strict settings; `scripts/db-smoke.mts` drives the real `MemoryEngine` through Postgres end-to-end
  when `DATABASE_URL` is set and skips cleanly otherwise (`pnpm run db:smoke`).

### Deployed
- **DATABASE IS LIVE** (2026-06-26) — all **223 migrations applied** to the Supabase project
  `oxromxpjoiifvamxjluz` (ALFY2 org) via the Management API. Verified: **157 tables, all 157 with
  RLS enabled, 464 RLS policies**; default-operator tenant seeded
  (`00000000-0000-0000-0000-000000000001`). Code is on GitHub (`adagentpc-del/Alfy2`, `main`).
  This was the first time the migrations ran against a real Postgres; three latent SQL bugs were
  found and fixed: `array_to_string(...)` is not `IMMUTABLE` so it can't sit in a STORED generated
  column — wrapped in an `alfy_array_join()` immutable helper in `0003_memory_engine.sql` and
  `0008_founder_intelligence.sql`; and reserved word `window` used as a column name in
  `0028_pattern_observability.sql` — now quoted as `"window"`. These three fixes are committed
  locally and must be pushed so GitHub matches the live DB.

### Added
- **Executive Operating Manual — persistence** (migration `0196`, `executive_operating_manuals`): the assembled
  manual (`ExecutiveOperatingManualDocSchema`) is now stored as an **append-only** point-in-time snapshot
  (`sections`, `stale_domains`, `fully_current`), so documentation history is durable rather than recomputed-only.
  Previously a read-model (ADR-0119). Contracts unchanged. RLS: deny-by-default, SELECT + INSERT only.
- **Infinite Loop — persistence** (migration `0197`, `loop_placements`): a module's placement
  (`LoopPlacementSchema` — `primary_stage`, `feeds_stage`, `in_loop`) is now stored as an **append-only** record,
  with the twelve loop stages enforced via CHECK constraints mirrored from `LoopStageSchema`. Previously a
  read-model (ADR-0120). Contracts unchanged. RLS: deny-by-default, SELECT + INSERT only.
- **NORTHSTAR.md** (repo root): the apex purpose doc — "Alfy² exists to convert finite human life into infinite
  compounding value" — wired to the Infinite Loop, Ultimate Design Rule, Five Immutable Laws, Identity OS, and the
  Freedom/Life-ROI instruments.
- **Voice & companion layer** — `voice-interface.ts` intent vocabulary extended (read daily/lunch/evening briefings,
  read news/reminders, summarize dashboard, create task, route to agent, confirm approval, ask clarifying question);
  new **Companion Voice Persona** (`voice-persona.ts`, migration `0199` `voice_personas`, mutable): named British-female
  voice layer that is never the brain (`is_voice_layer_only` pinned true).
- **Conversation-to-Reality** — `conversation.ts` gains `ConversationInputCategory` (12 categories: idea/task/goal/
  asset/business_opportunity/concern/relationship_note/financial_note/health_note/content_idea/podcast_idea/
  system_improvement) and 7 more output kinds (goal, project, business_plan, dashboard_item, approval_request, sop,
  campaign); migration `0198` adds `conversation_extractions.input_categories`.
- **Personal Executive Model (PEM)** (`personal-executive-model.ts`, migration `0200`, mutable): learns 11 dimensions of
  how Alyssa operates; explainable by construction (`PemExplanation`: why preferred / informing patterns / confidence /
  evidence missing); `amplifies_not_imitates` pinned true.
- **Meeting Prep** (`meeting-prep.ts`, migration `0201`, append-only): pre-meeting `meeting_dossiers` + post-meeting
  `meeting_recaps`. Distinct from the lightweight prep block in the Chief of Staff briefing.
- **Relationship Capital Engine** (`relationship-capital.ts`, migration `0202`, mutable): 10 party kinds; health &
  strength scores; surfaces reconnect/introduce/thank/celebrate/provide-value moves. (Named `RelationshipParty*` to
  avoid the existing `RelationshipKind`.)
- **Venture Studio** (`venture-studio.ts`, migration `0203`, mutable): 17-stage idea→company build; inherits enterprise
  standards (`inherits_operating_standards` pinned true); `awaiting_launch_approval` defaults true. Composes Idea Builder
  + Vision Builder.
- **Alyssa Pattern Mirror** (`alyssa-pattern-mirror.ts`, migration `0204`, append-only) + **Teach My Framework**
  (`teach-framework.ts`, migration `0205`, append-only): learn how Alyssa thinks → flag `framework_candidate` → distill
  named, teachable frameworks (10 artifact kinds) as reusable IP. Amplify/preserve, not imitate.
- **Life Dashboard** (`life-dashboard.ts`, read-model — no table, like Flight Deck): success beyond business; standing
  message "the businesses exist to support life, not replace it."
- **Chief of Staff** — `three_decisions_only_you_can_make` (≤3) added to the briefing.
- **Personal OS** — modules extended with `subscriptions`, `events`, `errands`.
- **Self-Improvement / Simplicity Engine** — folded the Simplicity Engine into Self-Improvement ("can two systems become
  one?"): added duplicate/unnecessary finding kinds + four scores (complexity / leverage / maintainability /
  user_friction) to `self_improvement_reports` (migration `0198`).
- **Executive Legacy Archive** — `legacy_items.kind` widened to the full lifetime taxonomy (company, podcast, letter,
  video, voice_note, journal, case_study, client_transformation, business_philosophy; migration `0198`).

- **Build & Ship SOP suite** (`docs/sops/`): `BUILD_SHIP_SOP.md` (10-phase master), `BUILD_CHECKLIST.md`,
  `QA_CHECKLIST.md`, `LAUNCH_CHECKLIST.md`, `POST_LAUNCH_REVIEW_TEMPLATE.md` — a reusable build/ship operating system
  for StrataLogic, Divini Partner/Procure, Move Mi, FounderOS, Oralia, DatingModern.ai, and future apps.
- **Build → Ship → Govern subsystem, Wave 1** (8 new contracts): Build Packet Generator / Architect-to-Builder
  (`build-packet.ts`, migration `0206`, mutable), Code Execution Handoff (`code-handoff.ts`, `0207`, append-only),
  Implementation Review Agent (`implementation-review.ts`, `0208`, append-only), Ship Gate (`ship-gate.ts`, `0209`,
  append-only), Supabase Architecture Engine (`supabase-architecture.ts`, read-model), Developer Command Center
  (`developer-command-center.ts`, read-model), Conversation-to-Code Pipeline (`conversation-to-code.ts`, `0210`,
  mutable, 12 stages, feeds the Compounding Engine), Divini Standard (`divini-standard.ts`, `0211`, append-only,
  14-criterion quality gate). Production actions stay approval-gated (`production_requires_approval` pinned true; Ship
  Gate approval check needs Alyssa).

- **Build spine made executable** (6 engines now live): `packages/core` engines for build-packet
  (`BuildPacketGenerator`), code-handoff (`CodeExecutionHandoff` + `HandoffApprovalError`), implementation-review
  (`ImplementationReviewAgent`), ship-gate (`ShipGate`), divini-standard (`DiviniStandard`), and conversation-to-code
  (`ConversationToCodePipeline`) — deterministic, tenant-scoped, with the approval gates enforced (handoff refuses
  unapproved packets; ship gate's approval check requires Alyssa; deployment stage blocks while awaiting approval).
  Pydantic mirrors added for all six (29 names, `extra="forbid"`). Smoke `scripts/build-spine-smoke.mts` (`pnpm
  spine:smoke`) and pytest `workers/tests/test_build_spine_contracts.py` (6 tests).
- **System Integration Review** (`docs/SYSTEM_INTEGRATION_REVIEW.md`): repo-data-driven architecture map, completed vs
  placeholder modules (16 placeholders identified), critical gaps, ranked next-10 tasks.

> **Gate status (2026-06-25):** full TS contract layer (145 contracts + index, through migration `0211`) passes
> `tsc --noEmit` (strict + exactOptionalPropertyTypes). Build-spine engines pass `tsc` against the real contracts
> (path-mapped) and their Pydantic mirrors pass `pytest` (6/6). Still pending: engines + mirrors for the other 10
> placeholders (voice-persona, PEM, meeting-prep, relationship-capital, venture-studio, alyssa-pattern-mirror,
> teach-framework, life-dashboard, supabase-architecture, developer-command-center); remaining subsystem waves
> (infra-launch, press-live, human-touch-queue, permission-memory, batch-once, build-once-reuse, future-me,
> optionality, executive-thought-partner, capability-monitor, tech-stack-evaluator); the in-place upgrades
> (cognitive-offload, life-logistics, builder-mode); and a full-workspace `pnpm tsc -b` + `pnpm spine:smoke` +
> full `pytest` run.

- **Build subsystem Wave 2 — Launch & Infra + Human-in-the-loop** (5 engines, full stack: contract + migration +
  engine + Pydantic mirror + smoke + pytest): Infrastructure Launch Engine (`infra-launch.ts`, migration `0212`,
  mutable; prepares 95% per provider, `never_blocks_on_secrets` pinned), Press Live Mode (`press-live.ts`, `0213`,
  append-only; `live` only with Alyssa's approval), Human Touch Queue (`human-touch-queue.ts`, `0214`, mutable;
  batches the human 5%), Permission Memory & Reuse (`permission-memory.ts`, `0215`, mutable; reuse vs escalate vs
  request-new), Batch Once Engine (`batch-once.ts`, `0216`, mutable; never asks twice). Engines exported from
  `@alfy2/core`; mirrors added (28 names); smoke `scripts/human-loop-smoke.mts` (`pnpm humanloop:smoke`) + pytest
  `workers/tests/test_human_loop_contracts.py` (5 tests).

> **Gate status update (2026-06-25, Wave 2):** all 11 Build-subsystem engines (6 spine + 5 Wave 2) pass `tsc`
> against the real contracts (path-mapped, exit 0), and their Pydantic mirrors pass `pytest` 11/11. Contract layer
> now 150 contracts, migrations through `0216`. Remaining: the other 10 contract-only placeholders' engines/mirrors,
> Wave 3 (build-once-reuse, future-me, optionality, executive-thought-partner, capability-monitor,
> tech-stack-evaluator), the three in-place upgrades, and a full-workspace `pnpm tsc -b` + smokes + full `pytest`.

- **Build subsystem Wave 3 — governance, monitoring, reuse** (6 engines, full stack: contract + migration +
  engine + Pydantic mirror + smoke + pytest): Future Me Engine (`future-me.ts`, migration `0217`, append-only;
  regret risk → better path), Optionality Engine (`optionality.ts`, `0218`, append-only; prefers preserved
  choices on an EV tie), Executive Thought Partner (`executive-thought-partner.ts`, `0219`, append-only; never
  auto-agrees, always reasons), Capability Monitor (`capability-monitor.ts`, `0220`, append-only; new capability →
  report + priority), Tech Stack Evaluator (`tech-stack-evaluator.ts`, `0221`, append-only; change only on
  measurable benefit, never novelty), Build Once Reuse Everywhere (`build-once-reuse.ts`, `0222`, append-only;
  package valuable builds for reuse). Engines exported from `@alfy2/core`; mirrors added (26 names); smoke
  `scripts/governance-smoke.mts` (`pnpm governance:smoke`) + pytest `workers/tests/test_governance_contracts.py`
  (6 tests).

> **Gate status update (2026-06-25, Wave 3):** the Build → Ship → Govern subsystem is engine-complete — all **17
> engines** (6 spine + 5 Wave 2 + 6 Wave 3) pass `tsc` against the real contracts (path-mapped, exit 0), and their
> Pydantic mirrors pass `pytest` **17/17**. Contract layer now 156 contracts, migrations through `0222`. Remaining:
> engines/mirrors for the 8 non-build contract-only placeholders + the two subsystem read-models
> (supabase-architecture, developer-command-center); the three in-place upgrades (cognitive-offload,
> life-logistics, builder-mode); and a full-workspace `pnpm tsc -b` + all smokes + full `pytest`.

- **Executive-team & life engines made live** (8 contract-complete placeholders from batches 10 / build-wave-1 now
  have engines + Pydantic mirrors + a smoke + pytest; their migrations already existed at `0199`–`0205`):
  Companion Voice Persona (`CompanionVoicePersona`), Personal Executive Model (`PersonalExecutiveModelEngine`,
  explainable — honest about missing evidence), Meeting Prep (`MeetingPrepEngine`, dossier + recap), Relationship
  Capital (`RelationshipCapitalEngine`, surfaces reconnect/provide-value/thank/celebrate moves), Venture Studio
  (`VentureStudio`, 17-stage build, launch needs approval), Alyssa Pattern Mirror (`AlyssaPatternMirror`, flags
  framework candidates at 3+ occurrences), Teach My Framework (`TeachMyFrameworkEngine`, 10 reusable artifacts),
  Life Dashboard (`LifeDashboardEngine`, read-model, message pinned). Engines exported from `@alfy2/core`; mirrors
  added (39 names); smoke `scripts/exec-team-smoke.mts` (`pnpm execteam:smoke`) + pytest
  `workers/tests/test_exec_team_contracts.py` (7 tests).

> **Gate status update (2026-06-25, exec-team):** **25 engines** now pass `tsc` against the real contracts
> (path-mapped, exit 0) and their Pydantic mirrors pass `pytest` **24/24** across four suites. The system is
> effectively engine-complete. Remaining: the two subsystem read-model engines (supabase-architecture,
> developer-command-center), the three in-place upgrades (cognitive-offload, life-logistics, builder-mode), and a
> full-workspace `pnpm tsc -b` + all smokes + full `pytest` pass.

- **Two read-model engines made live**: Supabase Architecture Engine (`SupabaseArchitectureEngine`, generates a
  per-entity FounderOS-ready table plan — standard columns, tenant-scoped deny-by-default RLS, audit fields,
  append-only soft-delete, numbered migration files) and Developer Command Center (`DeveloperCommandCenterEngine`,
  glanceable build status — counts + summary). Both read-models; mirrors added (8 names); smoke
  `scripts/readmodels-smoke.mts` (`pnpm readmodels:smoke`) + pytest `workers/tests/test_readmodels_contracts.py`.
- **In-place upgrade audit (cognitive-offload, life-logistics, builder-mode):** `life-logistics` already carries all
  19 L1 preparation categories and `builder-mode` already runs the 18-stage venture build (the Architect-to-Builder
  15-artifact spec is the Build Packet, already shipped) — no change needed. `cognitive-offload`'s `Understanding`
  gained the two missing L0 Stage-1 fields (`context`, `emotional_state`) for full faithfulness (jsonb-stored, no
  migration). Engine class `DeveloperCommandCenter` renamed to `DeveloperCommandCenterEngine` to avoid clashing with
  the contract type.

> **FINAL gate (2026-06-25) — FULL WORKSPACE, ALL GREEN:** on a fresh off-mount copy with `pnpm install`:
> **`pnpm tsc -b` across the entire workspace passes (exit 0)**; all five new subsystem smokes pass
> (`build-spine`, `human-loop`, `governance`, `exec-team`, `readmodels`); and the **full `pytest` suite passes
> (545 passed)**. Contract layer 156 contracts, migrations through `0222`. **The system is engine-complete and
> fully verified.**
>
> The full build caught four real engine bugs the isolated checks could not (earlier contract merges not
> propagated to existing engines), now fixed: `chief-of-staff` (build the `three_decisions_only_you_can_make`
> field from the decision queue), `cognitive-offload` (emit the new `context` / `emotional_state` understanding
> fields), `voice-interface` (add the 10 new intents to both `Record<VoiceIntent>` maps), and
> `personal-executive-model` (strict-mode index-access guard). Lesson: the path-mapped contract+engine check
> verifies new engines, but only the full `tsc -b` catches existing engines that consume a changed contract.

### Phase 2 — runtime & integration (begun)
- **Connections layer** — the "Set up & Connect" surface (`connections.ts`, migration `0223`, engine
  `ConnectionsHub`): a runtime-extensible connector catalog (`connector_definitions` — register a new platform
  anytime, no code change) plus scoped connection instances (`connections`) at **master / business / personal**
  scope, each with its own SecretVault references (never raw secrets). `resolve(business, provider)` returns the
  business's own connection or the inherited master, so Move Mi and StrataLogic can each connect their own email
  while a master default cascades. Composes the Connector Registry, Human Touch Queue, Permission Memory, and
  SecretVault. Engine exported from `@alfy2/core`; mirrors added (10 names); smoke `scripts/connections-smoke.mts`
  (`pnpm connections:smoke`) + pytest `workers/tests/test_connections_contracts.py`. Verified: full-workspace
  `pnpm tsc -b` exit 0, connections smoke passes, full `pytest` **548 passed**.

> **Next in Phase 2:** a live Supabase project + the 223 migrations applied; the Supabase repository pattern so
> engines persist (currently in-memory); `services/api` with auth + tenant/business context + the Security Gate;
> real `Connector` adapters (email → Slack → socials) behind the ConnectionsHub; and a thin Set up & Connect UI.

## [1.22.0] — 2026-06-25 — Identity, Conversation & Voice
### Added
- **Identity OS** (`packages/core/src/identity-os/engine.ts`): **`setAnchor()`** records an identity anchor (value /
  boundary / non-negotiable) and **`check()`** tests a proposed action against the anchors — on conflict **identity
  OVERRIDES optimization**. Anchors are **mutable** (identity evolves). Contracts
  `packages/shared/src/contracts/identity-os.ts`. Migration `0192` (`identity_anchors`, mutable). Smoke
  `pnpm identity:smoke`. Docs: `docs/IDENTITY_CONVERSATION_VOICE.md`, `docs/adr/ADR-0122-identity-os.md`.
- **Philosophy Library** (`packages/core/src/philosophy-library/engine.ts`): **`add()`** / **`revise()`** /
  **`pin()`** manage Alyssa's operating maxims; **`todaysReminder()`** returns a **deterministic daily** "Today's
  Reminder" (same day → same pinned principle). Mutable. Contracts
  `packages/shared/src/contracts/philosophy-library.ts`. Migration `0193` (`philosophies`, mutable). Smoke
  `pnpm identity:smoke`. Docs: `docs/IDENTITY_CONVERSATION_VOICE.md`, `docs/adr/ADR-0123-philosophy-library.md`.
- **Conversation Engine** (`packages/core/src/conversation/engine.ts`): **`converse()`** is a thinking partner that
  turns natural speech into structured extractions across **tasks / assets / agents / businesses / workflows /
  knowledge / capital**; **nothing executes without approval**. Distinct from the Conversion Engine (ADR-0032).
  Contracts `packages/shared/src/contracts/conversation.ts`. Migration `0194` (`conversation_extractions`,
  append-only). Smoke `pnpm identity:smoke`. Docs: `docs/IDENTITY_CONVERSATION_VOICE.md`,
  `docs/adr/ADR-0124-conversation.md`.
- **Vision Builder** (`packages/core/src/vision-builder/engine.ts`): triggered by "I have an idea…", **`build()`**
  runs a collaborative thinking session that generates plans, **composing the Idea Builder** (ADR-0008);
  **`awaiting_approval` is always true** — plans, never built artifacts. Contracts
  `packages/shared/src/contracts/vision-builder.ts`. Migration `0195` (`vision_sessions`, append-only). Smoke
  `pnpm identity:smoke`. Docs: `docs/IDENTITY_CONVERSATION_VOICE.md`, `docs/adr/ADR-0125-vision-builder.md`.
- **Voice Interface** (`packages/core/src/voice-interface/engine.ts`): **`interpret()`** maps an **utterance →
  `VoiceCommand`**; **sensitive actions confirm first** — a calm companion. A **read model**; speech I/O
  (recognition/synthesis) is runtime. Contracts `packages/shared/src/contracts/voice-interface.ts`. **No migration**
  (read model). Smoke `pnpm identity:smoke`. Docs: `docs/IDENTITY_CONVERSATION_VOICE.md`,
  `docs/adr/ADR-0126-voice-interface.md`.
- **`docs/IDENTITY_CONVERSATION_VOICE.md`**: narrative overview tying the five engines together — Identity OS
  protects who Alyssa is and overrides optimization; the Philosophy Library + Today's Reminder keep the principles
  alive; the Conversation Engine + Vision Builder make natural conversation the primary interface (think out loud,
  Alfy² builds underneath, never executing without approval); the Voice Interface makes it hands-free with a
  confirmation gate.
### Notes
- Supabase migrations now through `0195` (the Voice Interface adds **no migration** — a read model); `packages/core`
  gains **5 engines** (Identity OS, Philosophy Library, Conversation Engine, Vision Builder, Voice Interface); `tsc -b`
  clean. ADRs `0122`..`0126`.
- One consolidated smoke `pnpm identity:smoke` runs all 5 engines with a frozen clock + deterministic ids; each
  parses its output through its Zod schema.

## [1.21.0] — 2026-06-25 — Operating System Meta-Layer
### Added
- **Research & Development Department** (`packages/core/src/rnd/engine.ts`): **`evaluate()`** returns a disposition
  (adopt / pilot / monitor / ignore) + **confidence**; **`report()`** assembles the **Innovation Report**; **only
  high-confidence discoveries surface**. Contracts `packages/shared/src/contracts/rnd.ts`. Migration `0186`
  (`rnd_discoveries`, append-only). Smoke `pnpm meta:smoke`. Docs: `docs/OPERATING_SYSTEM_META_LAYER.md`,
  `docs/adr/ADR-0111-rnd.md`.
- **Acquisition Engine** (`packages/core/src/acquisition/engine.ts`): **`evaluate()`** recommends one of **8
  dispositions — build / buy / partner / license / white_label / acquire / invest / ignore** using capital-allocator
  scoring. Contracts `packages/shared/src/contracts/acquisition.ts`. Migration `0187` (append-only). Smoke
  `pnpm meta:smoke`. Docs: `docs/OPERATING_SYSTEM_META_LAYER.md`, `docs/adr/ADR-0112-acquisition.md`.
- **Executive Flight Deck** (`packages/core/src/flight-deck/engine.ts`): **`assemble()`** builds a read model
  containing **only decision-changing sections** — replaces the dashboard. Contracts
  `packages/shared/src/contracts/flight-deck.ts`. **No migration** (read model). Smoke `pnpm meta:smoke`. Docs:
  `docs/OPERATING_SYSTEM_META_LAYER.md`, `docs/adr/ADR-0113-flight-deck.md`.
- **Founder Freedom Index** (`packages/core/src/freedom-index/engine.ts`): **`compute()`** returns a **0–100** index
  with **trend / bottleneck / recommendation**. Contracts `packages/shared/src/contracts/freedom-index.ts`. Migration
  `0188` (append-only snapshots). Smoke `pnpm meta:smoke`. Docs: `docs/OPERATING_SYSTEM_META_LAYER.md`,
  `docs/adr/ADR-0114-freedom-index.md`.
- **Life ROI Engine** (`packages/core/src/life-roi/engine.ts`): **`evaluate()`** scores **financial ROI AND life
  returned**, surfacing **`workdays_returned`**. Contracts `packages/shared/src/contracts/life-roi.ts`. Migration
  `0189` (append-only). Smoke `pnpm meta:smoke`. Docs: `docs/OPERATING_SYSTEM_META_LAYER.md`,
  `docs/adr/ADR-0115-life-roi.md`.
- **Never Again Engine** (`packages/core/src/never-again/engine.ts`): **`capture()`** turns a frustration into
  **permanent infrastructure** (automation / agent / SOP / safeguard / redesign). Contracts
  `packages/shared/src/contracts/never-again.ts`. Migration `0190` (append-only). Smoke `pnpm meta:smoke`. Docs:
  `docs/OPERATING_SYSTEM_META_LAYER.md`, `docs/adr/ADR-0116-never-again.md`.
- **Enterprise Self-Improvement Engine** (`packages/core/src/self-improvement/engine.ts`): **`selfEvaluate()`** runs
  a **monthly OS self-evaluation** (refactor + tech-debt), ranking **simpler over bigger**. Contracts
  `packages/shared/src/contracts/self-improvement.ts`. Migration `0191` (append-only). Smoke `pnpm meta:smoke`. Docs:
  `docs/OPERATING_SYSTEM_META_LAYER.md`, `docs/adr/ADR-0117-self-improvement.md`.
- **Enterprise Operating Rhythm** (`packages/core/src/operating-rhythm/engine.ts`): **`agenda()`** returns
  **daily / weekly / monthly / quarterly / annual** agendas as a read model. Contracts
  `packages/shared/src/contracts/operating-rhythm.ts`. **No migration** (read model). Smoke `pnpm meta:smoke`. Docs:
  `docs/OPERATING_SYSTEM_META_LAYER.md`, `docs/adr/ADR-0118-operating-rhythm.md`.
- **Executive Operating Manual** (`packages/core/src/exec-operating-manual/engine.ts`): **`assemble()`** composes the
  **Operating Manual Generator** (ADR-0055) over the OS and **flags staleness**. Contracts
  `packages/shared/src/contracts/exec-operating-manual.ts`. **No migration** (read model). Smoke `pnpm meta:smoke`.
  Docs: `docs/OPERATING_SYSTEM_META_LAYER.md`, `docs/adr/ADR-0119-exec-operating-manual.md`.
- **The Infinite Loop** (`packages/core/src/infinite-loop/engine.ts`): **`stageOf()`** maps each module to a **loop
  stage** (observe → understand → decide → execute → compound → increase_freedom); **`describe()`** returns the loop.
  Contracts `packages/shared/src/contracts/infinite-loop.ts`. **No migration** (read model). Smoke `pnpm meta:smoke`.
  Docs: `docs/OPERATING_SYSTEM_META_LAYER.md`, `docs/adr/ADR-0120-infinite-loop.md`.
- **The Ultimate Design Rule** (`packages/core/src/ultimate-design-rule/engine.ts`): **`admit()`** admits a feature
  only if it satisfies **≥1 of 6 criteria** (increase leverage / reduce friction / compound knowledge / protect trust
  / generate measurable value / increase founder freedom) — the admission gate **above the README + Constitution**.
  Contracts `packages/shared/src/contracts/ultimate-design-rule.ts`. **No migration** (read model). Smoke
  `pnpm meta:smoke`. Docs: `docs/OPERATING_SYSTEM_META_LAYER.md`, `docs/adr/ADR-0121-ultimate-design-rule.md`.
- **`docs/OPERATING_SYSTEM_META_LAYER.md`**: narrative overview — R&D keeps Alfy² ahead; the Flight Deck shows only
  what changes a decision; the Freedom Index + Life ROI measure whether it WORKS (life returned, not just money);
  Never Again + Self-Improvement compound and simplify the OS itself; the Infinite Loop + Ultimate Design Rule are the
  top-level operating model + admission gate; the Alfy² Equation (Reality → Understanding → Execution → Compounding →
  Freedom → Possibility → Reality) is the philosophical statement of the Loop.
### Notes
- Supabase migrations now through `0191` (the Flight Deck, Operating Rhythm, Executive Operating Manual, Infinite Loop,
  and Ultimate Design Rule add **no migration** — read models); `packages/core` gains **11 engines** (R&D, Acquisition,
  Flight Deck, Freedom Index, Life ROI, Never Again, Self-Improvement, Operating Rhythm, Executive Operating Manual,
  Infinite Loop, Ultimate Design Rule); `tsc -b` clean. ADRs `0111`..`0121`.
- One consolidated smoke `pnpm meta:smoke` runs all 11 engines with a frozen clock + deterministic ids; each parses
  its output through its Zod schema.

## [1.20.0] — 2026-06-25 — Cognitive Offloading & Executive Operator Capstone
### Added
- **Cognitive Offloading Engine** (`packages/core/src/cognitive-offload/engine.ts`): the L0 front door —
  **`process()`** runs any of **8 input kinds** through the **5-stage pipeline** (Understand → Connect → Build →
  Delegate → Executive Report), answering "can Alyssa forget this?" per item and reporting `cognitive_load_removed`.
  Contracts `packages/shared/src/contracts/cognitive-offload.ts`. Migration `0172` (append-only). Smoke
  `pnpm capstone:smoke`. Docs: `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0093-cognitive-offload.md`.
- **Life Logistics Engine** (`packages/core/src/life-logistics/engine.ts`): a detected event → checklists
  (**19 categories**), calendar blocks, a night-before / two-hours-before / after-event reminder cadence, and
  follow-ups. Contracts `packages/shared/src/contracts/life-logistics.ts`. Migration `0173` (append-only). Smoke
  `pnpm capstone:smoke`. Docs: `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0094-life-logistics.md`.
- **Anti-Fragility Engine** (`packages/core/src/anti-fragility/engine.ts`): improve *because of* failures —
  **`analyze()`** returns root cause, reusable lesson, and the new safeguard / automation / agent / SOP / redesign,
  with recovery speed, learning gained, and future risk reduction; composes the Failure Database (ADR-0068).
  Contracts `packages/shared/src/contracts/anti-fragility.ts`. No migration. Smoke `pnpm capstone:smoke`. Docs:
  `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0095-anti-fragility.md`.
- **Brain/Hands Separation** (`packages/core/src/brain-hands/registry.ts`): Brain recommends / Policy governs /
  Orchestrator coordinates / Hands execute; **`guard()`** blocks any execution that bypasses policy / approval /
  audit as a `bypass_attempt`; composes the Control/Execution Planes (ADR-0046). Contracts
  `packages/shared/src/contracts/brain-hands.ts`. No migration (static catalog). Smoke `pnpm capstone:smoke`. Docs:
  `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0096-brain-hands.md`.
- **Confidence-Weighted Agent Council** (`packages/core/src/agent-council/council.ts`): **`convene()`** runs
  **10 roles** independently with confidence scores, synthesizing agreement, confidence_gap, unresolved_risks, and
  needs_more_data; complements the Review Board (ADR-0092). Contracts
  `packages/shared/src/contracts/agent-council.ts`. No migration. Smoke `pnpm capstone:smoke`. Docs:
  `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0097-agent-council.md`.
- **Billion-Dollar Operator Mode** (`packages/core/src/operator-mode/engine.ts`): **`review()`** holds every major
  recommendation to a "$100M+?" lens (`hundred_m_fit`) and returns the cleaner, scalable version when fit is low.
  Contracts `packages/shared/src/contracts/operator-mode.ts`. No migration. Smoke `pnpm capstone:smoke`. Docs:
  `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0098-operator-mode.md`.
- **Capital Allocation Board** (`packages/core/src/capital-board/board.ts`): **`allocate()`** scores each option on
  payback / liquidity / leverage / compounding / opportunity cost and issues one of **8 dispositions**; complements
  the Executive Capital Allocator (ADR-0088). Contracts `packages/shared/src/contracts/capital-board.ts`. No
  migration. Smoke `pnpm capstone:smoke`. Docs: `docs/COGNITIVE_OFFLOADING_OS.md`,
  `docs/adr/ADR-0099-capital-board.md`.
- **Million-Dollar Sprint Engine** (`packages/core/src/million-sprint/engine.ts`): **`build()`** ranks cash paths
  to $1M by speed / size / probability / effort / risk / leverage / readiness / energy with 7/30/90-day plans and
  **no fantasy math**. Contracts `packages/shared/src/contracts/million-sprint.ts`. No migration. Smoke
  `pnpm capstone:smoke`. Docs: `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0100-million-sprint.md`.
- **Revenue Truth System** (`packages/core/src/revenue-truth/engine.ts`): **`report()`** places deals on a **9-rung
  honest ladder**, prioritizing cash collected over signed over invoiced over qualified over booked — activity is
  never revenue. Contracts `packages/shared/src/contracts/revenue-truth.ts`. No migration. Smoke
  `pnpm capstone:smoke`. Docs: `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0101-revenue-truth.md`.
- **Executive Delegation System** (`packages/core/src/delegation/engine.ts`): **`classify()`** assigns each task one
  of **9 owners**, keeping `alyssa_only` for work that genuinely needs her. Contracts
  `packages/shared/src/contracts/delegation.ts`. No migration. Smoke `pnpm capstone:smoke`. Docs:
  `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0102-delegation.md`.
- **Enterprise Risk Register** (`packages/core/src/risk-register/engine.ts`): risks across **13 categories** with
  computed exposure; mutable (`add` / `update`); **`top(10)`** drives the weekly review. Contracts
  `packages/shared/src/contracts/risk-register.ts`. No migration (mutable store). Smoke `pnpm capstone:smoke`. Docs:
  `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0103-risk-register.md`.
- **Board Packet Generator** (`packages/core/src/board-packet/generator.ts`): **`generate()`** produces board-level
  monthly reporting as a read model before a board exists. Contracts
  `packages/shared/src/contracts/board-packet.ts`. No migration. Smoke `pnpm capstone:smoke`. Docs:
  `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0104-board-packet.md`.
- **Strategic Exit & Asset Value Engine** (`packages/core/src/strategic-exit/engine.ts`): **`assess()`** values
  every asset against **8 exit paths** with valuation logic and the steps to make it sellable. Contracts
  `packages/shared/src/contracts/strategic-exit.ts`. No migration. Smoke `pnpm capstone:smoke`. Docs:
  `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0105-strategic-exit.md`.
- **Founder Nervous System Protection** (`packages/core/src/nervous-system/engine.ts`): **`assess()`** tracks
  founder load (status ok / elevated / high / critical) and recommends relief that preserves execution speed —
  burnout as enterprise risk. Contracts `packages/shared/src/contracts/nervous-system.ts`. No migration. Smoke
  `pnpm capstone:smoke`. Docs: `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0106-nervous-system.md`.
- **Relaxation Outcome + True Progress** (`packages/core/src/outcome/relaxation.ts`,
  `packages/core/src/outcome/true-progress.ts`): optimize for money / risk control / delegation / systems / freedom
  / peace of mind; True Progress **never confuses intensity with progress**. Contracts
  `packages/shared/src/contracts/outcome-engines.ts`. No migration. Smoke `pnpm capstone:smoke`. Docs:
  `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0107-outcome-engines.md`.
- **Capital Engine** (`packages/core/src/capital-engine/engine.ts`): **`report()`** scores recommendations across
  **10 capital types** with compounding, payoff horizon, and conversion paths; optimizes for lifetime accumulation.
  Contracts `packages/shared/src/contracts/capital-engine.ts`. No migration. Smoke `pnpm capstone:smoke`. Docs:
  `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0108-capital-engine.md`.
- **Consequence Horizon Engine** (`packages/core/src/consequence-horizon/engine.ts`): **`project()`** estimates
  second- and third-order consequences across **immediate / 30-day / 90-day / 1-year / 5-year** horizons. Contracts
  `packages/shared/src/contracts/consequence-horizon.ts`. No migration. Smoke `pnpm capstone:smoke`. Docs:
  `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0109-consequence-horizon.md`.
- **The Alfy² Pyramid** (`packages/core/src/pyramid/engine.ts`): **`classify()`** places a feature/output on the
  **8-level pyramid** (Capture → Organize → Understand → Recommend → Execute → Compound → Multiply → Freedom) and
  recommends the next level up. Contracts `packages/shared/src/contracts/pyramid.ts`. No migration. Smoke
  `pnpm capstone:smoke`. Docs: `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0110-pyramid.md`.
- **`docs/COGNITIVE_OFFLOADING_OS.md`**: narrative overview tying all 19 engines together under the L0 directive
  ("give Alyssa her life back"), the Executive Decision Filter, and Brain/Policy/Orchestrator/Hands separation.
### Notes
- The capstone's mission and principles are **folded into existing doctrine** — the Constitution (ADR-0051) and the
  Five Immutable Laws (ADR-0087) — rather than re-built, keeping one source of truth.
- One consolidated smoke `pnpm capstone:smoke` runs all 19 engines with a frozen clock + deterministic ids; each
  parses its output through its Zod schema.

## [1.19.0] — 2026-06-25 — Leverage & Media Capstone
### Added
- **Story Mining Engine** (`packages/core/src/story-mining/engine.ts`): turns every experience from **12 sources**
  into a fully worked story for **8 channels** — each carrying hook, conflict, lesson, emotion, transformation,
  why-it-matters, audience, business-tie-in, CTA, proof, best-channels, and urgency. Merges the prior Story Mining
  and Story Intelligence ideas; never lose a good story. Contracts
  `packages/shared/src/contracts/story-mining.ts`. Migrations `0132`/`0133` (append-only). Smoke `pnpm story:smoke`.
  Docs: `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0074-story-mining.md`.
- **Media Operating System** (`packages/core/src/media-os/engine.ts`): one raw moment in **11 input kinds** →
  many finished, brand-correct assets across **12 output kinds**; **`requires_approval` always true** — nothing
  publishes without Alyssa. Give Alyssa her life back without taking her hands off the wheel. Contracts
  `packages/shared/src/contracts/media-os.ts`. Migrations `0134`/`0135`. Smoke `pnpm mediaos:smoke`. Docs:
  `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0075-media-os.md`.
- **Brand DNA Engine** (`packages/core/src/brand-dna/engine.ts`): **9 brands** seeded with full identity (voice,
  visuals, audience, values, promise); **`resolveBrand()`** lets the Media OS auto-detect which brand content
  belongs to. Contracts `packages/shared/src/contracts/brand-dna.ts`. Migrations `0136`/`0137`. Smoke
  `pnpm brand:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0076-brand-dna.md`.
- **Content Factory** (`packages/core/src/content-factory/factory.ts`): one source → a **42-piece linked package**
  via `CONTENT_MULTIPLIER` (1 YouTube long, 5 shorts, 5 reels, 10 X, 5 LinkedIn, 3 carousels, …); pieces linked to
  source and siblings, nothing created twice. Contracts `packages/shared/src/contracts/content-factory.ts`.
  Migrations `0138`/`0139` (append-only). Smoke `pnpm contentfactory:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`,
  `docs/adr/ADR-0077-content-factory.md`.
- **Production Studio** (`packages/core/src/production-studio/studio.ts`): stores **17 production-asset kinds** +
  per-brand presets that run the post-approval pipeline automatically (Decoded: Intro A / Outro B / sponsor after
  first topic / chapters / subtitles / clips / show notes / schedule). Contracts
  `packages/shared/src/contracts/production-studio.ts`. Migrations `0140`/`0141` (assets) + `0142`/`0143`
  (presets). Smoke `pnpm prodstudio:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`,
  `docs/adr/ADR-0078-production-studio.md`.
- **Visibility Engine** (`packages/core/src/visibility/engine.ts`): per-business **Visibility Score** from **14
  signals** + recommends where/what/when to post, collaborators, podcasts to appear on, conferences, and awards;
  names the **3 weakest signals**. Contracts `packages/shared/src/contracts/visibility.ts`. Migrations
  `0144`/`0145` (append-only). Smoke `pnpm visibility:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`,
  `docs/adr/ADR-0079-visibility-engine.md`.
- **PR & Authority Engine** (`packages/core/src/pr-authority/engine.ts`): auto-detects PR opportunities from **6
  triggers** (launch / partnership / funding / win / trend / innovation) → drafted pitch + target outlets, builds
  the authority asset stack; **`markSent` throws unless approved** — pitches never sent without approval.
  Complements the per-business PR Strategy Generator (ADR-0073). Contracts
  `packages/shared/src/contracts/pr-authority.ts`. Migrations `0146`/`0147`. Smoke `pnpm prauthority:smoke`. Docs:
  `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0080-pr-authority.md`.
- **Audience Intelligence** (`packages/core/src/audience-intel/engine.ts`): distills an audience's fears / goals /
  language / objections / desires / misconceptions / favorite-content / best-offers from **9 signal kinds**;
  re-analysis **upserts** (merges signals). Contracts `packages/shared/src/contracts/audience-intel.ts`.
  Migrations `0148`/`0149`. Smoke `pnpm audience:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`,
  `docs/adr/ADR-0081-audience-intelligence.md`.
- **Personal Freedom Engine** (`packages/core/src/personal-freedom/engine.ts`): tracks **work vs life hours**,
  computes a **freedom score**, recommends automation / delegation / agent-creation / workflow-improvement /
  batch; every recommendation carries **`preserves_performance: true`** — more freedom without losing performance.
  Maximize life, not work. Contracts `packages/shared/src/contracts/personal-freedom.ts`. Migrations `0150`/`0151`
  (append-only). Smoke `pnpm freedom:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`,
  `docs/adr/ADR-0082-personal-freedom.md`.
- **Legacy Engine** (`packages/core/src/legacy/engine.ts`): turns repeatable knowledge in **10 kinds** into
  enduring legacy forms (SOP / FounderOS feature / course / podcast / keynote / book chapter / licensing /
  consulting framework) with a **legacy score**; build IP that compounds over decades. Contracts
  `packages/shared/src/contracts/legacy.ts`. Migrations `0152`/`0153` (append-only). Smoke `pnpm legacy:smoke`.
  Docs: `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0083-legacy-engine.md`.
- **Compounding Engine** (`packages/core/src/compounding/engine.ts`): evaluates every completed task for **21
  reusable forms**, scores it on **8 compounding dimensions**, recommends the reusable version, and maintains the
  **Asset Lineage Graph** (what created it / what it created / businesses / revenue / agents / workflows /
  version). Optimize for compounding, not output volume. Contracts
  `packages/shared/src/contracts/compounding.ts`. Migrations `0154`/`0155` (evaluations, append-only) +
  `0156`/`0157` (asset_lineage, mutable). Smoke `pnpm compounding:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`,
  `docs/adr/ADR-0084-compounding-engine.md`.
- **Multiplication Engine** (`packages/core/src/multiplication/engine.ts`): never solve once — evaluates whether a
  solution helps **9 targets**, recommends **8 shared forms**, scores **Multiplication** as future uses per 100.
  1 solution → 100 uses → 1000 hours saved. Contracts `packages/shared/src/contracts/multiplication.ts`.
  Migrations `0158`/`0159` (append-only). Smoke `pnpm multiplication:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`,
  `docs/adr/ADR-0085-multiplication-engine.md`.
- **Leverage Engine** (`packages/core/src/leverage/engine.ts`): scores every recommendation on **14 inputs** into
  a **tier** (low / medium / high / compounding / generational); **`compare()`** recommends the highest-leverage
  path, not the fastest. `score()` is pure; **`compare()` persists** its comparisons. Contracts
  `packages/shared/src/contracts/leverage.ts`. Migrations `0160`/`0161` (comparisons, append-only). Smoke
  `pnpm leverage:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0086-leverage-engine.md`.
- **The Five Immutable Laws** (`packages/core/src/immutable-laws/laws.ts`): **Protect the Human, Compound
  Everything, Allocate Capital Intelligently, Prefer Systems Over Heroics, Increase Founder Freedom** — every
  feature / agent / workflow / recommendation must satisfy them; **Law 1 and Law 4 are hard gates**; every major
  recommendation explains how it satisfies the laws. Contracts `packages/shared/src/contracts/immutable-laws.ts`.
  **No migration** (frozen catalog + checker). Smoke `pnpm laws:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`,
  `docs/adr/ADR-0087-immutable-laws.md`.
- **Executive Capital Allocator** (`packages/core/src/capital-allocator/allocator.ts`): daily / weekly /
  quarterly highest-value allocation across **12 capital kinds** (time / money / energy / attention /
  relationships / reputation / knowledge / technology / assets / employees / agents / automation); surfaces
  highest ROI / leverage / compounding / strategic / freedom, the trade-offs (what each pick depletes), and
  quarterly what to stop. Never optimize one resource while destroying another. Contracts
  `packages/shared/src/contracts/capital-allocator.ts`. Migrations `0162`/`0163` (append-only). Smoke
  `pnpm capital:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0088-capital-allocator.md`.
- **Opportunity Cost Engine** (`packages/core/src/opportunity-cost/engine.ts`): compares **2–4 options** on
  upside / downside / capital / time / stress / complexity / risk / confidence / leverage, computes each option's
  opportunity cost vs the best alternative, and names the best financial / strategic / long-term / low-risk /
  fastest / highest-leverage choice — always showing what is **not** chosen and why. Contracts
  `packages/shared/src/contracts/opportunity-cost.ts`. Migrations `0164`/`0165` (append-only). Smoke
  `pnpm oppcost:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0089-opportunity-cost.md`.
- **Executive Decision Journal** (`packages/core/src/decision-journal/journal.ts`): records decisions with
  alternatives / reasoning / data / assumptions / risks / expected outcome; **schedules 30/90/365-day reviews** to
  record actual outcome + lessons; surfaces recurring decision patterns (categories with ≥2 decisions) to improve
  future recommendations. Contracts `packages/shared/src/contracts/decision-journal.ts`. Migrations `0166`/`0167`.
  Smoke `pnpm journal:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0090-decision-journal.md`.
- **Enterprise Memory Timeline** (`packages/core/src/memory-timeline/timeline.ts`): a chronological history of
  **13 event kinds**, each linking related assets / agents / people / businesses / lessons; answers `firstMention`
  ("when did we first discuss this?") and `after` ("what happened after that decision?"). Contracts
  `packages/shared/src/contracts/memory-timeline.ts`. Migrations `0168`/`0169` (append-only). Smoke
  `pnpm timeline:smoke`. Docs: `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0091-memory-timeline.md`.
- **Executive Review Board** (`packages/core/src/review-board/board.ts`): a virtual board of **10 roles** (CEO /
  CFO / COO / CTO / CMO / CLO / CRO / CSO / CPO / CCO), each independently evaluating benefits / risks /
  blind-spots / dependencies / costs / operational-impact through its lens; synthesizes a final recommendation and
  **highlights disagreements** rather than forcing consensus. Contracts
  `packages/shared/src/contracts/review-board.ts`. Migrations `0170`/`0171` (append-only). Smoke `pnpm board:smoke`.
  Docs: `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0092-review-board.md`.
- Supabase migrations now through `0171` (the Five Immutable Laws add **no migration** — a frozen catalog +
  checker); `packages/core` now has **~90 engines/capabilities + tenancy** (71 prior + **19 new**: Story Mining
  Engine, Media Operating System, Brand DNA Engine, Content Factory, Production Studio, Visibility Engine, PR &
  Authority Engine, Audience Intelligence, Personal Freedom Engine, Legacy Engine, Compounding Engine,
  Multiplication Engine, Leverage Engine, The Five Immutable Laws, Executive Capital Allocator, Opportunity Cost
  Engine, Executive Decision Journal, Enterprise Memory Timeline, Executive Review Board); `tsc -b` clean. ADRs
  `0074`..`0092`.

## [1.18.0] — 2026-06-25 — Finance, Intelligence & Media
### Added
- **Finance Command Center** (`packages/core/src/finance-command/center.ts`): the complete personal and business
  financial view — per business, monthly revenue/expenses, **profit**, **margin**, **tax exposure**, **cash
  runway**, **best next financial action**, **risks**, and **opportunities**, plus rolled-up totals and
  **personal net worth**. The hard guardrail is mechanical: **`money_actions_require_approval` is always true**
  and **`forbiddenActions()`** exposes the never-without-approval list — **move_money, spend_money, open_account,
  execute_investment, file_taxes, sign_document.** Analyze aggressively, execute conservatively. Contracts
  `packages/shared/src/contracts/finance-command.ts`. Migrations `0105`/`0106` (append-only snapshots). Smoke
  `pnpm finance:smoke`. Docs: `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0061-finance-command-center.md`.
- **Legal Tax Strategy Analyzer** (`packages/core/src/tax-strategy/analyzer.ts`): analyzes **15 tax areas**;
  every recommendation carries `why_it_may_apply`, `estimated_benefit`, `risk_level`, `complexity`,
  `requires_professional_review` (**always true**), `documents_needed`, `next_step`, and `questions_for_advisor`,
  under a standing disclaimer. **Legal optimization only** — avoidance, deferral, deduction, structuring,
  planning — **never evasion**; analysis-for-review, not advice; CPA/attorney review required. Contracts
  `packages/shared/src/contracts/tax-strategy.ts`. Migrations `0107`/`0108` (append-only). Smoke `pnpm tax:smoke`.
  Docs: `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0062-tax-strategy-analyzer.md`.
- **Entity Structure Optimizer** (`packages/core/src/entity-structure/optimizer.ts`): LLC vs S Corp vs C Corp vs
  subsidiary vs holding company by a transparent rule (**raise/exit → C Corp; IP/SaaS/liability → holding
  company; profit ≥ 60k + payroll → LLC/S Corp; else LLC**), with alternatives (pros/cons/tax/legal), CPA &
  attorney questions, and an action checklist; `requires_professional_review` **always true**. Never forms,
  converts, files, or signs. Contracts `packages/shared/src/contracts/entity-structure.ts`. Migrations
  `0109`/`0110` (append-only). Smoke `pnpm entity:smoke`. Docs: `docs/FINANCE_INTEL_MEDIA.md`,
  `docs/adr/ADR-0063-entity-structure-optimizer.md`.
- **Wealth Architecture Dump Box** (`packages/core/src/wealth-dump-box/box.ts`): a finance-specific drop run
  through a **10-step pipeline** (classify, summarize, scope personal/business, legality notes, upside, risk,
  link goals, advisor questions, save to the Wealth Knowledge Vault **by reference**, next action); tax / trust /
  IRA / offshore / financial-product items are flagged for professional review. Contracts
  `packages/shared/src/contracts/wealth-dump-box.ts`. Migrations `0111`/`0112`. Smoke `pnpm wealthbox:smoke`.
  Docs: `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0064-wealth-dump-box.md`.
- **Elite Money Game Engine** (`packages/core/src/money-game/engine.ts`): a **17-strategy** catalog (holding /
  operating / IP companies, management fees, owner comp, retirement, SDIRA, Solo 401(k), trusts, real estate,
  investments, deductions, charitable, insurance, asset protection, estate, compliant offshore), each with
  what / when / when-not / benefits / risks / compliance / advisor / complexity / steps; `analyze()` assembles a
  ranked plan with **`protect_downside_first`** and **`legal_avoidance_only`** always true. Legal avoidance
  only; advisor execution. Contracts `packages/shared/src/contracts/money-game.ts`. Migrations `0113`/`0114`
  (append-only). Smoke `pnpm moneygame:smoke`. Docs: `docs/FINANCE_INTEL_MEDIA.md`,
  `docs/adr/ADR-0065-elite-money-game.md`.
- **Algorithm Overlay System** (`packages/core/src/algorithm-overlay/overlay.ts`): **15 transparent scoring
  algorithms** (priority, ROI, fastest path to cash, friction, conversion probability, agent-need detection,
  opportunity matching, business health, goal gap, risk, pattern prediction, energy-aware scheduling,
  knowledge-to-money, portfolio allocation, A/B-test winner) above agents/workflows/goals/businesses/campaigns/
  tasks. **Phase 1 rules-based** (phases graduate rules → weighted → historical → predictive). Each score is
  `0..1` with confidence, why, `data_used`, `data_missing`, recommended action, `requires_approval`, and an
  override. Contracts `packages/shared/src/contracts/algorithm-overlay.ts`. **No migration** (static catalog +
  computed scores). Smoke `pnpm overlay:smoke`. Docs: `docs/FINANCE_INTEL_MEDIA.md`,
  `docs/adr/ADR-0066-algorithm-overlay.md`.
- **Executive Intelligence Network** (`packages/core/src/intelligence-network/ein.ts`): converts external
  information into executive intelligence — **ten article scores** drive a five-way **classification**
  (ignore / interesting / monitor / research / immediate_action); each item states why it matters, businesses/
  goals affected, agents to notify, immediate actions, future implications, confidence, sources, follow-ups.
  Developing stories roll into **one living briefing** with a timeline — the same story is **never reread
  twice**. Contracts `packages/shared/src/contracts/intelligence-network.ts`. Migrations `0115`/`0116` (items,
  append-only) + `0117`/`0118` (living briefings, mutable). Smoke `pnpm ein:smoke`. Docs:
  `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0067-intelligence-network.md`.
- **Failure Database + Future Trends Lab** (`packages/core/src/failure-database/database.ts` +
  `packages/core/src/future-trends/lab.ts`): the Failure Database tracks **9 failure kinds** as permanent
  institutional knowledge (what happened, timeline, why, root cause, warning signs, lessons, how Alfy² avoids
  repeating it); the Future Trends Lab tracks trends over **6 months–10 years** with likelihood, impact, affected
  industries/businesses, prep steps, skills/tech needed, investments, threats, and a **readiness score
  (likelihood × impact)**. Contracts `packages/shared/src/contracts/failure-trends.ts`. Migrations `0119`/`0120`
  (failures, append-only) + `0121`/`0122` (trends, mutable). Smokes `pnpm failuredb:smoke` + `pnpm trends:smoke`.
  Docs: `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0068-failure-trends.md`.
- **Intelligence Lenses** (`packages/core/src/intel-lenses/why-this-matters.ts` +
  `packages/core/src/intel-lenses/contrarian.ts`): **Why This Matters** translates any item into decisions for
  Alyssa's businesses (affected, needs change, competitive advantage, compliance risk, product opportunity,
  test/ignore, assets/agents/workflows to update, strategy-review tier); **Contrarian View** constructs the
  strongest credible opposing case (mainstream vs contrarian, evidence both sides, ignored risks, questionable
  assumptions, barriers, compliance, business-model weaknesses, execution risks, recommendation) to cut blind
  spots and prevent hype-driven decisions. Contracts `packages/shared/src/contracts/intel-lenses.ts`. **No
  migration** (compute read-models). Smokes `pnpm whymatters:smoke` + `pnpm contrarian:smoke`. Docs:
  `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0069-intel-lenses.md`.
- **Briefing Engine** (`packages/core/src/briefings/engine.ts`): one engine, four briefings — **morning**
  (priorities/revenue/follow-ups/blocked/calendar/news lanes/agent recs, ~5 min), **lunch** (a learning/
  intelligence update — top reads, why, action), **evening** (close the day — wins/money/what-didn't-move + 7
  questions, saving reflections to **Institutional Memory**), **weekly** (a strategic intelligence report). A
  greeting per kind, sections from labeled inputs, estimated reading time. Contracts
  `packages/shared/src/contracts/briefings.ts`. Migrations `0123`/`0124` (append-only). Smoke
  `pnpm briefing:smoke`. Docs: `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0070-briefing-engine.md`.
- **Podcast Studio OS** (`packages/core/src/podcast-studio/studio.ts`): manages "Decoded with Alyssa DelTorre"
  idea → episode → monetization. Per idea: title, hook, premise, why now, audience, key story, talking points,
  guest fit, business tie-in, monetization angle, clips, CTA, related businesses, assets needed; a **six-stage
  lifecycle**. Inputs come from the Executive Intelligence Network, business updates, and the failure/trends
  databases. Contracts `packages/shared/src/contracts/podcast-studio.ts`. Migrations `0125`/`0126`. Smoke
  `pnpm podcast:smoke`. Docs: `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0071-podcast-studio.md`.
- **Podcast Guest Booking Agent** (`packages/core/src/podcast-guests/agent.ts`): mines contacts + external
  experts, ranks by a weighted composite of relevance / credibility / audience-fit / business-value, drafts
  outreach, tracks replies, schedules, and books Alyssa onto other shows too (**inbound_guest** vs
  **outbound_appearance**). **Never contacts anyone until outreach is approved** (or persistent approval
  exists) — **`markContacted` throws** otherwise. Contracts `packages/shared/src/contracts/podcast-guests.ts`.
  Migrations `0127`/`0128`. Smoke `pnpm guestbooking:smoke`. Docs: `docs/FINANCE_INTEL_MEDIA.md`,
  `docs/adr/ADR-0072-podcast-guests.md`.
- **PR Department** (`packages/core/src/pr/generator.ts`): PR is now the **13th standard department** — the
  Business Template (`packages/core/src/business/template.ts`) adds it, `DepartmentKind` gains **`pr`**, and the
  template now defines **thirteen departments** every business inherits. The PR generator produces media angles,
  target publications, podcast targets, a founder-story angle, credibility proof, a press-kit checklist, outreach
  templates, and reputation risks. Contracts `packages/shared/src/contracts/pr.ts`. Migrations `0129`/`0130`
  (`pr_strategies`) + `0131` (widens the `business_departments` CHECK to allow `'pr'`). Covered by
  `pnpm business:smoke` (now 13 departments). Docs: `docs/FINANCE_INTEL_MEDIA.md`,
  `docs/adr/ADR-0073-pr-department.md`.
- Supabase migrations now through `0131` (the Algorithm Overlay and Intelligence Lenses add **no migration** —
  static catalog and read models respectively); `packages/core` now has **~71 engines/capabilities + tenancy**
  (57 prior + **14 new**: Finance Command Center, Legal Tax Strategy Analyzer, Entity Structure Optimizer,
  Wealth Architecture Dump Box, Elite Money Game Engine, Algorithm Overlay System, Executive Intelligence
  Network, Failure Database, Future Trends Lab, Intelligence Lenses, Briefing Engine, Podcast Studio OS, Podcast
  Guest Booking Agent, PR Department); the Business Template now defines **13 departments**; `tsc -b` clean. ADRs
  `0061`..`0073`.

## [1.17.0] — 2026-06-25 — Constitution, Enterprise Structure & Institutional Memory
### Added
- **Constitution** (`packages/core/src/constitution/constitution.ts`): the highest authority — **ten
  principles** exposed as the frozen `PRINCIPLES` catalog (1 Human remains in command, 2 Think aggressively,
  3 Act conservatively, 4 Execute with urgency, 5 Finish what was started, 6 Protect trust, 7 Optimize for
  measurable outcomes, 8 Reuse before rebuilding, 9 Explain important decisions, 10 Continuously improve).
  `check(action)` returns a verdict per principle; the **hard gates** are Principle 3 (an irreversible/financial/
  legal/production action **without approval** must go for approval — a violation until approved) and Principle 5
  (abandoning approved work **without a documented reason** — a violation); Principles 7 and 9 flag a missing
  measurable outcome / missing explanation. Every agent references the Constitution during execution; composes
  the AI Center of Excellence, the Security Gate, and the Plane registry. Contracts
  `packages/shared/src/contracts/constitution.ts`. **No migration** (frozen principle catalog). Smoke
  `pnpm constitution:smoke`. Docs: `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0051-constitution.md`.
- **Enterprise Hierarchy** (`packages/core/src/hierarchy/registry.ts`): the **8-level** org tree Enterprise →
  Company → Department → Team → Project → Asset → Task → Agent; every node inherits policies, security, branding,
  permissions, and reusable assets from its ancestors. `resolve()` merges top-down (**lists union, scalars
  override**) so company overrides don't break inheritance; `atLevel` supports portfolio reporting and
  `sharedAcrossCompanies` supports shared vendors/SOPs/compliance and cross-company opportunities; a child's
  level must sit below its parent's. Contracts `packages/shared/src/contracts/hierarchy.ts`. Migrations
  `0089`/`0090`. Smoke `pnpm hierarchy:smoke`. Docs: `docs/CONSTITUTION_AND_ENTERPRISE.md`,
  `docs/adr/ADR-0052-enterprise-hierarchy.md`.
- **Reflection Engine** (`packages/core/src/reflection/engine.ts`): a **weekly/monthly/quarterly/yearly** review
  evaluating revenue, missed opportunities, follow-up failures, automation & agent performance, workflow
  bottlenecks, time, energy, decision quality, and goal progress; generates lessons, improvements, workflows to
  automate/retire, new agents, risks, and next-period priorities. Reviews accumulate in `history` — the
  institutional memory of Alfy² over time. Composes the Pattern Engine and Workflow ROI Tracking. Contracts
  `packages/shared/src/contracts/reflection.ts`. Migrations `0091`/`0092` (append-only). Smoke
  `pnpm reflection:smoke`. Docs: `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0053-reflection-engine.md`.
- **Enterprise Knowledge Graph** (`packages/core/src/knowledge-graph/graph.ts`): **15 node kinds** (people,
  businesses, projects, tasks, documents, assets, meetings, github repos, automations, goals, workflows, agents,
  vendors, investors, competitors) connected by typed, weighted relationships. `search` by kind/term,
  `neighborhood` one-hop, and `recommendations` via **triadic closure** (pairs sharing ≥2 neighbours but not
  directly linked). Supports the "every project involving Alberto, Divini Procure, investors, and procurement"
  query. Contracts `packages/shared/src/contracts/knowledge-graph.ts`. Migrations `0093`/`0094` (nodes+edges).
  Smoke `pnpm graph:smoke`. Docs: `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0054-knowledge-graph.md`.
- **Operating Manual Generator** (`packages/core/src/operating-manual/generator.ts`): when a workflow becomes
  stable, generates its **8 artifacts** (SOP, checklist, playbook, onboarding guide, training document,
  troubleshooting guide, KPIs, ownership matrix), each saved to the Asset Library **by reference** (`assetSink`)
  and marked reusable IP. **Gated on `is_stable`**. Workflow-triggered, distinct from the domain-triggered
  Enterprise Playbook Generator. Contracts `packages/shared/src/contracts/operating-manual.ts`. Migrations
  `0095`/`0096`. Smoke `pnpm manual:smoke`. Docs: `docs/CONSTITUTION_AND_ENTERPRISE.md`,
  `docs/adr/ADR-0055-operating-manual-generator.md`.
- **Digital Twin** (`packages/core/src/digital-twin/twin.ts`): a continuously-updated model of the enterprise
  (businesses, finances, assets, contacts, projects, agents, workflows, campaigns, goals, risks) with **runway**.
  `simulate()` runs **4 what-if scenarios** (hire, pause_business, revenue_drop, launch_offer) projecting
  state/runway/deltas with a recommendation. The basis for forecasting and planning; complements the Control
  Tower (read snapshot) and the Business Simulation Engine (A-vs-B). Contracts
  `packages/shared/src/contracts/digital-twin.ts`. Migrations `0097`/`0098` (append-only). Smoke
  `pnpm twin:smoke`. Docs: `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0056-digital-twin.md`.
- **Institutional Memory** (`packages/core/src/institutional-memory/ledger.ts`): an **append-only** ledger
  capturing **9 record kinds** (decision rationale, rejected idea, failed experiment, successful experiment,
  negotiation outcome, lesson learned, vendor experience, client preference, implementation history) — **never
  edited or deleted**. A `decision_rationale` **must** record `what_we_knew` AND `why_chosen` (answering "what
  did we know at the time, and why did we choose this?"); `rationaleFor` returns it. Complements the Memory
  Engine and the Reflection Engine. Contracts `packages/shared/src/contracts/institutional-memory.ts`.
  Migrations `0099`/`0100` (append-only). Smoke `pnpm institutional:smoke`. Docs:
  `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0057-institutional-memory.md`.
- **Executive Mission Control** (`packages/core/src/mission-control/engine.ts`): the one-screen executive
  dashboard — enterprise & company health (scored, labelled), revenue, pipeline, cash, runway, goals, blocked
  items, risks, approvals, top opportunities, agent/automation/system health, AI costs, ROI, daily priorities,
  and a single computed **headline** (urgent runway → approvals → risks → blocked → today's first priority). A
  **read model** composing the Control Tower, Cost CFO, and Agent Observability; the Tower is the operator
  snapshot, Mission Control the executive composite adding system/automation health, AI cost, and the headline.
  Contracts `packages/shared/src/contracts/mission-control.ts`. **No migration** (read model). Smoke
  `pnpm mission:smoke`. Docs: `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0058-mission-control.md`.
- **Continuous Improvement Engine** (`packages/core/src/continuous-improvement/engine.ts`): evaluates every
  workflow on **speed, quality, cost efficiency, conversion, reliability, user ease** (health = mean) and
  recommends **simplify / automate / remove / merge / split / delegate**, each with expected impact and
  confidence, sorted by **impact × confidence**; `worstFirst` prioritizes where improvement matters most;
  re-evaluation upserts. Complements Workflow ROI Tracking and the Reflection Engine. Contracts
  `packages/shared/src/contracts/continuous-improvement.ts`. Migrations `0101`/`0102`. Smoke `pnpm improve:smoke`.
  Docs: `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0059-continuous-improvement.md`.
- **Builder Mode** (`packages/core/src/builder-mode/builder.ts`): trigger phrase
  `BUILDER_TRIGGER = "I want to build"`. `build()` produces the complete **18-stage** venture operating system
  (discovery, market validation, offer design, pricing, business model, brand, product architecture, technical
  architecture, database, agent plan, asset checklist, legal, marketing plan, sales plan, automation plan, launch
  plan, KPIs, review checkpoints) — each stage with a title, summary, items, and open questions, not just a task
  list. **Human-in-command**: always returns `awaiting_approval`; nothing is built until `approve()`. Composes
  the Idea Builder and Business Template. Contracts `packages/shared/src/contracts/builder-mode.ts`. Migrations
  `0103`/`0104`. Smoke `pnpm builder:smoke`. Docs: `docs/CONSTITUTION_AND_ENTERPRISE.md`,
  `docs/adr/ADR-0060-builder-mode.md`.
- Supabase migrations now through `0104` (the Constitution and Mission Control add **no migration** — frozen
  catalog and read model respectively); `packages/core` now has **57 engines/capabilities + tenancy** (47 prior
  + **10 capabilities**: Constitution, Enterprise Hierarchy, Reflection Engine, Enterprise Knowledge Graph,
  Operating Manual Generator, Digital Twin, Institutional Memory, Executive Mission Control, Continuous
  Improvement Engine, Builder Mode); `tsc -b` clean. ADRs `0051`..`0060`.

## [1.16.0] — 2026-06-25 — Governance, Economics & Doctrine
### Added
- **Agent Evaluation Lab** (`packages/core/src/agent-eval/lab.ts`): before any agent is trusted it is tested
  against test tasks with **expected outputs**, **failure cases**, and **risk checks**, scored on **accuracy,
  usefulness, cost, speed, reliability** (each `0..1`; cost/speed are inverse of cost/runtime). A **6-stage
  ladder** draft→testing→limited_use→approved→production→retired; **pass** = accuracy/reliability/usefulness
  all over threshold (default `0.8`) **and** no risk flagged on a non-failure case. `promote()` into the gated
  stages (`approved`, `production`) **throws** unless passed — no `broad_permissions_allowed` without a pass.
  Composes Agent Identity & Zero Trust + the AI Center of Excellence. Contracts
  `packages/shared/src/contracts/agent-eval.ts`. Migrations `0079`/`0080`. Smoke `pnpm agenteval:smoke`.
  Docs: `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0045-agent-evaluation-lab.md`.
- **Control Plane / Execution Plane registry** (`packages/core/src/planes/registry.ts`): splits the platform
  into a **Control Plane** (10 concerns: policy, identity, permissions, approvals, routing, evaluations,
  observability, audit logs, cost controls, risk controls) and an **Execution Plane** (8 concerns: agents,
  workflows, automations, connectors, tools, campaigns, repo actions, content generation). `PLANE_CATALOG`
  tags each engine to a plane+concern; `guard(ExecutionRequest)` allows an execution action **only if**
  identity_verified + policy_checked + permitted (and, when approval required, approved) — any missing gate →
  `bypass_attempt`, denied. **No agent may bypass the Control Plane.** Contracts
  `packages/shared/src/contracts/planes.ts`. **No migration** (static architecture metadata). Smoke
  `pnpm planes:smoke`. Docs: `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0046-control-execution-planes.md`.
- **Cost & Token CFO** (`packages/core/src/cost-cfo/cfo.ts`): tracks **6 cost categories** (model, api,
  automation, tool_subscription, compute, storage) against value (revenue + human time saved × rate); per
  workflow computes total cost, value, **cost per task/lead/booked-call/sale** (`null` when denominator 0),
  **ROI** `(value − cost) / cost`, **break-even**, and largest cost category; recommends
  cheaper_model/local_model (model ≥ 50%), batch_processing (≥ 100 tasks), pause_expensive_agent (ROI < 0),
  upgrade_when_roi_supports (ROI ≥ 2), or better_workflow (thin margin). Complements Workflow ROI Tracking.
  Contracts `packages/shared/src/contracts/cost-cfo.ts`. Migrations `0081`/`0082` (append-only). Smoke
  `pnpm cfo:smoke`. Docs: `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0047-cost-token-cfo.md`.
- **Business Simulation Engine** (`packages/core/src/business-simulation/engine.ts`): an A-vs-B comparator
  over **6 decision kinds** (focus_choice, campaign_choice, hire_vs_automate, pricing_choice, lead_focus,
  build_vs_sell); each option (projected_revenue, probability, time_cost_days, stress_cost, risk) is projected
  to best/likely/worst with **expected value** `revenue × probability` and scored on a composite weighing EV
  against risk, stress, and time; recommends the higher-scoring option with a reason. Distinct from the
  scenario Simulation Engine — picks a winner between two options and adds stress_cost + time_cost. Contracts
  `packages/shared/src/contracts/business-simulation.ts`. Migrations `0083`/`0084` (append-only). Smoke
  `pnpm bizsim:smoke`. Docs: `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0048-business-simulation-engine.md`.
- **FounderOS Commercialization Layer** (`packages/core/src/commercialization/registry.ts`): Alfy² is Tenant
  001, designed to later become FounderOS; classifies every feature by **tier** (personal_only,
  business_reusable, founder_saas_feature, agency_service, enterprise_product) and flags SaaS-module
  candidates; seeds **10 named features** (Executive Inbox, Revenue Factory, Conversion War Room, Agent
  Factory, Follow-Up Autopilot, Asset Library, Goal Engine, Pattern Engine, Control Tower, Knowledge-to-Money
  Engine). **Preparation only** — `commercialized` is always false; nothing is activated. Contracts
  `packages/shared/src/contracts/commercialization.ts`. Migrations `0085`/`0086`. Smoke `pnpm commercial:smoke`.
  Docs: `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0049-founderos-commercialization.md`.
- **Founder Operating Principle** (`packages/core/src/founder-principle/principle.ts`): the global doctrine —
  convert speed of thought into speed of execution; never let an idea die in notes. `route()` resolves every
  idea to exactly one of **8 dispositions** (task, asset, campaign, offer, agent, workflow, parked_idea,
  killed_idea) — always returns one. `nextActions()` guarantees every business its **5 next actions** (money,
  risk, follow-up, asset, conversion), filling blanks with defaults. `OPTIMIZATION_ORDER` is the system-wide
  priority **cash > conversion > follow_up > risk_control > execution_speed > founder_energy > reusable_ip**.
  Contracts `packages/shared/src/contracts/founder-principle.ts`. Migrations `0087`/`0088`. Smoke
  `pnpm principle:smoke`. Docs: `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0050-founder-principle.md`.
- Supabase migrations now through `0088` (the Plane registry adds **no migration** — static catalog);
  `packages/core` now has **47 engines + tenancy** (42 prior + **6 capabilities**: Agent Evaluation Lab,
  Control/Execution Plane registry, Cost & Token CFO, Business Simulation Engine, FounderOS Commercialization
  Layer, Founder Operating Principle); `tsc -b` clean. ADRs `0045`..`0050`.

## [1.15.0] — 2026-06-25 — Revenue Chain — Knowledge Vault, Revenue Factory, Conversion War Room, Deal Desk, Follow-Up Autopilot
### Added
- **Knowledge Vault** (`packages/core/src/knowledge-vault/vault.ts`): the front door over the earlier
  Knowledge Ingestion Engine + Knowledge-to-Action Converter. Accepts **13 input kinds** (adds
  voice_note, meeting_notes, random_idea), extracts **11 fields** (key ideas, frameworks, tactics,
  quotes, examples, business applications, monetization opportunities, related businesses, related agents,
  related assets, action items), **saves the source to the Asset Library by reference**, and **converts
  knowledge into action items** — it never just stores. Contracts
  `packages/shared/src/contracts/knowledge-vault.ts`. Migrations `0070`/`0071`. Smoke `pnpm vault:smoke`.
  Docs: `docs/REVENUE_CHAIN.md`, `docs/adr/ADR-0040-knowledge-vault.md`.
- **Revenue Factory** (`packages/core/src/revenue-factory/factory.ts`): a per-business money cockpit that
  computes the **fastest path to cash**, the **easiest offer**, the **offer most likely to convert**, the
  **best warm contact**, the **lowest-effort action**, and the **highest-value follow-up**, then names the
  single headline answer to **"what do we do today to make money?"**. Contracts
  `packages/shared/src/contracts/revenue-factory.ts`. Migrations `0072`/`0073` (append-only). Smoke
  `pnpm revfactory:smoke`. Docs: `docs/REVENUE_CHAIN.md`, `docs/adr/ADR-0041-revenue-factory.md`.
- **Conversion War Room** (`packages/core/src/war-room/engine.ts`): A/B testing across **9 surfaces**
  tracking the **full funnel**; the winner is decided on **revenue per send, then booked calls, then
  qualified leads** — never vanity opens/clicks — and only once each variant has the **minimum sends**;
  it logs objections. Contracts `packages/shared/src/contracts/war-room.ts`. Migrations `0074`/`0075`.
  Smoke `pnpm warroom:smoke`. Docs: `docs/REVENUE_CHAIN.md`, `docs/adr/ADR-0042-conversion-war-room.md`.
- **Deal Desk** (`packages/core/src/deal-desk/desk.ts`): one full-context record per opportunity (**14
  fields**), ranked by **probability, revenue, speed, strategic value, or effort**, always surfacing the
  **next money move**, the **blocked deals**, and the **deals likely to die** without action. Contracts
  `packages/shared/src/contracts/deal-desk.ts`. Migrations `0076`/`0077`. Smoke `pnpm dealdesk:smoke`.
  Docs: `docs/REVENUE_CHAIN.md`, `docs/adr/ADR-0043-deal-desk.md`.
- **Follow-Up Autopilot** — extension of the **Follow-Up Execution Engine**
  (`packages/core/src/follow-up/engine.ts` + `packages/shared/src/contracts/follow-up.ts` extended): adds
  **meeting_booked** and **deal_closed** success stops and an **escalation path** that escalates **only
  when human judgment is needed**, with a new `escalated` status and `escalation_reason`. Migration `0078`
  (ALTER `follow_ups`). Smoke `pnpm autopilot:smoke`. Docs: `docs/REVENUE_CHAIN.md`,
  `docs/adr/ADR-0044-follow-up-autopilot.md`.
- Supabase migrations now through `0078`; `packages/core` now has **42 engines + tenancy**; `tsc -b` clean.

## [1.14.0] — 2026-06-25 — Execution Safety Nets — Don't Drop the Ball, Business Asset Checklist, Money-First Operating Mode
### Added
- **Don't Drop the Ball System** (`packages/core/src/dont-drop-ball/engine.ts`): detects **9 dropped-item
  kinds** (forgotten leads, missed follow-ups, unfinished launches, abandoned ideas, stale campaigns, unpaid
  invoices, unsigned contracts, open loops, waiting-on responses) by flagging anything past a **per-kind
  staleness threshold**; `surfaceDaily()` lists open items **ranked by value then age** each with a
  recommended action; approving an item **assigns an agent to close the loop**; re-scanning **dedupes by
  signature**. Contracts `packages/shared/src/contracts/dont-drop-ball.ts`. Migrations `0064`/`0065`. Smoke
  `pnpm ball:smoke`. Docs: `docs/EXECUTION_SAFETY_NETS.md`,
  `docs/adr/ADR-0037-dont-drop-the-ball.md`.
- **Business Asset Checklist** (`packages/core/src/asset-checklist/engine.ts`): tracks the **25 key assets**
  per business, showing **present/missing** and a **completeness** fraction; **recommends the fastest,
  highest-leverage missing asset next** by walking a fixed priority order (offer first); advances the
  recommendation as assets are marked present; **shows missing assets across businesses**. Contracts
  `packages/shared/src/contracts/asset-checklist.ts`. Migrations `0066`/`0067`. Smoke `pnpm checklist:smoke`.
  Docs: `docs/EXECUTION_SAFETY_NETS.md`, `docs/adr/ADR-0038-business-asset-checklist.md`.
- **Money-First Operating Mode** (`packages/core/src/money-first/mode.ts`): an activatable mode that
  **prioritizes 9 money-aligned focuses** (cash collection, sales, follow-up, booked calls, proposals,
  invoices, high-conversion content, warm relationships, low-friction offers) and **deprioritizes 5**
  (perfection, branding polish, unnecessary features, low-conversion ideas, research without action);
  `classify()` labels each item and `prioritize()` **reorders work money-first while active**, passing it
  through unchanged when off. Contracts `packages/shared/src/contracts/money-first.ts`. Migrations
  `0068`/`0069`. Smoke `pnpm moneyfirst:smoke`. Docs: `docs/EXECUTION_SAFETY_NETS.md`,
  `docs/adr/ADR-0039-money-first-operating-mode.md`.
- Supabase migrations now through `0069`; `packages/core` now has **38 engines + tenancy**; `tsc -b` clean.

## [1.13.0] — 2026-06-25 — Revenue & Execution Layer — Conversion, Follow-Up, Revenue Command, Sales Assets, Execution Queue
### Added
- **Conversion Engine** (`packages/core/src/conversion/engine.ts`, `ConversionEngine`): tracks and improves
  **11 surfaces** (landing pages, offers, hooks, CTAs, emails, DMs, sales calls, decks, proposals,
  follow-ups, checkout flows); per business maintains a **baseline, active tests, winning/losing copy,
  objections, best offers, and next optimization**; **A/B winners are decided by REVENUE PER UNIT, not
  vanity conversion**. Contracts `packages/shared/src/contracts/conversion.ts`. Migrations `0054`/`0055`.
  Smoke `pnpm conversion:smoke`. Docs: `docs/REVENUE_EXECUTION_LAYER.md`,
  `docs/adr/ADR-0032-conversion-engine.md`.
- **Follow-Up Execution Engine** (`packages/core/src/follow-up/engine.ts`, `FollowUpExecutionEngine`):
  tracks **9 entity kinds** (leads, warm contacts, deals, vendors, investors, clients, partners,
  unanswered emails, stale opportunities) through sequences, reminders, an approval queue, no-response
  handling, escalation, and reactivation; **after approval it keeps going until response / goal /
  sequence complete / risk / pause**. Contracts `packages/shared/src/contracts/follow-up.ts`. Migrations
  `0056`/`0057`. Smoke `pnpm followup:smoke`. Docs: `docs/REVENUE_EXECUTION_LAYER.md`,
  `docs/adr/ADR-0033-follow-up-execution-engine.md`.
- **Revenue Command System** (`packages/core/src/revenue/command.ts`, `RevenueCommandSystem`): per
  business computes the **fastest path to cash, easiest offer to sell, best lead source, highest-ROI
  campaign, stuck deals, next money action, and weighted pipeline**. Contracts
  `packages/shared/src/contracts/revenue.ts`. Migrations `0058`/`0059`. Smoke `pnpm revenue:smoke`.
  Docs: `docs/REVENUE_EXECUTION_LAYER.md`, `docs/adr/ADR-0034-revenue-command-system.md`.
- **Sales Asset Generator** (`packages/core/src/sales-asset/generator.ts`, `SalesAssetGenerator`):
  generates **12 sales asset kinds** (one-pager, pitch deck, investor deck, sales deck, proposal, email
  sequence, DM script, call script, objection handling, FAQ, case study template, onboarding packet) per
  business, **saving each to the Asset Library**. Contracts `packages/shared/src/contracts/sales-asset.ts`.
  Migrations `0060`/`0061`. Smoke `pnpm salesasset:smoke`. Docs: `docs/REVENUE_EXECUTION_LAYER.md`,
  `docs/adr/ADR-0035-sales-asset-generator.md`.
- **Execution Queue** (`packages/core/src/execution-queue/queue.ts`, `ExecutionQueue`): **8 buckets**
  (ideas, tasks, approved actions, blocked actions, waiting on Alyssa, automated workflows, money actions,
  risk actions) with a fixed **priority order** (revenue > risk > deadlines > follow-up > operations >
  personal_admin > nice_to_have); `next()` returns the **highest-priority actionable item**, skipping
  blocked and waiting-on-Alyssa items. Contracts `packages/shared/src/contracts/execution-queue.ts`.
  Migrations `0062`/`0063`. Smoke `pnpm queue:smoke`. Docs: `docs/REVENUE_EXECUTION_LAYER.md`,
  `docs/adr/ADR-0036-execution-queue.md`.
- Supabase migrations now through `0063`; `packages/core` now has **35 engines + tenancy**; Python contract
  suite now **211 passing**; `tsc -b` clean.

## [1.12.0] — 2026-06-25 — Enterprise Playbook Generator, Strategic Portfolio Optimizer & Knowledge Engines
### Added
- **Enterprise Playbook Generator** (`packages/core/src/playbook/generator.ts`, `PlaybookGenerator`):
  per business/domain, generates a **full playbook** spanning **10 artifact kinds** (SOPs, workflows,
  scripts, checklists, onboarding docs, training docs, role scorecards, KPIs, escalation rules, and
  client-facing assets), **composing the Domain Operating Models' `DOMAIN_TEMPLATES`**; `generate()`
  builds one, `generateAll()` builds them all. Contracts `packages/shared/src/contracts/playbook.ts`.
  Migrations `0046`/`0047`. Smoke `pnpm playbook:smoke`. Docs: `docs/ENTERPRISE_PLAYBOOK_GENERATOR.md`,
  `docs/adr/ADR-0028-enterprise-playbook-generator.md`.
- **Strategic Portfolio Optimizer** (`packages/core/src/portfolio/optimizer.ts`, `PortfolioOptimizer`):
  analyzes **all businesses together** and scores each across **10 dimensions** (revenue potential, speed
  to cash, effort required, stress cost, strategic value, current traction, operational drag, capital
  required, team dependency, monetization path), ranks by **composite**, and recommends `focus_now` /
  `delegate` / `automate` / `pause` / `kill` / `package_for_sale`. Contracts
  `packages/shared/src/contracts/portfolio.ts`. Migrations `0048`/`0049`. Smoke `pnpm portfolio:smoke`.
  Docs: `docs/STRATEGIC_PORTFOLIO_OPTIMIZER.md`, `docs/adr/ADR-0029-strategic-portfolio-optimizer.md`.
- **Knowledge Ingestion Engine** (`packages/core/src/knowledge-ingestion/engine.ts`,
  `KnowledgeIngestionEngine`): processes **11 source types** (`book`, `pdf`, `youtube_transcript`,
  `podcast`, `course`, `article`, `screenshot`, `note`, `video`, `github_repo`, `competitor_page`)
  through a **10-step pipeline** (summarize, frameworks, tactics, business applications, which business,
  monetization use cases, SOPs, agent suggestions, Asset Library reference, link goals/campaigns/
  businesses). Contracts `packages/shared/src/contracts/knowledge-ingestion.ts`. Migrations `0050`/`0051`.
  Smoke `pnpm ingest:smoke`. Docs: `docs/KNOWLEDGE_ENGINES.md`,
  `docs/adr/ADR-0030-knowledge-ingestion-engine.md`.
- **Knowledge-to-Action Converter** (`packages/core/src/knowledge-to-action/converter.ts`,
  `KnowledgeToActionConverter`): turns **every useful idea into an action** with **10 fields** (action
  item, business use case, implementation plan, revenue hypothesis, required assets, required agents,
  test plan, owner, deadline, dashboard card) plus a **reusable operating manual (IP)**; disposition
  `use_now` / `save_for_later` / `ignore` / `convert_to_campaign`. Contracts
  `packages/shared/src/contracts/knowledge-to-action.ts`. Migrations `0052`/`0053`. Smoke `pnpm k2a:smoke`.
  Docs: `docs/KNOWLEDGE_ENGINES.md` (shared with the Knowledge Ingestion Engine),
  `docs/adr/ADR-0031-knowledge-to-action-converter.md`.
- Supabase migrations now through `0053`; `packages/core` now has **30 engines + tenancy**; Python contract
  suite now **190 passing**; `tsc -b` clean.

## [1.11.0] — 2026-06-25 — Agent Identity & Zero Trust, Source-of-Truth Management & Executive Control Tower
### Added
- **Agent Identity & Zero Trust** (`packages/core/src/agent-identity/registry.ts`,
  `AgentIdentityRegistry`): every agent gets a **unique, scoped, revocable identity** that starts
  **deny-by-default / read-only** — no money, no external messages, no production, no deletion, no tools.
  Capabilities, tools, data boundaries, and limits are opened **only via `grant()`**; `evaluate(request)`
  returns **allow / deny / needs_approval** per request under **zero trust**; `suspend()`/`revoke()` shut an
  identity down. **Complements the Security Gate** — the gate checks the action, identity checks **who**.
  Contracts `packages/shared/src/contracts/agent-identity.ts`. Migrations `0040`/`0041`. Smoke
  `pnpm identity:smoke`. Docs: `docs/AGENT_IDENTITY_ZERO_TRUST.md`,
  `docs/adr/ADR-0025-agent-identity-zero-trust.md`.
- **Source-of-Truth Management** (`packages/core/src/source-of-truth/registry.ts`,
  `SourceOfTruthRegistry`): distinguishes **9 knowledge kinds** (`verified_fact`, `assumption`, `outdated`,
  `user_preference`, `inferred_pattern`, `external_research`, `document`, `contact`, `financial_data`);
  every record carries **source, confidence, freshness, owner, `last_verified_at`, and `update_trigger`**,
  with **freshness** (`fresh`/`aging`/`stale`/`expired`) derived from a **per-kind verification TTL**.
  `record`/`verify`/`markOutdated`/`refreshAll`/`needsVerification`/`query` drive the lifecycle. Contracts
  `packages/shared/src/contracts/source-of-truth.ts`. Migrations `0042`/`0043`. Smoke `pnpm truth:smoke`.
  Docs: `docs/SOURCE_OF_TRUTH.md`, `docs/adr/ADR-0026-source-of-truth.md`.
- **Executive Control Tower** (`packages/core/src/control-tower/engine.ts`, `ControlTower`): the operator
  dashboard. `assemble(input)` builds **one read-only snapshot** with cash (computed **runway**), revenue
  pipeline, goals, active campaigns, blocked deals, risks, agent performance, approvals needed, **top-3
  priorities** (computed), business health, opportunities (ranked), workflows running, and the
  monthly/quarterly **review queue**. Snapshots are stored **immutably**. Contracts
  `packages/shared/src/contracts/control-tower.ts` (`Tower`-prefixed section types). Migrations
  `0044`/`0045`. Smoke `pnpm tower:smoke`. Docs: `docs/EXECUTIVE_CONTROL_TOWER.md`,
  `docs/adr/ADR-0027-executive-control-tower.md`.
- Supabase migrations now through `0045`; `packages/core` now has **26 engines + tenancy**; Python contract
  suite now **172 passing**; `tsc -b` clean.

## [1.10.0] — 2026-06-25 — AI Center of Excellence, Workflow ROI Tracking & Domain Operating Models
### Added
- **AI Center of Excellence** (`packages/core/src/ai-coe/`: `engine.ts`, `standards.ts`): the
  `AiCenterOfExcellence` is the **internal standards layer** — a library of approved standards across
  **11 kinds** (`prompt`, `agent_template`, `workflow_template`, `security_standard`, `data_standard`,
  `naming_convention`, `testing_standard`, `documentation_standard`, `escalation_rule`,
  `model_usage_rule`, `cost_control`) plus a compliance checker `checkCompliance(target)` that validates
  **every new agent/workflow/connector** (naming/testing/docs/model-usage/cost/security rules) and passes
  only with **no error-severity violations**. Contracts `packages/shared/src/contracts/ai-coe.ts`.
  Migrations `0034`/`0035`. Smoke `pnpm coe:smoke`. Docs: `docs/AI_CENTER_OF_EXCELLENCE.md`,
  `docs/adr/ADR-0022-ai-center-of-excellence.md`.
- **Workflow ROI Tracking** (`packages/core/src/workflow-roi/engine.ts`, `WorkflowRoiTracker`): tracks
  per-automation metrics — time saved, revenue, cost reduced, errors reduced, risk reduced, conversion
  improvement, operating cost, model/tool cost, and human time — computes **value vs cost and ROI**, ranks
  workflows, and recommends **scale/pause/improve/delete**. Contracts
  `packages/shared/src/contracts/workflow-roi.ts`. Migrations `0036`/`0037`. Smoke `pnpm roi:smoke`. Docs:
  `docs/WORKFLOW_ROI_TRACKING.md`, `docs/adr/ADR-0023-workflow-roi-tracking.md`.
- **Domain Operating Models** (`packages/core/src/domain-model/`: `factory.ts`, `templates.ts`): the
  `DomainOperatingModelFactory` stands up a full operating model for **each of 11 domains** (`sales`,
  `marketing`, `finance`, `operations`, `legal_risk`, `customer_success`, `product`, `recruiting`,
  `personal_admin`, `health`, `asset_management`), each carrying goals/workflows/agents/KPIs/assets/
  approvals/dashboards/escalation rules **deep-cloned from canonical templates**; `create()` builds one,
  `createAll()` builds them all. Contracts `packages/shared/src/contracts/domain-model.ts`. Migrations
  `0038`/`0039`. Smoke `pnpm domain:smoke`. Docs: `docs/DOMAIN_OPERATING_MODELS.md`,
  `docs/adr/ADR-0024-domain-operating-models.md`.
- Supabase migrations now through `0039`; `packages/core` now has **23 engines + tenancy**; Python contract
  suite now **157 passing**; `tsc -b` clean.

## [1.9.0] — 2026-06-25 — Pattern Engine v2, Agent Observability & Simulation Engine
### Added
- **Pattern Engine v2** (extends the existing Pattern Engine): `BehaviorSignal` gains
  `focus`/`health`/`calendar`/`productivity` (now **14 signals**), and `PatternReport` gains
  `strengths[]`, `repeating_mistakes[]`, `successful_habits[]`, and `schedule_recommendations[]`. A new
  analyzers file (`packages/core/src/pattern-engine/insights.ts`:
  `detectStrengths`/`detectRepeatingMistakes`/`detectSuccessfulHabits`/`scheduleRecommendations`) is wired
  into the engine, with new contract schemas `Strength`/`RepeatingMistake`/`SuccessfulHabit`/`ScheduleRec`.
  Still **advisory-only + always-explain**. Migrations `0028`/`0029` (`pattern_observations` +
  `pattern_reports`, append-only). Smoke `pnpm patternv2:smoke`. No new ADR — this extends
  [ADR-0009](./adr/ADR-0009-pattern-engine.md); see `docs/PATTERN_ENGINE.md`.
- **Agent Observability** (`packages/core/src/agent-observability/observer.ts`, `AgentObservability`):
  records **every agent action append-only with full provenance** — agent name, task, input, tools used,
  memory used, decision, rationale, approval status, cost, runtime, outcome, errors, downstream effects,
  value, and risk. `explain()` answers the four questions (what did it do / why / what data / what
  changed); `dashboard()` computes performance, failed actions, cost by agent, ROI by agent, risky
  actions, approval bottlenecks, and repeated failures. Contracts
  `packages/shared/src/contracts/agent-observability.ts`. Migrations `0030`/`0031` (`agent_actions`
  append-only). Smoke `pnpm observability:smoke`. Docs: `docs/AGENT_OBSERVABILITY.md`,
  `docs/adr/ADR-0020-agent-observability.md`.
- **Simulation Engine** (`packages/core/src/simulation/`: `engine.ts`, `models.ts`): `simulate()` models
  **eight kinds** (`campaign_outcome`, `revenue_path`, `hiring_vs_automation`, `pricing_change`,
  `priority_shift`, `cash_flow`, `implementation_risk`, `agent_failure`) and returns **best/likely/worst**
  `ScenarioCase` (assumptions + projection + narrative + probability), plus risks, a recommendation,
  `decision_needed`, and an `expected_value`. Deterministic. Contracts
  `packages/shared/src/contracts/simulation.ts`. Migrations `0032`/`0033`. Smoke `pnpm simulation:smoke`.
  Docs: `docs/SIMULATION_ENGINE.md`, `docs/adr/ADR-0021-simulation-engine.md`.
- Supabase migrations now through `0033`; `packages/core` now has **20 engines + tenancy**; Python contract
  suite now **142 passing**; `tsc -b` clean.

## [1.8.0] — 2026-06-25 — Opportunity Intelligence
### Added
- **Opportunity contracts** (`packages/shared/src/contracts/opportunity.ts`): `EntityKind`
  (10: `contact`, `business`, `vendor`, `investor`, `client`, `idea`, `github_repo`, `asset`,
  `conversation`, `market_trend`), `RelationshipKind` (7: `fit`, `introduction`, `solves`, `investment`,
  `partnership`, `synergy`, `trend_tailwind`), `OpportunityStatus` (`new`/`surfaced`/`accepted`/
  `dismissed`/`acted`), `EntityRef`, `OpportunityScore` (`revenue`, `probability`, `effort`, `risk`,
  `strategic_value`, `composite`), `Opportunity`, `AnalyzeInput`, `ScoreWeights`. (The TS
  `Opportunity`/`OpportunitySchema` are exported from the shared barrel **aliased** as
  `OpportunityIntel`/`OpportunityIntelSchema` — and mirrored in Pydantic as `OpportunityIntel` — to avoid
  colliding with the Goal Engine's existing `Opportunity` sub-type.) Pydantic mirror + fixtures; python
  suite now 127 passing.
- **Opportunity Intelligence** (`packages/core/src/opportunity/`): `OpportunityEngine` (`engine.ts`)
  continuously analyzes the **ten entity sources** and surfaces ranked opportunities; `matchers.ts` detects
  the relationships between them; `scoring.ts` does the **5-dimension scoring + composite**. It finds
  relationships across sources — e.g. "this developer also fits Divini Procure" (`fit`), "this GitHub repo
  solves Move Mi" (`solves`), "this investor should meet this project" (`investment`), "this vendor should
  be introduced to this developer" (`introduction`), plus `synergy` (asset↔business), `trend_tailwind`
  (market trend↔business), and `partnership` (business↔business). **Composes the GitHub Intelligence
  verdicts, assets, businesses, and contacts**; deterministic (no AI).
- **5-dimension scoring + composite ranking**: every opportunity is scored on **revenue, probability,
  effort, risk, and strategic_value** plus a **weighted composite** (effort & risk inverted — lower is
  better); the five sub-scores are stored so opportunities can be re-sorted by any dimension.
- **Automatic surfacing & dedupe**: `surface(threshold)` promotes `new`→`surfaced` above the composite
  threshold; `accept`/`dismiss`/`markActed`/`top(n)` drive the lifecycle. Re-analysis **upserts by
  signature** (`kind|source|target`) — no duplicates, and existing decisions are preserved.
- **Persistent schema** (`infra/supabase/migrations/0026_opportunities.sql`,
  `0027_opportunities_rls.sql`): `opportunities` (source/target/scores/evidence/recommended_agents jsonb;
  `kind`; `status`; `set_updated_at` trigger); deny-by-default RLS.
- Docs: `docs/OPPORTUNITY_INTELLIGENCE.md`, `docs/adr/ADR-0019-opportunity-intelligence.md`;
  `scripts/opportunity-intelligence-smoke.mts` (`pnpm opportunity:smoke`) runs 7 checks, all passing.
  `tsc -b` clean.

## [1.7.0] — 2026-06-25 — Campaign Intelligence
### Added
- **Campaign contracts** (`packages/shared/src/contracts/campaign.ts`): `CampaignType`
  (6: `email`, `social`, `landing_page`, `funnel`, `outreach`, `lead_nurturing`), `CampaignStatus`
  (`draft`/`active`/`paused`/`completed`/`stopped`), `StopReason` (`goal_reached`/`performance_drop`/
  `risk_increase`/`approval_expired`/`paused`/`manual`), `VariantKey` (`A`/`B`), `Variant`,
  `CampaignSuccessMetric`, `VariantResult`, `CampaignRecommendation`, `CampaignReport`, `StopConditions`,
  `Campaign`, `CreateCampaignInput`, `CampaignMetricsInput`, `AssessSignals`. (The success-metric and
  recommendation types are **`Campaign`-prefixed** to avoid colliding with the Agent Factory's
  `SuccessMetric` and the Idea Builder's `Recommendation`.) Pydantic mirror + fixtures; python suite now
  119 passing.
- **Campaign Intelligence** (`packages/core/src/campaign/`): `CampaignEngine` (`engine.ts`) runs every
  campaign across the six types; `templates.ts` provides the per-type **A/B** variant pair and default
  success metric; `report.ts` produces the winner/lift/recommendations. Every campaign ships an **A/B
  variant pair + success metrics + stop conditions**. **Automatic reporting** picks the winner by
  conversion rate (with a **min-conversions guard**), computes lift, writes a summary, and emits
  improvement **recommendations**. **Composes the Goal Engine + Persistent Approval**; deterministic
  (no AI).
- **Autopilot lifecycle**: after approval a campaign runs on **AUTOPILOT** and continues until one of
  **five stop conditions** fires — goal reached (→ `completed`), approval expired, risk increase,
  performance drop, or Alyssa pauses — recorded in `stop_reason`. **Monthly optimization** shifts traffic
  to the winner (**70/30**) and bumps the version.
- **Persistent schema** (`infra/supabase/migrations/0024_campaigns.sql`, `0025_..._rls.sql`): `campaigns`
  (variants/success_metrics/stop_conditions/latest_report jsonb; `status`; `stop_reason`; `version`;
  `set_updated_at` trigger); deny-by-default RLS.
- Docs: `docs/CAMPAIGN_INTELLIGENCE.md`, `docs/adr/ADR-0018-campaign-intelligence.md`;
  `scripts/campaign-intelligence-smoke.mts` (`pnpm campaign:smoke`) runs 6 checks, all passing. `tsc -b`
  clean.

## [1.6.0] — 2026-06-25 — Persistent Approval
### Added
- **Persistent Approval contracts** (`packages/shared/src/contracts/persistent-approval.ts`): `GrantType`
  (7: `remember_this`, `always`, `business`, `until_goal`, `duration`, `review_monthly`,
  `review_quarterly`), `ReviewSchedule` (`none`/`monthly`/`quarterly`/`on_expiry`),
  `ApprovalLifecycleStatus` (`active`/`in_review`/`expired`/`revoked`), `ApprovalScope` (`action_class`,
  `action_pattern`, `business_id`, `goal_id`, `environments`), `ApprovalLimits` (`max_uses`, `used_count`,
  `max_amount_usd`), `PersistentApproval`, `CreatePersistentApprovalInput`. Pydantic mirror + fixtures;
  python suite now 110 passing.
- **Persistent Approval** (`packages/core/src/persistent-approval/`): `PersistentApprovalRegistry`
  (`registry.ts`) — `grant`, `authorize`/match, `expireDue`, `expireForGoal`, `renew`, `revoke`, `list`;
  `scope.ts` provides `covers`/`isLive`/`matchesScope`/`withinLimits`. The purpose is to **approve a
  workflow ONCE**: every grant stores its scope, expiration, limits, success metrics, and review
  schedule.
- **Additive Security Gate integration**: the Security Gate (Enterprise Security) gained an **optional**
  `persistentApprovals` registry. When the policy would queue a fresh approval, the gate first authorizes
  against standing grants — a **covering** grant (live + in-scope + within-limits) **pre-approves the
  action (allow)**, records one use, references the grant in the audit entry, and does **not** queue.
  Fully additive: with no registry the gate is unchanged. Grants **auto-expire into review**
  (`expireDue` → `in_review`); allow-until-goal ends on goal completion. Bounded by
  scope/amount/use-count/environment/expiry/review cadence; **production excluded by default**.
- **Persistent schema** (`infra/supabase/migrations/0022_persistent_approvals.sql`,
  `0023_..._rls.sql`): `persistent_approvals` (scope/limits jsonb; `status`; `expires_at`/`next_review_at`;
  `set_updated_at` trigger); deny-by-default RLS.
- Docs: `docs/PERSISTENT_APPROVAL.md`, `docs/adr/ADR-0017-persistent-approval.md`;
  `scripts/persistent-approval-smoke.mts` (`pnpm run approval:smoke`) runs 9 checks, all passing. The
  Enterprise Security smoke (`security:smoke`) still passes unchanged (integration is additive). `tsc -b`
  clean.

## [1.5.0] — 2026-06-25 — Goal Engine
### Added
- **Goal contracts** (`packages/shared/src/contracts/goal.ts`): `GoalType` (9: `personal`, `financial`,
  `business`, `health`, `learning`, `relationships`, `launches`, `sales`, `cash_flow`), `GoalStatus`
  (`draft`/`active`/`paused`/`cancelled`/`completed`/`review_required`), `PathKind`
  (`fastest`/`lowest_resistance`/`highest_roi`), `GoalPath`, `Constraint`, `Resource`, `Opportunity`,
  `RiskItem`, `WeeklyPlanItem`, `GoalAnalysis`, `GoalPlan`, `Goal`, `CreateGoalInput`, `GoalChange`.
  Pydantic mirror + fixtures; python suite now 101 passing.
- **Goal Engine** (`packages/core/src/goal/`): `GoalEngine` (`engine.ts`) turns any goal into action.
  `analyze.ts` performs situation analysis — current state, desired state, gap, constraints, resources,
  best opportunities, and **three paths** (fastest / lowest-resistance / highest-ROI) with a recommended
  path. `plan.ts` generates a weekly plan, daily priorities, recommended agents, recommended automations,
  expected completion, and a risk analysis. **Composes the Decision Engine** for priority/agents/
  automations; deterministic (no AI).
- **Lifecycle**: goals stay `draft` until approved; once approved they are **pursued (`active`) until
  completed/paused/cancelled/review_required — never stopping on their own**. Goal changes
  auto-recalculate (re-analyze, re-plan, version bump, `last_recalculated_at`); recording progress that
  reaches the target auto-completes, below-target recalculates, and `review_required` resumes to `active`
  on recalculation. `completed`/`cancelled` are terminal. Tenant-scoped throughout.
- **Persistent schema** (`infra/supabase/migrations/0020_goals.sql`, `0021_..._rls.sql`): `goals`
  (analysis/plan jsonb; `version`; `type`/`status`/`priority` CHECKs; `set_updated_at` trigger);
  deny-by-default RLS.
- Docs: `docs/GOAL_ENGINE.md`, `docs/adr/ADR-0016-goal-engine.md`; `scripts/goal-engine-smoke.mts`
  (`pnpm run goal:smoke`) runs 7 checks (analysis + three paths, plan generation, lifecycle pursuit,
  change auto-recalculation, progress auto-completion, terminal states, tenant isolation), all passing.
  `tsc -b` clean.

## [1.4.0] — 2026-06-24 — Enterprise Security
### Added
- **Enterprise Security contracts** (`packages/shared/src/contracts/security.ts`): `SensitiveActionClass`
  (6: `spend_money`, `delete_data`, `modify_production`, `contact_external`, `sign_contract`,
  `install_package`), `ActionRequest`, `SecurityDecision`, `AuditEntry`, `ApprovalRequest`,
  `PermissionGroup`, `SecretRef` (with `value_stored` a literal `false`), `Session`. Pydantic mirror +
  fixtures; python suite now 93 passing.
- **Enterprise Security** (`packages/core/src/security/`): `SecurityGate` is the single chokepoint every
  action passes through — `policy.ts` applies deterministic rules, `audit.ts` writes an append-only
  `AuditLog` entry for **every** action, `approvals.ts` is a role-gated `ApprovalQueue`, `vault.ts` is a
  `SecretVault` that stores **references only** (value never stored) with credential rotation,
  `sessions.ts` is the `SessionManager`, and `groups.ts` is the `PermissionGroupRegistry`. Guarantees
  least privilege everywhere (new agents default read-only), and the **six sensitive classes ALWAYS
  require explicit approval — even the owner** (money/production/deletion/contract safeguards). Reuses
  the tenancy `PermissionChecker` via injected resolvers; tenant isolation throughout.
- **Persistent schema** (`infra/supabase/migrations/0018_enterprise_security.sql`,
  `0019_..._rls.sql`): `security_audit` (append-only — INSERT+SELECT only), `approval_requests`,
  `permission_groups`, `secrets` (with a `value_stored = false` CHECK as a hard guarantee), `sessions`;
  deny-by-default RLS.
- Docs: `docs/ENTERPRISE_SECURITY.md`, `docs/adr/ADR-0015-enterprise-security.md`;
  `scripts/security-smoke.mts` (`pnpm run security:smoke`) runs 10 checks (gate chokepoint, the six
  always-approve classes, read-only defaults, audit-everything, vault references-only, role-gated
  approvals, sessions, permission groups, tenant isolation), all passing. `tsc -b` clean.

### Notes
- The vault stores a credential *reference* and rotation metadata, never the secret value
  (DB `value_stored = false` CHECK + append-only `security_audit`).

## [1.3.0] — 2026-06-24 — Global Asset Library
### Added
- **Global Asset contracts** (`packages/shared/src/contracts/assets.ts`): `Asset` (24 asset types) with
  owner, business, version, relationships, tags, status, approval, location, usage history, keywords,
  sensitive, visibility; plus `CreateAssetInput`, `AssetQuery`, `AssetSearchHit`. Pydantic mirror +
  fixtures; contract suite now 82 tests, green.
- **Global Asset Library** (`packages/core/src/assets/`): `GlobalAssetLibrary` — add / get / update /
  recordUsage / link / approve, and **permission-aware GLOBAL search** that ranks across all of a
  tenant's businesses then filters to what the principal may see (private → owner/elevated; sensitive
  → elevated; else any grant-holder), reusing the tenancy roles via an injected resolver.
- **Persistent schema** (`infra/supabase/migrations/0016_global_assets.sql`, `0017_..._rls.sql`):
  `assets` (tenant-scoped, RLS, generated `search_tsv`, jsonb tags/relationships/usage_history).
- Docs: `docs/GLOBAL_ASSET_LIBRARY.md`, `docs/adr/ADR-0014-global-asset-library.md`;
  `scripts/global-assets-smoke.mts` (`pnpm run assets:smoke`) verifies global search + permission
  gating + relationships/version/usage/approval + tenant isolation. `tsc -b` clean.

### Notes
- Assets store a `location` reference (URL/path/connector/secret ref), never the payload or secret.

## [1.2.0] — 2026-06-24 — GitHub Intelligence System
### Added
- **GitHub Intelligence contracts** (`packages/shared/src/contracts/github-intelligence.ts`):
  `RepoScanInput`, `DimensionEval`, `SecurityFinding`, `BusinessCase`, `RepoAssessment` (with
  `executed: literal false`), `AssetLibraryEntry`, and verdict/severity/category enums. Pydantic mirror
  + fixtures; contract suite now 77 tests, green (incl. a test that `executed=true` is rejected).
- **GitHub Intelligence** (`packages/core/src/github-intelligence/`): `GitHubIntelligence.scan()`
  statically analyzes a repo (NO execution — no shell/eval/network/install), evaluates ten dimensions,
  runs an eight-class security review, and returns SAFE / NEEDS REVIEW / DO NOT USE. SAFE repos get a
  business case (applications, benefiting businesses, roadmap, agents, effort, ROI). `approve()` stores
  in the tenant-scoped `AssetLibrary` and refuses anything not SAFE (`RepoApprovalError`).
- **Persistent schema** (`infra/supabase/migrations/0014_github_intelligence.sql`, `0015_..._rls.sql`):
  `repo_assessments` (with an `executed = false` CHECK as a hard guarantee) + `asset_library`,
  tenant-scoped, RLS.
- Docs: `docs/GITHUB_INTELLIGENCE.md`, `docs/adr/ADR-0013-github-intelligence.md`;
  `scripts/github-intelligence-smoke.mts` (`pnpm run gh:smoke`) scans a clean + a malicious repo and
  verifies verdicts, findings, never-execute, and the approval gate. `tsc -b` clean.

## [1.1.0] — 2026-06-24 — Model Router & Connector Registry
### Added
- **Model Router** (`packages/shared/src/contracts/model-router.ts`, `packages/core/src/model-router/`):
  provider-agnostic model selection. `ModelDescriptor` registry (data, not an enum) + `ModelRouter.route()`
  scores models per task type (coding/reasoning/writing/debugging/planning/research/architecture/
  summarization) and returns a choice + a **cross-provider fallback chain** (never depend on one
  provider). Default catalog seeds Claude Code, GPT-5.5, GPT Codex, OpenClaw, a local model; `register()`
  adds future models with no code change. The router decides; the AI Gateway executes.
- **Connector Registry** (`packages/shared/src/contracts/connector-registry.ts`,
  `packages/core/src/connector-registry/`): modular, NOT hard-coded. `ConnectorDescriptor` (free-text
  `kind`/`category`) carries permissions, authentication, risk level, allowed actions, businesses using
  it, health status, and last sync. Blueprints (GitHub, Gmail, Calendar, Drive, Slack, Discord, Stripe,
  Supabase, Notion, CRM, generic `mcp`) `install()` per tenant; any future connector `register()`s
  directly. Tenant-scoped (`connectors` table, migrations `0012`/`0013`, RLS).
- Pydantic mirrors + fixtures; contract suite now 70 tests, green. Docs: `docs/MODEL_ROUTER.md`,
  `docs/CONNECTOR_REGISTRY.md`, `docs/adr/ADR-0012-router-and-connectors.md`;
  `scripts/router-connector-smoke.mts` (`pnpm run router:smoke`) verifies routing + modular connectors.
  `tsc -b` clean.

## [1.0.0] — 2026-06-24 — Executive Inbox (the single entry point)
### Added
- **Executive Inbox contracts** (`packages/shared/src/contracts/executive-inbox.ts`): `InboxItemType`
  (18), `InboxCategory` (14), `LinkedEntity`, `SuggestedTask`, `InboxDrop`, `ProcessedInboxItem`.
  Pydantic mirror + fixtures; contract suite now 64 tests, green.
- **Executive Inbox** (`packages/core/src/executive-inbox/`): item-type detection + category
  classification, and `ExecutiveInbox.process()` which composes the Decision Engine (urgency, agents,
  approvals), the Memory Engine (link via `peek`, save via `remember`), business matching, and the
  approval gate. Returns a `ProcessedInboxItem` with all ten outcomes (identify, classify, business,
  link, tasks, missing info, agents, save, approval-only-when-needed, dashboard update) and every
  required per-item field.
- **Persistent schema** (`infra/supabase/migrations/0010_executive_inbox.sql`, `0011_..._rls.sql`):
  `inbox_items` (tenant-scoped, RLS, full-text + jsonb payload).
- Docs: `docs/EXECUTIVE_INBOX.md`, `docs/adr/ADR-0011-executive-inbox.md`; `scripts/executive-inbox-smoke.mts`
  (`pnpm run inbox:smoke`) drops 5 different item kinds and verifies routing end to end. `tsc -b` clean.

### Notes
- The single front door — Alyssa never decides where something belongs. Deterministic; real media
  parsing is supplied as `content` until extraction is wired in Phase 2.

## [1.0.0-rc] — 2026-06-24 — Founder Intelligence System (multi-tenant)
### Added (additive only — no engine code changed)
- **Tenancy contracts** (`packages/shared/src/contracts/tenancy.ts`): `FounderTenant`, `PlanTier`,
  `BillingAccount`, `Role`, `Permission`, `Grant`, `KnowledgeDoc`. Pydantic mirror + fixtures;
  contract suite now 59 tests, green.
- **Permission checker** (`packages/core/src/tenancy/permissions.ts`): role→permission map +
  `PermissionChecker` — tenant-scoped (a grant in one tenant confers nothing in another). The only new
  behavioral code the productization needed.
- **Persistent schema** (`infra/supabase/migrations/0008_founder_intelligence.sql`, `0009_..._rls.sql`):
  `tenants` gains `plan`/`slug`; new `billing_accounts`, `grants`, `knowledge_docs` with `tenant_id` +
  RLS deny-by-default.
- Docs: `docs/FOUNDER_INTELLIGENCE_SYSTEM.md`, `docs/adr/ADR-0010-founder-intelligence-system.md`;
  `scripts/tenancy-isolation-smoke.mts` (`pnpm run tenancy:smoke`) PROVES two tenants run through the
  unchanged engines with zero crossover. `tsc -b` clean; all nine engine smokes still pass unchanged.

### Notes
- Five of the eight separations (memory, businesses, agents, dashboards, automation) were already
  tenant-scoped; billing, permissions, and knowledge were made first-class. The refactor was additive
  because the platform was tenant-first from ADR-0001.

## [0.9.0] — 2026-06-24 — Pattern Engine
### Added
- **Pattern Engine contracts** (`packages/shared/src/contracts/pattern-engine.ts`): `BehaviorSignal`,
  `BehaviorObservation`, `Pattern`, `Bottleneck`, `AutomationRec`, `PatternAgentRec`, `WorkflowRec`,
  `AnalysisWindow`, `PatternReport`. Pydantic mirror + fixtures; contract suite now 52 tests, green.
- **Pattern Engine** (`packages/core/src/pattern-engine/`): deterministic analyzers (time-of-day
  performance/energy/stress, habit bad-outcome ratios, avoidance counts) → `PatternEngine.analyze()`
  produces patterns, bottlenecks, and recommendations across three lanes (automations, new agents,
  workflow improvements). Recommended agents feed the Agent Factory.
- Two invariants enforced by construction: **advisory only** (no write/dispatch ports;
  `advisory_only: true`; never modifies behavior) and **always explain** (every pattern/bottleneck/rec
  carries a required, non-empty explanation populated from evidence).
- Docs: `docs/PATTERN_ENGINE.md`, `docs/adr/ADR-0009-pattern-engine.md`; `scripts/pattern-engine-smoke.mts`
  (`pnpm run pattern:smoke`) verifies detection + both invariants. `tsc -b` clean.

## [0.8.0] — 2026-06-24 — Idea Builder
### Added
- **Idea Builder contracts** (`packages/shared/src/contracts/idea-builder.ts`): `IdeaInput` and
  `IdeaBlueprint` with all fifteen section schemas (market_research … recommendation) + sub-types and
  enums. Pydantic mirror + fixtures; contract suite now 47 tests, green.
- **Idea Builder** (`packages/core/src/idea-builder/`): trigger `IDEA_BUILDER_TRIGGER = "I have an
  idea."`; `IdeaBuilder.build()` classifies the idea (Decision Engine), generates all fifteen sections
  deterministically, captures it (Memory Engine, kind `idea`), and STOPS at the approval gate
  (`status: awaiting_approval`, `approved: false`). `handoff()` throws `IdeaApprovalError` unless
  approved — and only returns the build *plan*, never builds.
- Docs: `docs/IDEA_BUILDER.md`, `docs/adr/ADR-0008-idea-builder.md`; `scripts/idea-builder-smoke.mts`
  (`pnpm run idea:smoke`) verifies all 15 sections + the never-build-until-approved gate. `tsc -b` clean.

### Notes
- Deterministic and honest: research sections are framed as hypotheses + open questions, not fetched
  facts. An AI/research agent can deepen them later behind the gated AI Gateway.

## [0.7.0] — 2026-06-24 — Personal OS (life layer)
### Added
- **Personal OS contracts** (`packages/shared/src/contracts/personal-os.ts`): `PersonalModuleKind`
  (12 modules), `PersonalEntitySpec`, `FieldRequest`, `InfoRequest`, `KnownEntity`, `ResolveResult`,
  `RememberPersonalInput`, `PreparePack`. Pydantic mirror + fixtures; contract suite now 42 tests, green.
- **Personal OS** (`packages/core/src/personal-os/`): a 12-module catalog and `PersonalOS` over the
  Memory Engine — `resolve()` (reuse / ask-once / partial), `remember()` (upsert, forever),
  `prepare()` (auto-prepare everything). Reads are non-mutating (`peek`); `remember` never duplicates.
- **MemoryKind extended**: added `pet`, `trip`, `goal` (additive) + migration
  `0007_memory_kinds_personal.sql` updating the `memories.kind` CHECK.
- Docs: `docs/PERSONAL_OS.md`, `docs/adr/ADR-0007-personal-os.md`; `scripts/personal-os-smoke.mts`
  (`pnpm run personal:smoke`) verifies the Mercedes-dealership flow (ask once → remember → reuse →
  auto-prepare), no-duplicate upsert, and read-only guarantee. `tsc -b` clean.

### Notes
- No new datastore — "remember forever" is the Memory Engine. Most entities map to existing memory
  kinds; pets/travel/goals use the three new ones.

## [0.6.0] — 2026-06-24 — Business Template
### Added
- **Business contracts** (`packages/shared/src/contracts/business.ts`): `DepartmentKind` (12),
  `DepartmentSpec`, `BusinessTemplate`, `BusinessDepartment`, `Business`, `CreateBusinessInput`
  (reusing `MemoryScope`/`SuccessMetric`/`DashboardCard`). Pydantic mirror + fixtures; contract suite
  now 34 tests, all green.
- **Business Template + Factory** (`packages/core/src/business/`): one canonical `BUSINESS_TEMPLATE`
  (v1.0.0) defining all twelve departments (CEO, Operations, Sales, Marketing, Finance, Legal,
  Customer Success, Projects, Product, Analytics, Deployment, Automation); `BusinessFactory.create()`
  instantiates a business with all twelve, deep-cloning specs and assigning a unique `business_id` +
  `data_namespace`. Same framework inherited, data isolated.
- **Persistent schema** (`infra/supabase/migrations/0005_business.sql`, `0006_business_rls.sql`):
  `businesses` + `business_departments` with `tenant_id` + `business_id` + RLS deny-by-default.
- Docs: `docs/BUSINESS_TEMPLATE.md`, `docs/adr/ADR-0006-business-template.md`; `scripts/business-smoke.mts`
  (`pnpm run business:smoke`) verifies same-framework + isolated-data across two businesses. `tsc -b` clean.

### Notes
- A business is a unit within a tenant; isolation = tenant RLS + `business_id`. Department capability
  logic is declared, not yet implemented.

## [0.5.0] — 2026-06-24 — Agent Factory (self-extension)
### Added
- **Agent Factory contracts** (`packages/shared/src/contracts/agent-factory.ts`): `ToolSpec`,
  `MemoryScope`, `AgentPermissions`, `SuccessMetric`, `DashboardCard`, `TaskQueueSpec`,
  `GeneratedFile`, `AgentRecommendation`, `AgentBlueprint`, `GeneratedAgent`. Pydantic mirror +
  fixtures; contract suite now 28 tests, all green.
- **Agent Factory** (`packages/core/src/agent-factory/`): `recommend()` detects recurring
  responsibilities from Decision Engine output; `draftBlueprint()` produces an un-approved spec;
  `generate()` (approval-gated — throws `AgentApprovalError` otherwise) materializes the full agent
  (folder, config, instructions, memory scope, permissions, tools, success metrics, dashboard card,
  task queue, tests, docs) and registers it so the orchestrator can dispatch immediately.
- Side effects only via ports: `FileWriter` (disk) and `AgentRegistrar` (Agent Registry). Core writes
  nothing itself.
- Docs: `docs/AGENT_FACTORY.md`, `docs/adr/ADR-0005-agent-factory.md`; `scripts/agent-factory-smoke.mts`
  (`pnpm run factory:smoke`) verifies the full lifecycle end-to-end incl. orchestrator dispatch to the
  generated agent. `tsc -b` clean.

### Notes
- Generation writes to wherever the provided `FileWriter` points (the smoke uses a temp dir, never the
  repo). Generated workers are correct-by-shape stubs; capability logic is filled in afterward.

## [0.4.0] — 2026-06-24 — Chief of Staff (executive layer)
### Added
- **Chief of Staff contracts** (`packages/shared/src/contracts/chief-of-staff.ts`): `BriefingItem`,
  `MeetingPrep`, `CalendarBlock`, `EnergyPlan`, `DashboardSummary`, `ChiefOfStaffBriefing`. Pydantic
  mirror + fixture; contract suite now 22 tests, all green.
- **Chief of Staff** (`packages/core/src/chief-of-staff/`): `ChiefOfStaff.brief()` synthesizes all
  eleven sections (daily priorities, revenue focus, calendar prep, meeting prep, follow-ups, risk
  alerts, blocked projects, personal reminders, energy plan, decision queue, dashboard) from Decision
  Engine output + memory, and renders a markdown dashboard. **Coordinates only — never executes.**
- **`MemoryEngine.peek`**: non-mutating retrieval (same ranking as `recall`, no reinforcement) so the
  executive layer can read context without changing state.
- Docs: `docs/CHIEF_OF_STAFF.md`, `docs/adr/ADR-0004-chief-of-staff.md`; `scripts/chief-of-staff-smoke.mts`
  (`pnpm run cos:smoke`) verifies every section AND the never-executes invariant (memory unchanged after
  a brief). `tsc -b` clean.

### Notes
- No external services. Holds no Dispatcher / AI Gateway / memory-write access by construction.
  Routing fields point at the Agent Registry and Approval Gate; nothing is dispatched.

## [0.3.0] — 2026-06-24 — Decision Engine
### Added
- **Decision contracts** (`packages/shared/src/contracts/decision.ts`): `DecisionCategory` (9 kinds),
  `CategoryScore`, `EffortBucket`, `PriorityLevel`, `DecisionInput`, `Decision`. Pydantic mirror +
  fixtures; contract suite now 19 tests, all green.
- **Decision Engine** (`packages/core/src/decision/`): `DecisionEngine.decide/decideMany` over a
  swappable `DecisionClassifier` port (deterministic `RuleClassifier` ships; AI classifier can replace
  it behind the gated AI Gateway). Multi-label classification + scorers for urgency, importance,
  difficulty, effort, revenue impact, and risk; derives required approvals, recommended agents,
  recommended deadline, and automation opportunities; returns a structured, explainable `Decision`.
- Tunable signal lexicons (`lexicons.ts`); every score is auditable via `reasons`.
- Docs: `docs/DECISION_ENGINE.md`, `docs/adr/ADR-0003-decision-engine.md`; `scripts/decision-smoke.mts`
  (`pnpm run decision:smoke`) verifies classification/scoring/approvals/agents/deadlines/automations
  across diverse inputs. `tsc -b` clean.

### Notes
- No external services. Routing fields wire into existing subsystems (Agent Registry, Approval Gate)
  and a Decision can persist as a `decision`-kind memory. No new datastore.

## [0.2.0] — 2026-06-24 — Memory Engine
### Added
- **Memory contracts** (`packages/shared/src/contracts/memory.ts`): `MemoryKind` (19 kinds),
  `MemoryRelation`, `MemoryRecord`, `MemoryLink`, `CreateMemoryInput`, `MemoryQuery` — each memory
  carries importance, confidence, last_used, source, relationships, and keywords. Pydantic mirror +
  fixtures; contract suite now 14 tests, all green.
- **Memory Engine** (`packages/core/src/memory/`): `MemoryEngine` (remember, recall, reinforce,
  revise, supersede, link, neighbors/relatedMemories, prune, forget) over a `MemoryRepository` port,
  with deterministic retrieval + pruning scoring (`scoring.ts`) and an in-memory reference store.
  Recall reinforces usage; pruning archives by default and protects pinned/used memories.
- **Persistent schema** (`infra/supabase/migrations/0003_memory_engine.sql`, `0004_memory_rls.sql`):
  `memories` + `memory_links` with `tenant_id` + RLS, generated `search_tsv` full-text column,
  indexes, and a `memory_prune_candidates` view.
- Docs: `docs/MEMORY_ENGINE.md`, `docs/adr/ADR-0002-memory-engine.md`; `scripts/memory-smoke.mts`
  (`pnpm run memory:smoke`) verifies the full lifecycle end-to-end. `tsc -b` clean.

### Notes
- No external services connected. The engine runs on the in-memory repository today; the Supabase
  store drops in behind the same port in Phase 2.

## [0.1.0] — 2026-06-24 — Platform spine (Phase 1)
### Added
- **Contracts** (`packages/shared`): Zod schemas for `Task`, `SignalToAction`/`Action`/`Evidence`,
  `ModuleManifest`, `AgentRegistration`, plus canonical JSON fixtures.
- **Python mirror** (`workers/alfy_workers/contracts`): Pydantic v2 models in lockstep with Zod,
  proven by `workers/tests/test_contracts.py` (7 tests, validate shared fixtures + negative cases).
- **Config** (`packages/config`): layered loader, Zod schema, boot-fail on invalid/missing, secret redaction.
- **Core kernel** (`packages/core`): module/agent registries, append-only Event/Decision log ports,
  Approval Gate, Dispatcher (HTTP transport, queue-ready) + Signal→Action assembler, AI Gateway
  (flag→cache→budget→usage). In-memory reference implementations for tests.
- **Supabase migrations** (`infra/supabase`): platform tables with `tenant_id` + RLS deny-by-default;
  `events`/`audit_log` append-only; default-tenant seed.
- Toolchain: root `tsconfig.json` project graph, `typescript` + `@types/node`; `tsc -b` passes clean.

### Notes
- Still no business features. The orchestration loop is wired as interfaces/ports; the live
  end-to-end reference path (api + orchestrator + reference agent) is Phase 2.

## [0.0.0] — 2026-06-24 — Foundation (Phase 0)
### Added
- Architecture (`ARCHITECTURE.md`) and product requirements (`docs/PRD.md`).
- Technical specification (`docs/TECH_SPEC.md`) and build plan (`docs/BUILD_PLAN.md`).
- Cost-control plan (`docs/COST_CONTROL_PLAN.md`) and security baseline (`docs/SECURITY.md`).
- Standards: coding, naming, config system, folder hierarchy, startup sequence.
- ADR-0001 (stack & repo shape); glossary.
- Monorepo skeleton: `packages/`, `services/`, `workers/`, `modules/`, `infra/`, `scripts/`.
- Root manifests, base TS config, Python worker project, fully documented `.env.example`.

### Notes
- No business features implemented. This release is the foundation only.
