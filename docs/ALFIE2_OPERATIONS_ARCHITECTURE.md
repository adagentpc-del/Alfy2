# Alfie2 — Operations Architecture (Master Blueprint)

> Consolidation document. **No new features are built from here until this blueprint is approved.**
> Status date: 2026-06-26. Author: build session consolidation.
> Goal: turn the full vision into one clean, implementable system plan — without chaos, duplicated
> features, or missing core infrastructure.

---

## 1. Executive Summary

Alfie2 is an **AI organization operating system**: an accountable AI company that turns Alyssa's
ideas into executed, measurable, revenue-producing systems while she stays CEO. It is not a flat
swarm of agents and not a quote library — it is a structured org (CEO → Executive Layer → Department
Leaders → AI Employees → Specialist Agents) where **work flows down through delegation, results flow
up through reporting, and approval gates protect execution.**

**Where we actually are (verified):**

- **Domain layer is built and live.** 172 Zod contracts (`packages/shared`), **173 engine modules**
  (`packages/core`), 238 migrations → **237 Supabase tables, every one RLS-secured** (project
  `oxromxpjoiifvamxjluz`, deny-by-default tenant isolation, default operator tenant seeded). This
  now includes the final intelligence wave — **Knowledge Ops, Lifecycle + Growth, Market Intel,
  Oversight** — so the backlog that follows is runtime/UI work, not new domain features.
- **Runtime layer is the gap.** `services/api` and `services/orchestrator` are empty scaffolds.
  Only **2 of 173 engines** (Memory, Executive Inbox) have real database adapters (`@alfy2/db`); the
  rest compute in in-memory Maps. There is no auth, no request-time tenant context, no live
  connectors, and no UI yet.

**The one-line conclusion:** the brain is built; the nervous system (persistence + API + auth +
approval wiring), the hands (connectors), and the face (UI) are what remain. **That is the build
order.** Everything else in this document supports that.

---

## 2. Core Philosophy

1. **Contracts first.** Every cross-boundary shape is a Zod schema in `packages/shared`, mirrored 1:1
   by Pydantic in `workers/`. Schemas are canonical; engines `.parse()` on input and output.
2. **Deterministic engines, injected infrastructure.** Engines are pure/deterministic with
   `clock`/`idFactory` options and a repository **port**; the concrete store (Supabase) and AI calls
   are injected later. This is why the whole domain could be built and tested before the DB existed.
3. **Tenant isolation by construction.** Every table carries `tenant_id`; RLS denies by default and
   only permits rows where `tenant_id = current_setting('app.tenant_id', true)::uuid`. Unset context
   sees zero rows (fail-closed).
4. **Nothing risky executes without approval.** Raw conversation is input, never a command. Agents
   cannot act without a delegation packet; money/public/legal/live-deploy actions require Alyssa.
5. **Business-aware, never cross-contaminated.** Every unit of work loads a business-scoped context
   stack; mixing two businesses' contexts is blocked in code.
6. **Cost control.** AI features are flag-gated, manual-triggered, cached by content hash, rate-
   limited; deterministic logic is preferred before reaching for a model.
7. **Verify-merge, don't rebuild.** Re-pasted specs are reconciled against what exists; the system has
   ~150 pre-existing engines, so new work is always checked against the catalog first.

---

## 3. System Architecture

**Monorepo** (pnpm workspaces + Python `uv`):

```
packages/
  shared/      172 Zod contracts — the only legal cross-boundary surface
  core/        173 engine modules — deterministic domain logic (in-memory reference stores)
  db/          @alfy2/db — Postgres adapters (pg) with withTenant() RLS-GUC; pg lives ONLY here
  config/      layered env loader + Zod validation (boot-fails on invalid/missing)
  agents-sdk/  agent runtime primitives
services/
  api/         [SCAFFOLD] HTTP gateway — auth, tenant context, Security Gate, endpoints
  orchestrator/[SCAFFOLD] scheduled loops (goal recalc, follow-up expiry, reviews, etc.)
workers/       Python — Pydantic mirrors of the contracts + contract tests (599 passing)
infra/ + supabase/  238 migrations (canonical SQL); GitHub→Supabase deploy
```

**Data plane:** Supabase Postgres. **Auth (decided):** Supabase Auth. **Connectors:** the
`ConnectionsHub` engine registers providers at runtime (master / business / personal scope) with
secrets stored as references; concrete adapters are not built yet.

**The runtime request path (target):**

```
Alyssa / client → services/api
  → verify Supabase JWT (identity)
  → resolve tenant_id (single-operator = default tenant) + active business_id
  → Db.withTenant(tenant_id, business_id, async (q) => { ...engine work via Pg repositories... })
  → Security Gate on any state-changing route (approval required by risk)
  → engine executes; emits accountability + observability records
  → response
orchestrator → scheduled jobs run the same engines on a cadence (reviews, follow-ups, KPI rollups)
```

---

## 4. Department Structure (15 departments — LIVE seed)

`DepartmentOsEngine.seedDefaultDepartments()` provisions 15 departments, each with mission, operating
loop, AI employees, KPIs, and review cadence; `validateGovernance()` enforces that every department
has a loop + KPIs and every AI employee belongs to a department.

1. Executive Office · 2. Revenue · 3. Growth/Marketing · 4. Product/Platform · 5. Engineering/Build ·
6. Operations · 7. Customer Success · 8. Finance · 9. Legal/Compliance/Risk · 10. Data/Intelligence ·
11. People Operations · 12. Fundraising/Development · 13. **R&D / Innovation** (home of Swarm Lab) ·
14. **Creative Production** · 15. **Organizational Development (CODO)**.

94 AI employees are seeded across these departments (scorecard KPIs attached to each).

---

## 5. AI Employee Hierarchy

`AiOrgEngine` seeds **78 rich role cards** across the org with: mission, department, org layer,
reports-to, responsibilities, operating loop, allowed actions, requires-approval-for, inputs/outputs,
tools, KPIs, failure signals, escalation rules, review cadence, **permission scope** (observe_only →
admin_disabled), and status. Org layers: `executive` (4), `department_leader` (11), `ai_employee`
(63). Leaders: Executive Governor, Chief of Staff, Portfolio Strategist + CRO, COO, CPO, Chief
Systems Architect, Chief Security & Compliance Officer, CFO, Chief Data Architect, Hiring Strategist,
Fundraising Strategist, R&D Lead, Creative Director, CODO. (New C-suite titles from later specs —
Chief AI Systems Engineer, Chief Brand Officer, Fundraising Director — are a **scaffold item**:
add as role cards, no new engine.)

---

## 6. Specialist Agent Hierarchy

Specialist agents are narrow task executors (research, copy, email, social, SEO, CRM, GitHub,
Supabase, Render, PDF, deck, QA, compliance, analytics, automation, image-gen, video). Modeled in the
role-card system as `org_layer = 'specialist_agent'`. **Rule (enforced):** a specialist cannot start
work without a delegation packet (`AiOrgEngine.startWork` throws otherwise). Specialists report to an
AI employee, who reviews and reports to the department leader.

Today the **seed roster contains no specialist cards** — they are added on demand. Scaffold item:
seed the 15 standard specialist agents.

---

## 7. Chain of Command

```
Level 1  Alyssa / CEO            final approval: strategy, high-risk, brand, legal, financial,
                                 live deploys, public posting, client/vendor/donor comms
Level 2  Executive Layer         Executive Governor, Chief of Staff, Portfolio Strategist, Decision Log
Level 3  Department Leaders      CRO, COO, CFO, CPO, CSA, CSCO, CDA, CODO, R&D Lead, Creative Dir, ...
Level 4  AI Employees            role-specific operators inside departments
Level 5  Specialist Agents       narrow task executors
```

Work flows DOWN (delegation). Reports flow UP (report-back). Approvals STOP risky execution.
Escalation ladder (enforced in `AiOrgEngine.raiseEscalation`): Specialist → AI Employee → Department
Leader → Executive → Alyssa.

---

## 8. Delegation Packet Protocol (LIVE)

`ai_org_delegation_packets`. No agent begins without a packet containing: assigning employee,
assigned agent, business, project, objective, context stack, source-of-truth refs, required output,
allowed tools, prohibited actions, approval required, deadline/priority, success criteria, reporting
format, escalation trigger. If required context is missing, the agent must stop and report
"needs context." (`startWork` refuses an un-accepted/missing packet.)

---

## 9. Report-Back Protocol (LIVE)

`ai_org_agent_reports`. Every specialist reports: task completed, output produced, sources/context
used, assumptions, issues, confidence, risks, approval needed, execution status, verification status,
recommended next step. The receiving AI employee reviews → accept/revise/reject → request another
agent / escalate → log outcome (`reviewReport`).

---

## 10. Context-Loading Algorithm (LIVE — `BusinessProfileEngine.buildContextStack`)

Every agent loads context in this **canonical 11-layer order** (security first):

```
1  security_compliance      6  skill_playbook          11 task_instructions
2  global_rules             7  business_profile
3  founder_profile          8  project_context
4  department_instructions  9  relationship_history
5  role_instructions        10 source_of_truth
```

The stack pulls `brand_voice`, `banned_language`, and `compliance_caution` from the business profile.
**Cross-business mixing is blocked:** `enforceNoCrossBusiness(a, b)` throws if `a !== b` (Move Mi
marketing can't use Divini pricing; StrataLogic carries health disclaimers; Black Flag bans
aggressive sales language).

---

## 11. Business-Aware Agent Routing

`Alyssa input → Executive interprets priority → Department Leader owns outcome → AI Employee manages
task → Specialist Agents execute → AI Employee reviews → Leader approves/escalates → Executive
summarizes → Alyssa approves high-risk → execution if allowed → results verified → KPIs update →
memory/SOPs improve.`

Routing always: (1) load the Business Operating Profile, (2) build the context stack scoped to that
business, (3) activate the correct department, (4) delegate down with a packet, (5) gate execution by
risk. **Same global skill, different business execution.**

---

## 12. Source-of-Truth Rules

Existing engines: `source-of-truth`, `knowledge-graph`, `identity` resolution, `relationship-capital`.
Rules: one canonical record per entity; identity resolution attaches inputs to person/company/
business/project/opportunity; conflicts are surfaced, not silently merged; freshness matters for fast-
moving domains (social algos, SEO, AI-search, deliverability, grants, compliance) — research current
info before applying. Source integrity: verify source, no fake quotes, distinguish principle from
interpretation, flag low-confidence/secondhand content.

---

## 13. Approval Gates (policy — wiring is a build item)

**Require Alyssa approval before:** sending email, public posting, DMing leads/customers/donors,
deploying live code, changing live sites, charging/refunding, deleting data, changing DNS, sending
contracts, changing pricing, medical/legal/financial claims, accessing sensitive personal data,
publishing brand-sensitive content, any money/rev-share/payout.

**Allowed without approval (when explicitly configured):** internal drafts, internal summaries, task
creation, research, low-risk recommendations, non-public SOP/template generation.

Today this lives as `requires_approval_for` on role cards + `persistent-approval` + the Build From
Brainstorm gate. **Build item:** enforce it centrally in `services/api` (every state-changing route
checks the gate before execution).

---

## 14. Execution Verification Workflow (LIVE pattern, via Build From Brainstorm)

`Brain dump → extract decisions → strategy map → build prompt pack → build queue → APPROVAL GATE →
agent execution → QA → changelog → completed.` `runApproved` refuses any unapproved task. The same
approve→execute→QA→changelog discipline is the template for all execution. Swarm Lab (R&D) feeds
candidates into this gate; it never self-executes.

---

## 15. Integration Adapter Requirements

`ConnectionsHub` (LIVE) registers connector definitions at runtime and resolves business→master
scope; secrets are stored as references in a vault. **Adapters to build (none exist yet), in order:**
email (Gmail / IMAP / Resend-inbound) → Slack → social (IG/TikTok/LinkedIn/X) → CRM → GitHub →
Supabase admin → payments (PayPal) → analytics. Each adapter: OAuth/token flow, inbound ingestion →
`inbox_items` (business-scoped), outbound send (approval-gated), and status callbacks.

---

## 16. Database Schema (237 live tables, grouped)

All tables: `id`, `tenant_id`, `created_at` (+ `updated_at` + `set_updated_at()` trigger on mutable);
RLS deny-by-default. Major groups:

- **Platform/core:** tenants, events, audit_log, memories/memory_links, inbox_items, queue_items,
  persistent_approvals, agent_actions/identities, connections/connector_definitions.
- **Org & people:** department_os_* (departments, ai_employees, kpi_records); ai_org_* (role_cards,
  delegation_packets, agent_reports, escalations, accountability, department_reports); people-ops
  (role_needs, role_designs, candidates, interviews, offers, onboarding_documents, access_grants,
  training_plans, performance_reviews, delegation_tasks, offboarding, hiring_standard_evaluations).
- **Revenue & growth:** revenue_* (opportunities, money_actions, funnel_stages, command_centers,
  business_missions, offer_reviews); conversion, follow-ups, campaigns, deal-desk, sales assets.
- **Strategy & knowledge:** expert_* (frameworks, lens_applications, principle_conversions,
  advisory_reviews); review_* (master_docs, department_reports, feedback); brainstorm_* (9-stage
  pipeline); knowledge_*; capital_*; portfolio; domain models.
- **Business-aware & health:** business_profiles, business_context_stacks; org_health_* (wellness,
  comm_audits, corrections, reports, ceo_coaching); ecosystem_* (incentive_evaluations,
  referral_programs, revshare, health_scores, win_win_win); swarm_* (runs, candidates, clusters,
  reports).

---

## 17. Required Pages / Dashboards (the thin-UI brick — NOT built)

Priority views (render existing live engines):

1. **Set up & Connect** — register/connect a business's platforms (ConnectionsHub).
2. **Executive Inbox** — the single entry point; triaged items + next actions + approve/act.
3. **Build From Brainstorm** — the 8 tabs (thread → decisions → strategy → prompt pack → queue →
   agent runs → QA → changelog) with the approval gate.
4. **Revenue Command Center** — top money actions, hottest leads, pipeline, blockers.
5. **Org Chart + Department dashboards** — role cards, delegation, escalations, KPIs, org-health.
6. **Review Cadence** — monthly/quarterly/yearly master docs + approval checklist + feedback capture.
7. **Approvals queue** — everything awaiting Alyssa, by risk.
8. **Swarm Lab (R&D tab)** — bounded swarm runs → promote to pipeline.

---

## 18. KPI Framework

- **Agent scorecard KPIs:** output quality, approval rate, edit rate, rejection rate, execution
  success, verification success, revenue/conversion impact, time saved, cost per run, latency,
  failure rate, hallucination/conflict rate, wrong-context attempts, approval violations prevented.
- **Department KPIs:** per the 15 departments' seeded KPI lists.
- **Org-health KPIs:** org-health score, delegation quality, bottlenecks resolved, approval delay,
  repeated mistakes, founder time saved.
- **Rule:** every KPI links to a business outcome (enforced in Department OS + Incentive Ecosystem).

---

## 19. Business Operating Profile Template (LIVE)

`business_profiles`: business_key, tier, identity, mission, revenue_model, offers[{name,price,terms}],
pricing_notes, target_audiences[], brand_voice, approved_language[], **banned_language[]**,
growth_channels[], platform_connections[], source_of_truth_systems[], active_campaigns[],
current_priorities[], compliance_risks[], **compliance_caution**, ai_skills_used[], kpis[],
improvement_backlog[], status. Seeded Tier-1: `alfie2`, `move_mi`, `divini_procure`,
`divini_partners`, `stratalogic`.

---

## 20. Monthly / Quarterly / Yearly Review System (LIVE — `ReviewCadenceEngine`)

> **Superseded/extended by §29 (Executive Review Cadence).** This section describes the live
> monthly/quarterly/yearly engine; §29 adds the daily/weekly rhythms and the canonical 11-field
> review output. Read them together — §29 is the complete cadence model.

- **Monthly Operator Meeting:** "what happened, what broke, what made money, what's next?"
- **Quarterly CEO Meeting:** "what to focus / scale / pause / simplify / kill for 90 days?"
- **Yearly Portfolio Meeting:** "what did we build, learn, what became valuable, strategy for next year?"

Each: collect department reports → assemble master doc (level-specific sections + agenda + approval
checklist) → capture Alyssa feedback → convert to decisions / priorities / tasks / SOP changes /
paused-killed / next-review goals. Business and Portfolio variants at all three cadences.

---

## 21. Tier-1 Business Profiles Needed First

`alfie2` (manages/improves the platforms, does not duplicate them) → `move_mi` (first revenue slice) →
`divini_procure` → `divini_partners` → `stratalogic`. Seed profiles exist; **enrich** with real
offers/pricing/source-of-truth/connections as the runtime comes online.

---

## 22. Build Order

> **Authoritative runtime ordering now lives in §36 (Runtime / API Build Sequence, 17 phases).** The
> A/B/C summary below is the strategic shape; §36 is the implementation-ready, phase-by-phase plan
> (goal · files · deps · acceptance · tests · rollback · risks · done) and the build queue in
> `ALFIE2_BUILD_QUEUE.md` is derived from it. Where they differ, §36 wins.

```
PHASE A — RUNTIME FOUNDATION (build now; makes the brain actually run)
  A1  Live persistence proof: fill .env (DATABASE_URL/keys/ALFY_DEFAULT_TENANT_ID), run db-smoke live.
  A2  Generalize Repository<T> port; Pg adapters for the SLICE engines (inbox done → +business_profiles,
      +ai_org, +review, +revenue_opportunities/money_actions).
  A3  services/api gateway: Supabase Auth (verify JWT) → resolve tenant_id + business_id →
      Db.withTenant → central Security Gate (approval by risk) → slice endpoints.
  A4  Email connector behind ConnectionsHub → inbound mail → context-scoped inbox_items (Move Mi).
  A5  Thin UI: Set up & Connect + Executive Inbox + one Review/Revenue dashboard.

PHASE B — INDUSTRIALIZE (scaffold + fill in)
  B1  Repository adapters for the remaining ~169 engines (mechanical; one pattern).
  B2  orchestrator: scheduled loops (goal recalc, follow-up expiry, KPI rollups, review reminders).
  B3  More connectors (Slack, socials, CRM, payments) + more UI tabs.
  B4  Seed specialist-agent role cards + new C-suite leader cards.

PHASE C — INTELLIGENCE LAYER (domain now BUILT; wire into runtime/UI after the slice)
  C1  Knowledge Ops (Elite Operator Digest, Knowledge Source Tracker, Adaptation Filter, taxonomy +
      stage/model fit, scenario simulator, experiment + learning repo). ✅ BUILT — KnowledgeOpsEngine.
  C2  Market Intel (Voice-of-Customer, Market Gap Detector, AI-Search/AEO + public-reputation
      visibility scoring). ✅ BUILT — MarketIntelEngine.
  C3  Lifecycle + Growth (8-stage Funnel/Lifecycle Architecture, Growth Loop Designer, Reputation/
      Trust Flywheel, First Impression Audit, White-Glove Experience Designer). ✅ BUILT —
      LifecycleGrowthEngine.
  C4  Oversight (Leadership Blind-Spot Detector, Recursive System Optimizer, Billion-Dollar Standard
      Checker). ✅ BUILT — OversightEngine.
  → Remaining for Phase C is RUNTIME ONLY: Pg repository adapters + API routes + UI tabs for these
    four engines, plus the AEO live-web-research feeder for C2 (the scoring/contract is already live).
```

---

## 23. What to Build NOW (the critical path)

A1 → A2 → A3 → A4 → A5. Nothing else. This is the smallest sequence that turns "237 live tables + 173
engines" into "connect Move Mi's email and watch an accountable, approval-gated, business-aware loop
actually run against the live database." Everything in Phases B/C is valuable but is either mechanical
repetition (B) or strategy/intelligence that should ride on top of a proven runtime (C).

---

## 24. What to SCAFFOLD Only (stub now, fill later)

- `services/orchestrator` skeleton (job registry + one scheduled job) — wire structure, no loops yet.
- Repository adapters for non-slice engines — generate stubs from the pattern, implement on demand.
- Connector adapter interface for Slack/socials/CRM — interface only.
- Specialist-agent and new C-suite role cards — add to the seed catalog.
- AEO/visibility extension fields — add columns/contract fields, defer the live-research engine.

---

## 25. What to DEFER (real, not now)

The Phase C **domain** is now built (Knowledge Ops, Lifecycle + Growth, Market Intel, Oversight), so
"defer" no longer means "don't build the engine" — it means **don't wire these four into the runtime
or UI until the Move Mi slice (Phase A) is proven.** Their persistence adapters, API routes, UI tabs,
and the AEO live-web-research feeder ride on top of the runtime and add no value until that runtime
exists. Deferring their wiring (not their logic) prevents the failure mode this document was written
to avoid: surface area on top of an un-runnable core.

---

## 26. What Would BREAK if Skipped

| Skip | Consequence | Severity |
|---|---|---|
| services/api + Supabase Auth + tenant context | Nothing runs against the live DB; engines stay ephemeral; **there is no product** | CRITICAL |
| Repository adapters (A2/B1) | Engines can't persist; all data is lost between calls | CRITICAL |
| Central approval-gate enforcement (A3) | Risk of unapproved sends/deploys/payments — violates the non-negotiable rule | CRITICAL |
| Context-stack enforcement in routing | Cross-business contamination (wrong pricing/voice/claims) | HIGH |
| Connectors (A4) | No real-world input/output; closed loop, no live value | HIGH |
| Thin UI (A5) | Alyssa can't operate it directly (only via Claude/API) | MEDIUM |
| Phase C intelligence | Less strategic leverage, but the core still works | LOW (now) |

---

## 27. Exact Next Implementation Steps

1. **Prove persistence live.** Fill `.env` (`DATABASE_URL` = Supabase pooler string, `SUPABASE_*`
   keys, `ALFY_DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001`). Run `pnpm run db:smoke`
   against the live DB to confirm the Memory + Inbox Pg adapters round-trip under RLS.
2. **Generalize the Repository port** (model on `memory/repository.ts`) and implement `@alfy2/db` Pg
   adapters for the slice engines: business_profiles, ai_org (role cards + packets + reports),
   review_master_docs, revenue_opportunities/money_actions. Add a guarded `*-db-smoke` for each.
3. **Build `services/api`** (Hono or Fastify — minimal, cost-controlled): (a) Supabase JWT verify
   middleware → identity; (b) resolve `tenant_id` (default tenant) + active `business_id`; (c) wrap
   handlers in `Db.withTenant`; (d) central **Security Gate** that blocks state-changing routes
   pending approval per the §13 list; (e) slice routes: `POST /inbox/ingest`, `GET /inbox`,
   `POST /inbox/:id/action` (approval-gated), `GET /reviews/:id`, `POST /reviews/:id/feedback`.
4. **Email connector** behind ConnectionsHub: register `email`, OAuth callback, inbound poll →
   build the Context Stack for Move Mi → create `inbox_items` (item_type `email`).
5. **Thin UI**: a single app (Next.js) with three screens — Set up & Connect, Executive Inbox
   (with approve/act), and a Review/Revenue dashboard — all calling `services/api`.
6. **Then** industrialize (B1 repositories, B2 orchestrator loops, B3 more connectors) and only after
   the Move Mi slice is proven, start the Phase C intelligence backlog.

---

### Appendix — Verification baseline (current)

`tsc -b` green across the workspace · 622 Python contract tests passing · all engine smokes pass ·
237 live tables, 0 without RLS · 173 engines · code on GitHub (`adagentpc-del/Alfy2`, commits pending Push).

**Decisions already locked:** Supabase Auth · first vertical slice = **Move Mi + email** ·
Supabase by default · `pg`/RLS-GUC persistence pattern · cost-control guardrails on all AI features.

---
---

# PART II — Enterprise Operating Layers (v2 upgrade)

> This part upgrades Alfie2 from an *AI-org architecture* to a *complete enterprise operating
> architecture*. It does **not** rebuild Part I — it adds the missing layers cleanly and, where a
> capability already exists as an engine, it **extends via thin read-models and routes** rather than
> duplicating. Every table below follows the Part I conventions (`id/tenant_id/created_at`, RLS
> deny-by-default, `updated_at`+`set_updated_at()` on mutable, append-only = SELECT+INSERT, jsonb for
> arrays/objects, Zod contract + Pydantic mirror first).

## Verify-merge map (what already exists vs. what is genuinely new)

| Upgrade layer | Already built (extend, don't rebuild) | Genuinely new |
|---|---|---|
| Mission Control (L0) | read sources: revenue-command, ai-org, executive-inbox, persistent-approval, org-health, business-profile, follow-up, agent-observability | `mission_control_snapshots` read-model + alert/escalation/summary rules |
| Executive Review Cadence | `ReviewCadenceEngine` (monthly/quarterly/yearly master docs) | daily CEO brief + daily standups + weekly review cadences as scheduled read-models |
| Continuous Improvement | `continuous-improvement`, `reflection`, `self-improvement`, build-from-brainstorm changelog | `improvement_candidates` closed-loop protocol + scoring + promotion-to-asset routing |
| Founder Capacity | partial signals in org-health (CEO coaching) | `FounderCapacityEngine` + work-mode adaptation rules (NEW) |
| Execution Scoring | per-agent KPI fields in `department-os` / `ai-org` | `ExecutionScoreEngine` unified scorecard + lifecycle actions (promote/retrain/retire) |
| Revenue OS | `RevenueCommandEngine` (opportunity scoring, command center, missions) | canonical 11-stage funnel + per-business RevOps metrics rollup + required briefs |
| Capital Allocation | `capital-allocator`, `capital-board`, `cost-cfo`, `finance-command` | Profit-First `CapitalAllocationEngine` buckets + runway/mode rules per business |
| Decision Engine | `ExpertCouncilEngine` (framework library, lens selector, advisory board) | `DecisionEngine` structured record + 13 capital/operator lenses + reversibility gate |
| Runtime sequencing | Part I Phase A/B | 17-phase implementation-ready sequence with acceptance/tests/rollback |

---

## 28. Layer 0 — Mission Control (CEO Dashboard)

**Purpose.** A single top-level layer where every department reports up. Mission Control **monitors,
routes, escalates, summarizes, and requests approval** — it never performs department work. It is a
**read-model + rules** layer composed over existing engines; it owns no business logic of its own.

### 28.1 Data inputs (sources → Mission Control)

| Tile | Source engine(s) / table(s) |
|---|---|
| Today's revenue | revenue-command `revenue_money_actions`, RevOps `revops_daily_metrics` |
| Cash position / runway | `CapitalAllocationEngine` `capital_accounts`, `capital_runway` |
| KPI status | department-os `department_os_kpi_records`, RevOps rollups |
| Critical alerts / risk alerts | `mission_control_alerts` (rule output) |
| Blocked tasks / open loops | execution-queue, follow-up `follow_ups`, dont-drop-ball |
| Approval queue | `persistent_approvals`, ai-org `requires_approval_for` |
| Active builds | build-from-brainstorm `brainstorm_build_queue`, swarm-lab |
| Agent activity | agent-observability, ai-org `ai_org_agent_reports` |
| Department / business health | org-health `org_health_reports`, business-profile |
| Follow-ups due / meetings | follow-up, calendar connector |
| Founder capacity | `FounderCapacityEngine` `founder_capacity_snapshots` |
| Top-3 priorities | review-cadence + Mission Control ranking rule |
| Revenue opportunities | revenue-command `revenue_opportunities` (scored) |
| Launch readiness | business-profile + checklist engines |

### 28.2 Read-model table (new)

```sql
create table if not exists mission_control_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  business_id uuid,                       -- null = portfolio-wide
  as_of timestamptz not null,
  revenue_today numeric not null default 0,
  cash_position numeric not null default 0,
  cash_runway_days integer,
  kpi_status jsonb not null default '{}'::jsonb,      -- {green,yellow,red counts + worst}
  critical_alerts jsonb not null default '[]'::jsonb,
  blocked_tasks jsonb not null default '[]'::jsonb,
  approval_queue jsonb not null default '[]'::jsonb,
  active_builds jsonb not null default '[]'::jsonb,
  agent_activity jsonb not null default '{}'::jsonb,
  department_health jsonb not null default '{}'::jsonb,
  business_health jsonb not null default '{}'::jsonb,
  follow_ups_due jsonb not null default '[]'::jsonb,
  meetings jsonb not null default '[]'::jsonb,
  risk_alerts jsonb not null default '[]'::jsonb,
  founder_capacity jsonb not null default '{}'::jsonb,
  top_priorities jsonb not null default '[]'::jsonb,  -- exactly 3
  revenue_opportunities jsonb not null default '[]'::jsonb,
  launch_readiness jsonb not null default '{}'::jsonb,
  open_loops jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists mission_control_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  business_id uuid,
  severity text not null,                 -- info | warn | critical
  category text not null,                 -- revenue | cash | risk | agent | approval | health | launch
  title text not null,
  detail text not null default '',
  source_ref text not null default '',
  requires_approval boolean not null default false,
  routed_to text not null default 'mission_control',  -- mission_control | department_leader | ceo
  status text not null default 'open',    -- open | acknowledged | escalated | resolved
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
-- + RLS deny-by-default, set_updated_at trigger on mission_control_alerts.
```

### 28.3 UI modules

Top KPI strip (revenue today · cash · runway · founder capacity · open approvals) → **Critical
Alerts** panel → **Top-3 Priorities** → **Approval Queue** (one-tap approve/deny) → **Department
Health grid** → **Revenue Opportunities** → **Active Builds** → **Open Loops / Blocked**. Every tile
is read-only and deep-links to the owning engine's view; the only write actions are *approve*,
*acknowledge*, *escalate*.

### 28.4 Alert rules (deterministic; AI only for summary phrasing)

- **Cash:** runway < 60 days → warn; < 30 → critical (route to CEO).
- **Revenue:** revenue_today < 50% of trailing-7-day average by 3pm local → warn.
- **Approval:** any approval item open > 24h → escalate to CEO digest; high-risk (money/public/legal/
  deploy) → surface immediately.
- **Agent:** agent failure_rate > threshold or 2 consecutive rejected reports → route to department
  leader; approval-violation-attempt → critical.
- **Risk:** any compliance_caution flag triggered on a queued action → block + critical.
- **Launch:** launch_readiness < 100% within 7 days of target → warn.

### 28.5 Escalation routing

`Specialist → AI Employee → Department Leader → Executive → CEO` (Part I §7). Mission Control only
*decides which level* a given alert enters based on severity×category, and *batches* non-critical
items into the daily digest instead of interrupting.

### 28.6 Daily summary format (CEO Brief)

```
ALFIE2 DAILY BRIEF — {date}
Money: revenue today ${x} (▲/▼ vs 7d avg) · cash ${y} · runway {d} days
Top 3 priorities: 1) … 2) … 3) …
Needs you today: {n} approvals ({k} high-risk) · {m} decisions
Wins: … | Watch: … | Blocked: …
Revenue opportunities (hot): …
Founder mode: {protect | normal | high-capacity}  → recommended focus: …
```

### 28.7 Weekly executive summary format

```
WEEKLY EXECUTIVE REVIEW — week of {date}
Per business: revenue · MRR · pipeline · close-rate · churn · top win · top risk
Portfolio: cash, runway, allocation health, capacity trend
KPIs off-target (with owner + recommended action)
Decisions needed (with expert-lens recommendation + reversibility)
SOPs updated · automations shipped · agents promoted/retrained
Next-week top 3 + revenue focus
```

**Build tasks:** contract `mission-control.ts` + Pydantic mirror · migration `mission_control_*` ·
`MissionControlEngine.compose(tenantId, businessId?)` (pure aggregation over repositories) + alert
rule evaluator · Pg read-model adapter · API `GET /mission-control` · UI dashboard. **No new business
logic** — it reads existing engines.

---

## 29. Executive Review Cadence (Operating Rhythms)

**Extends `ReviewCadenceEngine`** (monthly/quarterly/yearly already live) by adding the higher-
frequency rhythms as scheduled read-models.

| Cadence | Trigger | Owner | Output |
|---|---|---|---|
| Daily CEO Brief | 06:00 local (orchestrator) | Mission Control | §28.6 brief |
| Daily Department Standups | 07:00 per dept | Department Leader | dept status → rolls into brief |
| Weekly Executive Review | Mon 08:00 | Chief of Staff | §28.7 summary |
| Monthly Business Review | 1st business day | per business | `ReviewCadenceEngine` master doc |
| Quarterly Strategy Review | start of quarter | CEO + Exec | focus/scale/pause/kill doc |
| Annual Operating Plan | start of year | CEO + Portfolio | OKRs + capital plan + hiring plan |

**Every review outputs (canonical schema):** `wins[]`, `losses[]`, `kpis[]`, `risks[]`,
`bottlenecks[]`, `decisions_needed[]`, `revenue_impact`, `budget_impact`, `recommended_next_actions[]`,
`tasks_created[]`, `sops_updated[]`. Add `review_cadence_runs` (append-only) capturing each run with
that payload; daily/weekly are deterministic rollups, monthly+ reuse the existing master-doc flow.

**Build tasks:** extend `review-cadence` contract with `ReviewRunOutput` + `cadence` enum
(`daily_ceo|daily_standup|weekly_exec|monthly|quarterly|annual`) · migration `review_cadence_runs` ·
orchestrator jobs (§36 Phase 13) · routes `GET /reviews/cadence/:type`.

---

## 30. Continuous Improvement Engine

**Extends `continuous-improvement` / `reflection` / `self-improvement`.** Adds a single closed-loop
protocol so every completed task is evaluated for reusability.

### 30.1 Closed loop

```
Task done → Report-back (ai_org_agent_reports) → QA → Pattern detection →
Improvement candidate → Scoring → Approval (if it changes a rule/automation) →
System update (SOP/template/prompt/workflow/automation/component/skill/rule/KB/training/KPI/escalation) →
Changelog
```

### 30.2 Candidate table (new)

```sql
create table if not exists improvement_candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  business_id uuid,
  source_task_ref text not null,
  observation text not null,
  proposed_artifact text not null,   -- sop|template|prompt|workflow|automation|component|agent_skill|business_rule|kb_update|training_data|kpi_update|escalation_rule
  score_repeatability int not null default 0,        -- 0..5 each
  score_revenue_impact int not null default 0,
  score_time_saved int not null default 0,
  score_risk_reduction int not null default 0,
  score_quality int not null default 0,
  score_automation_readiness int not null default 0,
  score_founder_burden_reduction int not null default 0,
  composite_score int not null default 0,            -- weighted sum
  recommendation text not null default '',
  status text not null default 'proposed',           -- proposed|approved|rejected|shipped
  shipped_ref text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
```

**Rule:** candidates above a composite threshold are surfaced in the weekly review; any candidate that
would change a **business rule, automation, or escalation rule** is **approval-gated** before it ships
(Part I §13). Shipped candidates write a changelog entry and update the relevant engine/KB.

**Build tasks:** contract `improvement.ts` + mirror · migration `improvement_candidates` ·
`ContinuousImprovementEngine.evaluate(report)` → candidate; `score()`; `promote()` (gated) ·
orchestrator nightly pattern-detection pass over the day's reports.

---

## 31. Founder Energy + Capacity Layer (NEW)

Alfie2 is built around Alyssa as CEO. The system adapts its behavior to her capacity.

### 31.1 Engine + table

```sql
create table if not exists founder_capacity_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  as_of timestamptz not null,
  energy int, sleep_hours numeric, stress int, focus int,         -- 0..10 scales
  meeting_load int, decision_fatigue int, context_switching int,
  emotional_load int, urgency int, build_intensity int,
  health_constraints jsonb not null default '[]'::jsonb,
  capacity_score int not null,                 -- 0..100 computed
  recommended_mode text not null,              -- protect | normal | high_capacity | recovery
  do_not_interrupt boolean not null default false,
  created_at timestamptz not null default now()
);
```

### 31.2 Adaptation rules (deterministic)

- **Overloaded (capacity < 35 or `do_not_interrupt`):** batch approvals into one digest; suppress
  non-critical alerts; delay low-priority work; escalate only urgent/high-risk; simplify summaries;
  protect deep-work blocks on the calendar.
- **High-capacity (> 75):** surface strategic decisions; accelerate outbound; batch revenue
  opportunities for review; open the build queue.
- **Recovery (sleep < 5h or stress ≥ 8):** mute everything except cash/legal/critical; hold a recovery
  warning at the top of Mission Control.

Mission Control reads `recommended_mode` and changes *what it shows and when it interrupts* — it never
hides cash, legal, or safety-critical alerts regardless of mode.

### 31.3 UI modules

Founder capacity score · approval load gauge · cognitive load · recovery warning banner · recommended
work mode chip · **"Do not interrupt unless critical"** toggle.

**Build tasks:** contract `founder-capacity.ts` + mirror · migration `founder_capacity_snapshots` ·
`FounderCapacityEngine.record()/score()/mode()` · Mission Control consumes `recommended_mode` ·
inputs come from a quick daily check-in + calendar meeting-load + approval backlog (no health-device
integration required for v1; fields are nullable).

---

## 32. Execution Score System

Unifies the per-agent KPI fields already in `department-os`/`ai-org` into one scorecard for every
**department, AI employee, and specialist agent**.

```sql
create table if not exists execution_scores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  subject_type text not null,        -- department | ai_employee | specialist_agent
  subject_ref text not null,
  period text not null,              -- e.g. 2026-W26
  speed int, accuracy int, quality int, roi int, revenue_impact int,
  cost numeric, failure_rate numeric, rework_rate numeric,
  approval_dependency numeric, founder_burden_reduced int,
  reliability int, confidence_calibration int,   -- predicted vs actual success gap
  composite int not null default 0,
  lifecycle_action text not null default 'retain',  -- promote|retain|retrain|demote|retire|human_review|redesign_workflow
  rationale text not null default '',
  created_at timestamptz not null default now()
);
```

**Lifecycle logic.** composite ≥ 85 + low approval_dependency → **promote** (widen allowed actions /
reduce review). 60–85 → **retain**. 40–60 or rising rework → **retrain** (feed Continuous Improvement).
< 40 or repeated approval-violations → **demote / human_review**. Persistent failure → **retire** the
role card or **redesign_workflow**. All promotions that widen an agent's `allowed_actions` are
**approval-gated**.

**Build tasks:** contract `execution-score.ts` + mirror · migration `execution_scores` ·
`ExecutionScoreEngine.score(subject, period)` (reads agent reports + outcomes) + `decideLifecycle()` ·
weekly orchestrator pass · surfaced in department dashboards + weekly review.

---

## 33. Revenue Operating System (RevOps)

**Extends `RevenueCommandEngine`** with a canonical cross-business funnel and a metrics rollup.

### 33.1 Canonical funnel

`Traffic → Lead → Qualified Lead → Meeting → Proposal → Close → Delivery → Upsell → Referral →
Case Study → Retention.` Stored as a `revops_pipeline_stage` enum; every opportunity maps to one stage.

### 33.2 Per-business metrics table

```sql
create table if not exists revops_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  business_id uuid not null,
  as_of date not null,
  offers jsonb not null default '[]'::jsonb,           -- [{offer,price}]
  lead_source_breakdown jsonb not null default '{}'::jsonb,
  outreach_campaigns jsonb not null default '[]'::jsonb,
  traffic int default 0, leads int default 0, qualified int default 0,
  meetings int default 0, proposals int default 0, closes int default 0,
  conversion_rate numeric, close_rate numeric, time_to_close_days numeric,
  revenue numeric default 0, mrr numeric default 0, pipeline_value numeric default 0,
  cac numeric, ltv numeric, churn_rate numeric, referral_rate numeric,
  next_best_action text not null default '',
  created_at timestamptz not null default now()
);
```

### 33.3 Required outputs

Daily revenue brief · stalled-deal report (no movement > N days by stage) · follow-up queue ·
offer-performance report · **founding-member campaign tracker** · **$6k fastest-path plan per
platform** (deterministic: rank live offers by price × close-probability × time-to-cash, output the
minimum sequence of actions to reach $6,000 for each business). Pricing/offer/discount changes remain
**Alyssa-approval-gated** (Part I §13).

**Build tasks:** extend `revenue-command` contract with `revops_pipeline_stage` + `RevOpsDailyMetric`
+ `FastestPathPlan` · migration `revops_daily_metrics` · `RevenueCommandEngine.rollupDaily()`,
`stalledDeals()`, `fastestPathTo(amount)` · routes `GET /revops/:business/brief|stalled|fastest-path`.

---

## 34. Capital Allocation Engine (Profit-First)

**Extends `capital-allocator` / `capital-board` / `cost-cfo` / `finance-command`.** Adds Profit-First
bucketing and runway/mode rules per business. **All money movement is recommendation-only and
Alyssa-approved — Alfie2 never executes a transfer or payment** (Part I §13, hard rule).

### 34.1 Buckets + accounts

```sql
create table if not exists capital_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  business_id uuid not null,
  bucket text not null,    -- operating|taxes|owner_pay|reserve|growth|tools|contractors|legal|investment
  target_pct numeric not null,        -- allocation policy
  balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create table if not exists capital_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  business_id uuid not null,
  inflow numeric not null,
  split jsonb not null,                -- {bucket: amount} per policy
  mode text not null,                  -- profit_first|growth|emergency
  recommended boolean not null default true,   -- always a recommendation
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists capital_runway (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  business_id uuid not null,
  as_of date not null,
  cash numeric not null, monthly_burn numeric not null,
  runway_days int not null, min_reserve numeric not null,
  reinvestment_threshold numeric, founder_pay_threshold numeric,
  mode text not null,                  -- emergency|normal|growth
  created_at timestamptz not null default now()
);
```

### 34.2 Rules

Each inflow is split by policy into the 9 buckets. **Emergency mode** when runway < min_reserve →
freeze growth/tools/contractor spend recommendations, prioritize reserve + owner_pay floor.
**Growth mode** when reserve ≥ target and runway > threshold → release growth bucket. Monthly financial
review (ties into §29) reconciles balances and re-checks thresholds. Owner-pay and any transfer are
surfaced as approval items, executed by Alyssa.

**Build tasks:** contract `capital-allocation.ts` + mirror · migrations `capital_accounts`,
`capital_allocations`, `capital_runway` · `CapitalAllocationEngine.allocate(inflow)`,
`runway(business)`, `mode(business)` · routes + Mission Control cash/runway tiles.

---

## 35. Decision Engine / Advisory Council

**Extends `ExpertCouncilEngine`** (lens library + advisory board already live) with a structured
decision record and a reversibility gate for high-impact decisions. **Lenses convert publicly known
business principles into evaluation criteria — no impersonation, no fabricated quotes** (Part I §12).

### 35.1 Lenses (principle-based, not personas)

Capital allocation (Buffett) · inversion & risk (Munger) · customer obsession & scale (Bezos) · offer
& acquisition (A. Hormozi) · operations & people (L. Hormozi) · leverage & wealth (Naval) · principles
& truth-seeking (Dalio) · message clarity (Miller) · attention & distribution (Vaynerchuk) · funnels
(Brunson) · behavioral economics (Sutherland) · cash discipline (Ramsey) · investor discipline
(O'Leary). Stored as a `decision_lens` enum; each lens is a checklist of questions + a scoring rubric.

### 35.2 Decision record

```sql
create table if not exists decision_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  business_id uuid,
  title text not null,
  summary text not null,
  decision_type text not null,       -- pricing|hire|spend|launch|partnership|capital|pivot|legal
  risks jsonb not null default '[]'::jsonb,
  upside text not null default '',
  downside text not null default '',
  assumptions jsonb not null default '[]'::jsonb,
  reversibility text not null,       -- one_way_door | two_way_door
  required_data jsonb not null default '[]'::jsonb,
  lens_analysis jsonb not null default '[]'::jsonb,   -- [{lens, reading, score, caution}]
  recommendation text not null default '',
  approval_required boolean not null default true,
  status text not null default 'open',   -- open|approved|rejected|deferred
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
```

### 35.3 Protocol

High-impact decisions run through the selected lenses → produce the §35.2 record → **one-way-door
(irreversible) decisions always require Alyssa approval**; two-way-door low-risk decisions may proceed
within configured limits. Output format = decision summary · risks · upside · downside · assumptions ·
reversibility · required data · expert-lens analysis · recommendation · approval required.

**Build tasks:** extend `expert-council` contract with `DecisionRecord` + `decision_lens` enum ·
migration `decision_records` · `DecisionEngine.evaluate(input)` (selects lenses by decision_type, runs
rubrics, sets reversibility gate) · routes + Mission Control "decisions needed" tile.

---

## 36. Runtime / API Build Sequence (implementation-ready, 17 phases)

> Replaces Part I §22 Phase-A as the authoritative ordering. Each phase: **goal · files/packages ·
> dependencies · acceptance · tests · rollback · risks · done**.

**Phase 1 — Supabase Auth.** *Goal:* verified identity. *Files:* `services/api/src/auth/*`, `.env`
(`SUPABASE_URL`, `SUPABASE_JWKS`). *Deps:* none. *Acceptance:* invalid JWT → 401; valid → user id.
*Tests:* unit verify good/expired/forged tokens. *Rollback:* feature-flag `AUTH_ENABLED=false` (dev
only). *Risks:* clock skew → allow leeway. *Done:* protected route returns identity.

**Phase 2 — Tenant context enforcement.** *Goal:* every request runs inside `Db.withTenant`. *Files:*
`services/api/src/middleware/tenant.ts`. *Deps:* P1, `@alfy2/db`. *Acceptance:* missing/blank context
→ 0 rows (fail-closed); cross-tenant id → denied. *Tests:* tenancy-isolation integration (two tenants,
no leakage). *Rollback:* n/a (security-critical). *Risks:* forgetting GUC on a path → add a lint/guard.
*Done:* all routes wrapped; isolation test green.

**Phase 3 — `@alfy2/db` adapter coverage for priority engines.** *Goal:* persistence for the slice +
L0 read-models. *Files:* `packages/db/src/*-repository.ts` for inbox(done), business_profiles, ai_org,
review, revenue/revops, capital, mission_control, founder_capacity. *Deps:* P2. *Acceptance:* each
engine round-trips under RLS. *Tests:* guarded `*-db-smoke` per repo. *Rollback:* in-memory adapter
stays as fallback. *Risks:* N+1 — add indexes from migrations. *Done:* slice engines persist live.

**Phase 4 — API gateway.** *Goal:* one HTTP surface (Hono/Fastify, cost-light). *Files:*
`services/api/src/server.ts`, route registry. *Deps:* P1–P3. *Acceptance:* health + one real route
200. *Tests:* route smoke. *Rollback:* revert to scaffold. *Risks:* over-framework — keep minimal.
*Done:* gateway boots with auth+tenant middleware.

**Phase 5 — Approval Gate middleware.** *Goal:* block state-changing routes per Part I §13 until
approved. *Files:* `services/api/src/middleware/approval.ts`. *Deps:* P4, persistent-approval engine.
*Acceptance:* money/public/legal/deploy routes return "approval required" + create approval item;
internal drafts pass. *Tests:* gated vs ungated route matrix. *Rollback:* gate defaults to **deny**
(safe). *Risks:* mis-classification → maintain explicit gated-route list. *Done:* no risky action
executes without an approval record.

**Phase 6 — Mission Control read models.** *Goal:* L0 snapshot + alerts. *Files:*
`packages/core/src/mission-control/*`, repo, `GET /mission-control`. *Deps:* P3. *Acceptance:* snapshot
aggregates live tiles; alert rules fire. *Tests:* snapshot composition + alert-rule unit tests.
*Rollback:* tile-level feature flags. *Risks:* heavy aggregation — cache per request, no polling.
*Done:* dashboard payload returns real numbers.

**Phase 7 — Executive Inbox.** *Goal:* triaged entry point (persistence already done). *Files:* inbox
routes + UI. *Deps:* P3. *Acceptance:* ingest → list → action(approve) round-trips. *Tests:* inbox
integration. *Rollback:* read-only mode. *Risks:* none material. *Done:* inbox usable end-to-end.

**Phase 8 — Business-profile context loading.** *Goal:* every request builds the 11-layer context
stack; no cross-business mixing. *Files:* context middleware using `BusinessProfileEngine`. *Deps:* P2.
*Acceptance:* `enforceNoCrossBusiness` throws on mix; banned_language/compliance_caution loaded.
*Tests:* cross-business contamination test. *Rollback:* n/a. *Done:* context attached to handlers.

**Phase 9 — Delegation packet routes.** *Goal:* create/accept packets; no work without one. *Files:*
ai-org routes. *Deps:* P4–P5,P8. *Acceptance:* startWork without packet → 409. *Tests:* packet
lifecycle. *Rollback:* read-only. *Done:* delegation flows via API.

**Phase 10 — Report-back routes.** *Goal:* agents submit reports; employees review. *Files:* ai-org
report routes. *Deps:* P9. *Acceptance:* report → review(accept/revise/reject) → outcome logged.
*Tests:* report lifecycle. *Rollback:* read-only. *Done:* up-flow works; feeds Continuous Improvement.

**Phase 11 — Revenue OS routes.** *Goal:* funnel + daily metrics + briefs. *Files:* revops routes.
*Deps:* P3. *Acceptance:* daily brief, stalled-deal, fastest-path-to-$6k return per business. *Tests:*
rollup + fastest-path determinism. *Rollback:* report-only. *Risks:* pricing change must stay gated
(P5). *Done:* RevOps briefs live.

**Phase 12 — KPI rollups.** *Goal:* department/business/execution scores aggregated. *Files:* rollup
jobs + `execution_scores`/`department_os_kpi_records` writers. *Deps:* P3,P10. *Acceptance:* weekly
scorecards computed; lifecycle actions proposed (gated). *Tests:* scoring math. *Rollback:* disable
job. *Done:* scorecards feed reviews + Mission Control.

**Phase 13 — Orchestrator scheduled jobs.** *Goal:* cadences + nightly passes. *Files:*
`services/orchestrator/*` job registry: daily brief, standups, weekly review, improvement pattern-pass,
KPI rollup, follow-up expiry, capacity check, runway check. *Deps:* P6,P11,P12. *Acceptance:* jobs run
on cron, idempotent. *Tests:* job unit + idempotency. *Rollback:* per-job flag. *Risks:* cost — batch,
no per-minute polling. *Done:* rhythms run unattended.

**Phase 14 — Connector adapters.** *Goal:* real I/O via ConnectionsHub. *Files:* email first
(Gmail/IMAP/Resend-inbound), then Slack/socials/CRM/payments. *Deps:* P5,P8. *Acceptance:* inbound
email → context-scoped inbox_items (Move Mi); outbound send approval-gated. *Tests:* connector smoke +
gate test. *Rollback:* disable connector. *Risks:* secrets — store as references in vault, never in
code. *Done:* one live closed loop (Move Mi email).

**Phase 15 — UI dashboards.** *Goal:* operator-usable surface. *Files:* Next.js app: Mission Control ·
Set-up&Connect · Executive Inbox · Reviews · RevOps · Approvals · Founder Capacity. *Deps:* the routes
above. *Acceptance:* each screen reads live API; approve/act works. *Tests:* e2e happy paths.
*Rollback:* ship screens incrementally behind flags. *Done:* Alyssa can run the business from the UI.

**Phase 16 — QA + observability.** *Goal:* trust the system. *Files:* agent-observability wiring,
structured logs, error capture, audit_log assertions. *Deps:* all. *Acceptance:* every state change
audited; failures alert Mission Control. *Tests:* observability integration. *Rollback:* n/a. *Done:*
traceable, alerting runtime.

**Phase 17 — Deployment hardening.** *Goal:* production-safe. *Files:* env management, rate limits,
backups, RLS audit, secret rotation, cost caps. *Deps:* all. *Acceptance:* RLS audit = 0 tables open;
rate limits on AI + write routes; restore tested. *Tests:* security review + restore drill. *Rollback:*
documented per service. *Done:* hardened, monitored, recoverable.

---

## 37. Architecture Rules (preserved — non-negotiable)

Contracts first · tenant isolation (RLS GUC) · approval-gated execution · business-aware context
loading · no cross-business contamination · deterministic engines before AI calls · cost-controlled
model usage (flag/manual/cache/rate-limit) · **verify-merge, don't rebuild** · no autonomous risky
execution · **Alyssa remains final authority** on money, public content, legal, deploys, pricing.

---

## 38. 10/10 Architecture Completion Checklist

| # | Layer | Definition of 10/10 | State |
|---|---|---|---|
| 1 | **Mission Control** | L0 snapshot + alerts + escalation + daily/weekly summaries composing all engines; read-only except approve/ack/escalate | Contract+table+rules specified (build P6/P15) |
| 2 | **Executive cadence** | Daily brief, standups, weekly/monthly/quarterly/annual, each emitting the 11-field output | Monthly+ live (ReviewCadence); daily/weekly specified (P13) |
| 3 | **Continuous improvement** | Every task → candidate → scored → gated → shipped → changelog | Protocol+table+scoring specified (P10/P13) |
| 4 | **Founder capacity** | Capacity score + work-mode adaptation + do-not-interrupt; cash/legal never suppressed | Engine+table+rules specified (P13 input) |
| 5 | **Execution scoring** | Unified scorecard + lifecycle (promote/retrain/retire), promotions gated | Engine+table specified (P12) |
| 6 | **Revenue OS** | 11-stage funnel + per-business metrics + daily/stalled/fastest-$6k briefs | Extends RevenueCommand; specified (P11) |
| 7 | **Capital allocation** | Profit-First buckets + runway/mode rules; movement recommend-only, Alyssa-approved | Engine+3 tables specified (P12) |
| 8 | **Decision engine** | 13 principle-lenses + decision record + reversibility gate (one-way-door → CEO) | Extends ExpertCouncil; specified (P5/P11) |
| 9 | **Runtime sequencing** | 17 phases with goal/files/deps/acceptance/tests/rollback/risks/done | §36 complete |
| 10 | **Approval gates** | Central middleware blocks money/public/legal/deploy/pricing; default-deny | Specified (P5) |
| 11 | **UI readiness** | Mission Control + Inbox + Connect + Reviews + RevOps + Approvals + Capacity screens | Specified (P15) |
| 12 | **Data persistence** | All priority engines have `@alfy2/db` adapters under RLS | Inbox+memory live; rest specified (P3) |
| 13 | **Connector readiness** | ConnectionsHub adapters; email live first; outbound gated | Specified (P14) |
| 14 | **Observability** | Audit log on every state change; failures alert Mission Control; agent metrics | Specified (P16) |
| 15 | **Security** | RLS audit 0-open, secret references only, rate limits, restore drill, no autonomous risky exec | Specified (P17) |

**Status legend:** "live" = built and persisted; "specified" = contract/table/rules defined in this
blueprint, scheduled in §36. Domain layer (237 tables, 173 engines) is built; the v2 layers above are
**read-models + thin engines + routes on top of it**, not a rebuild.
