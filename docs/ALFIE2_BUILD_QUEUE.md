# Alfie2 — Prioritized Build Queue

> Derived from `ALFIE2_OPERATIONS_ARCHITECTURE.md` §36 (17-phase runtime sequence) + Part II layers.
> Authoritative ordering: §36 wins on conflicts. Every state-changing task inherits the central
> **Approval Gate** (Part I §13) — "Approval required" below flags tasks whose *output actions* touch
> money/public/legal/deploy/pricing, not the build work itself.
> Complexity: **S** ≤ ~1 build session · **M** a few · **L** multi-session.
> Status baseline: 237 live tables, 173 engines, 622 pytest green; runtime (`services/api`,
> `services/orchestrator`) still empty; only memory + inbox persist.

**Global recommended order is the `#` column (1 → 36). Build top-to-bottom; groups can overlap once
their dependencies are met.**

---

## Group 1 — Must build BEFORE UI (runtime foundation)

Nothing renders or runs against the live DB until these exist. This is the critical path.

| # | Task | Owner layer | Package/Service | Dependencies | Risk | Approval req | Acceptance criteria | Complexity |
|---|---|---|---|---|---|---|---|---|
| 1 | Env + live persistence proof | Platform | `packages/config`, `.env` | none | Low | No | `.env` validates; `pnpm db:smoke` round-trips memory+inbox under RLS on live DB | S |
| 2 | Supabase Auth (JWT verify) | Runtime | `services/api/src/auth` | #1 | High | No | Invalid/expired/forged JWT → 401; valid → user id | M |
| 3 | Tenant context middleware (`withTenant` GUC) | Runtime | `services/api/src/middleware`, `@alfy2/db` | #2 | **Critical** | No | Missing context → 0 rows (fail-closed); cross-tenant id denied; isolation test green | M |
| 4 | Generalize `Repository<T>` port + Pg adapters (slice engines) | Data | `packages/db` | #3 | High | No | business_profiles, ai_org, review, revops, capital, mission_control, founder_capacity each round-trip under RLS via guarded `*-db-smoke` | L |
| 5 | API gateway (Hono/Fastify, minimal) | Runtime | `services/api` | #2,#3 | Med | No | Health + 1 real route 200 with auth+tenant middleware | S |
| 6 | Approval Gate middleware (default-deny) | Runtime | `services/api/src/middleware` | #5, persistent-approval | **Critical** | No (gate IS the control) | Money/public/legal/deploy/pricing routes → "approval required" + create approval record; internal drafts pass; gated-route matrix test green | M |
| 7 | Business-profile context loading middleware | Runtime | `services/api`, `BusinessProfileEngine` | #3 | High | No | 11-layer stack built per request; `enforceNoCrossBusiness` throws on mix; banned_language/compliance_caution loaded | M |
| 8 | Executive Inbox routes | Runtime | `services/api`, executive-inbox | #4,#6 | Med | Yes (item actions) | ingest → list → action(approve) round-trips; risky actions gated | S |
| 9 | Delegation packet + report-back routes | Runtime | `services/api`, ai-org | #6,#7 | Med | No | startWork without packet → 409; report → review(accept/revise/reject) logged | M |

---

## Group 2 — Must build for MISSION CONTROL (Layer 0)

The CEO read-model. Monitors/routes/escalates/summarizes; never does department work.

| # | Task | Owner layer | Package/Service | Dependencies | Risk | Approval req | Acceptance criteria | Complexity |
|---|---|---|---|---|---|---|---|---|
| 10 | `mission-control` contract + Pydantic mirror | Mission Control (L0) | `packages/shared`, `workers` | #4 | Low | No | Zod + Pydantic parity; pytest green | S |
| 11 | Migration `mission_control_snapshots` + `mission_control_alerts` (+RLS) | Mission Control | `supabase/migrations` | #10 | Med | No | Applied live; 0 tables without RLS; trigger on alerts | S |
| 12 | `MissionControlEngine.compose()` + alert-rule evaluator | Mission Control | `packages/core/src/mission-control` | #4,#11 | Med | No | Snapshot aggregates live tiles; cash<60d→warn, <30d→critical; approval>24h→escalate; deterministic | M |
| 13 | Execution Score engine + `execution_scores` | Mission Control | `packages/core`, `packages/db`, migration | #4,#9 | Med | Yes (promotions widening agent actions) | Composite score per subject/period; lifecycle action (promote/retrain/retire); promotions create approval item | M |
| 14 | KPI rollups (dept/business/execution) | Mission Control | `packages/core`, orchestrator writer | #9,#13 | Low | No | Weekly scorecards computed; off-target KPIs flagged with owner | M |
| 15 | Continuous Improvement loop (`improvement_candidates`) | Continuous Improvement | `packages/core`, `packages/db`, migration | #9 | Med | Yes (rule/automation changes) | Report → candidate → scored → gated → shipped → changelog; rule-changing candidates gated | M |
| 16 | Review cadence runs (daily brief / weekly exec) read-models | Mission Control | `packages/core/review-cadence`, migration `review_cadence_runs` | #12,#14 | Low | No | Daily brief + weekly summary emit the 11-field output deterministically | M |
| 17 | `GET /mission-control` + alerts/approve/ack/escalate routes | Mission Control | `services/api` | #6,#12 | Med | Yes (approve actions) | Dashboard payload returns real numbers; only write actions are approve/ack/escalate | S |

---

## Group 3 — Must build for REVENUE EXECUTION

Turns the brain into money: funnel, briefs, fastest-path-to-cash, capital discipline, decisions.

| # | Task | Owner layer | Package/Service | Dependencies | Risk | Approval req | Acceptance criteria | Complexity |
|---|---|---|---|---|---|---|---|---|
| 18 | RevOps funnel + `revops_daily_metrics` (extend revenue-command) | RevOps | `packages/shared`, `packages/core/revenue`, migration | #4 | Med | No | 11-stage funnel enum; per-business daily metrics persist; pytest parity | M |
| 19 | RevOps outputs: daily brief · stalled-deal · follow-up queue · offer perf · fastest-path-to-$6k | RevOps | `packages/core`, `services/api` | #18 | Med | Yes (any outbound/pricing) | Each brief returns per business; fastest-path is deterministic (price × close-prob × time-to-cash) | M |
| 20 | Decision Engine record + 13 principle-lenses + reversibility gate (extend expert-council) | Decision | `packages/shared`, `packages/core/expert-council`, migration `decision_records` | #4 | Med | Yes (one-way-door → CEO) | Lenses selected by decision_type; record has risks/upside/downside/assumptions/reversibility/recommendation; irreversible → approval required; no impersonation/quotes | M |
| 21 | Capital Allocation engine (Profit-First buckets, runway, mode) | Capital | `packages/shared`, `packages/core`, migrations `capital_accounts/_allocations/_runway` | #4 | High | **Yes** (all money movement recommend-only, Alyssa executes) | Inflow splits into 9 buckets; emergency/growth mode by runway; transfers surfaced as approvals, never executed | M |
| 22 | Revenue + cash tiles wired into Mission Control | Mission Control | `packages/core/mission-control` | #12,#19,#21 | Low | No | revenue_today, cash, runway, hot opportunities populate from live engines | S |

---

## Group 4 — Must build for CONNECTORS

Real-world I/O. Closes the loop (first: Move Mi email).

| # | Task | Owner layer | Package/Service | Dependencies | Risk | Approval req | Acceptance criteria | Complexity |
|---|---|---|---|---|---|---|---|---|
| 23 | Connector adapter interface (ConnectionsHub runtime) | Connectors | `packages/core/connections`, `services/api` | #6,#7 | Med | Yes (OAuth grants) | Register/resolve connector by scope; secrets stored as references in vault, never in code | M |
| 24 | Email connector — inbound (Gmail/IMAP/Resend-inbound) | Connectors | `services/api`, worker | #23 | High | Yes (OAuth) | Inbound mail → context-scoped `inbox_items` for Move Mi | M |
| 25 | Email connector — outbound (approval-gated send) | Connectors | `services/api` | #6,#24 | High | **Yes** (every send) | Draft created; send blocked pending approval; status callback recorded | M |
| 26 | Connector adapters: Slack · socials · CRM · payments (interface-first, implement on demand) | Connectors | `packages/core/connections` | #23 | Med | Yes | Each registers, ingests to inbox, sends gated; built when a slice needs it | L |

---

## Group 5 — Must build for FOUNDER OPTIMIZATION

Builds the system around Alyssa's capacity.

| # | Task | Owner layer | Package/Service | Dependencies | Risk | Approval req | Acceptance criteria | Complexity |
|---|---|---|---|---|---|---|---|---|
| 27 | `founder-capacity` contract + mirror + `founder_capacity_snapshots` | Founder | `packages/shared`, `workers`, migration | #4 | Low | No | Zod+Pydantic parity; table live under RLS | S |
| 28 | `FounderCapacityEngine` (record · score · mode) + daily check-in input | Founder | `packages/core/founder-capacity` | #27 | Low | No | capacity_score 0–100; recommended_mode (protect/normal/high/recovery); inputs from check-in + meeting load + approval backlog | M |
| 29 | Work-mode adaptation wired into Mission Control | Founder | `packages/core/mission-control` | #12,#28 | Med | No | Overloaded → batch approvals/suppress non-critical/protect deep work; high-capacity → surface strategy; **cash/legal/critical never suppressed** | M |
| 30 | Founder capacity UI modules (score, load, recovery, mode, do-not-interrupt) | UI | UI app | #29 | Low | No | Toggle + gauges render live; mode drives what Mission Control shows | S |

---

## Group 6 — Later enhancements (post first usable slice)

Required for production, but after the first working Mission-Control + Move-Mi-email loop. **#34 and
#35 are pre-production gates — ship before exposing to real users/data even though they're "later."**

| # | Task | Owner layer | Package/Service | Dependencies | Risk | Approval req | Acceptance criteria | Complexity |
|---|---|---|---|---|---|---|---|---|
| 31 | Orchestrator scheduled jobs (all cadences + nightly passes) | Runtime | `services/orchestrator` | #14,#16,#19 | Med | No | Daily/weekly/monthly cadences, improvement pass, KPI rollup, follow-up expiry, capacity+runway checks run on cron, idempotent; cost-batched (no per-minute polling) | M |
| 32 | Repository adapters for remaining ~169 engines | Data | `packages/db` | #4 | Low | No | Mechanical rollout of the #4 pattern; each engine persists; smokes green | L |
| 33 | UI dashboards (Mission Control · Connect · Inbox · Reviews · RevOps · Approvals · Capacity) | UI | UI app (Next.js) | groups 1–5 routes | Med | Yes (approve actions) | Each screen reads live API; approve/act works; shipped behind flags | L |
| 34 | QA + observability (audit log, structured logs, agent metrics, failure→Mission Control) | Observability/Sec | `services/api`, agent-observability | all runtime | Med | No | Every state change audited; failures alert L0; traces available | M |
| 35 | Deployment hardening (RLS audit, secret rotation, rate limits, backups/restore drill, cost caps) | Observability/Sec | infra, `services/*` | all | High | No | RLS audit = 0 open tables; rate limits on AI + write routes; restore drill passes; security review clean | M |
| 36 | Deferred intelligence wiring (Knowledge Ops / Lifecycle+Growth / Market Intel / Oversight routes + AEO live-research feeder) + specialist & C-suite role-card seeding | Various | `packages/db`, `services/api` | #4,#31 | Low | No | The 4 built engines get Pg adapters + routes + UI tabs; AEO scoring fed by live research; specialist/C-suite cards seeded | M |

---

## Summary — what unblocks what

- **Group 1 (1–9)** unblocks everything; **3 and 6 are the two non-negotiable security gates** (tenant
  isolation + approval gate). Do not proceed past them with any state-changing route open.
- **Group 2 (10–17)** is the first thing Alyssa *sees* (Mission Control) — build right after Group 1.
- **Group 3 (18–22)** is the first thing that makes *money* — parallelizable with Group 2 once #4 lands.
- **Group 4 (23–26)** closes the real-world loop; **24/25 deliver the first live Move Mi slice.**
- **Group 5 (27–30)** makes the system adapt to Alyssa; small and high-leverage, can slot in after L0.
- **Group 6 (31–36)** industrializes + hardens; **34/35 gate production exposure.**

**First end-to-end milestone (smallest valuable loop):** #1 → #9 → #10–12,#17 → #18–19 → #23–25 →
#27–29 → #33 (Mission Control + Move Mi email + capacity-aware, approval-gated, business-scoped).
