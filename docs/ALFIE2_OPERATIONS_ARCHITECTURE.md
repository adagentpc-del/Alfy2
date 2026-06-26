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
  shared/      168 Zod contracts — the only legal cross-boundary surface
  core/        169 engine modules — deterministic domain logic (in-memory reference stores)
  db/          @alfy2/db — Postgres adapters (pg) with withTenant() RLS-GUC; pg lives ONLY here
  config/      layered env loader + Zod validation (boot-fails on invalid/missing)
  agents-sdk/  agent runtime primitives
services/
  api/         [SCAFFOLD] HTTP gateway — auth, tenant context, Security Gate, endpoints
  orchestrator/[SCAFFOLD] scheduled loops (goal recalc, follow-up expiry, reviews, etc.)
workers/       Python — Pydantic mirrors of the contracts + contract tests (599 passing)
infra/ + supabase/  234 migrations (canonical SQL); GitHub→Supabase deploy
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

## 16. Database Schema (220 live tables, grouped)

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
  B1  Repository adapters for the remaining ~165 engines (mechanical; one pattern).
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
