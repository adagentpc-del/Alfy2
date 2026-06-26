# Alfie2 Master Control (AMC)

**The permanent front page of Alfie2.** Executive navigation, orchestration, and index for every
document, architecture component, specification, AI department, release, business, and operating system.
Nothing in Alfie should exist without being discoverable from here.

**Version 1.0 · 2026-06-26 · Owner: Alyssa DelTorre (CEO)**

> This is the navigation layer. It does not duplicate the Constitution, Architecture, Engineering
> Standards, Build Queue, or Release Plan. It points to them and shows current state. Read order for a
> new engineer: this document first, then the Constitution, then the Architecture.

---

## The Five Operating Systems (System of Systems)

Alfie is not one system; it is five interacting operating systems beneath one Constitution. Each solves
a distinct problem and references the others rather than overlapping.

| System | Purpose | Primary document | Status |
|---|---|---|---|
| **AOS** — Alfie Operating System | Runs the AI organization (engines, departments, chain of command, runtime) | `ALFIE2_OPERATIONS_ARCHITECTURE.md` | Domain built; runtime pending |
| **AESL** — Engineering Specification Library | Governs how systems are specified and built | `ALFIE2_BUILD_QUEUE.md` + spec template (Standards §19) | Active |
| **AMC** — Master Control | Navigates and orchestrates the whole platform | this document | Active |
| **ADOS** — Documentation Operating System | Governs knowledge and documentation | `ALFIE_DOCUMENTATION_OPERATING_SYSTEM.md` | Active |
| **Mission Control** | Operates the business day-to-day (executive runtime) | AOS §28 | Specified; build in Release 1 |

**Above all five:** `ALFIE_CONSTITUTION.md` governs. Where any system conflicts with it, the
Constitution wins.

---

# Executive Summary

| Field | Value |
|---|---|
| Current architecture version | v1.0 (frozen) |
| Current release | Release 0 — Foundations (planning complete; build pending) |
| Current sprint | Build Queue Group 1 (runtime foundation, tasks #1–#9) |
| Current priorities | 1) Live persistence proof · 2) Supabase Auth + tenant isolation · 3) API gateway + approval gate |
| Current blockers | Runtime not yet started; 12 commits pending Push to origin; `.env` live credentials needed for task #1 |
| Current risks | Tenant-GUC omission on a route (mitigated by isolation test); scope creep during freeze; secret handling at connector stage |
| Current KPIs | 237 live tables (0 without RLS) · 173 engines · 172 contracts · 622 tests green · runtime ~5% · revenue $0 (pre-slice) |
| Active businesses | 5 Tier-1 profiles seeded (pre-revenue): Alfie2, Move Mi, Divini Procure, Divini Partners, StrataLogic |
| AI departments | 15 (seeded) |
| AI employees | 94 (seeded scorecards) |
| Specialist agents | Pattern live (no work without a delegation packet); standard specialist roster not yet seeded |

---

# Constitution

| Field | Value |
|---|---|
| Link | `ALFIE_CONSTITUTION.md` |
| Version | 1.0 |
| Status | Ratified · ACTIVE |
| Last updated | 2026-06-26 |
| Authority | Alyssa DelTorre (CEO), sole amendment authority |

---

# Architecture

All components live in `ALFIE2_OPERATIONS_ARCHITECTURE.md` (AOS). Status legend: **Live** = built and
persisted · **Specified** = designed in the architecture, scheduled in the build queue.

| Component | Section | Status | Version | Owner | Dependencies | Related specs |
|---|---|---|---|---|---|---|
| Master Architecture | full doc | Live (design) | 1.0 | Chief Systems Architect | — | all |
| Mission Control (L0) | §28 | Specified | 1.0 | Chief of Staff | runtime, read-models | AESL Group 2 |
| Runtime / API | §3, §36 | Specified | 1.0 | Chief Systems Architect | Supabase Auth | AESL Group 1 |
| Database | §16 | Live | 1.0 | Chief Data Architect | — | migrations 0001–0238 |
| Security | §11, §13 | Live (RLS) / Specified (auth+gate) | 1.0 | Chief Security & Compliance Officer | runtime | AESL #2,#3,#6 |
| Departments | §4 | Live | 1.0 | COO | — | department-os |
| AI Organization | §5–§9 | Live | 1.0 | Executive Governor | — | ai-org |
| Business Profiles | §19 | Live | 1.0 | COO | — | business-profile |
| Context Loading | §10 | Live | 1.0 | Chief Systems Architect | business profiles | business-profile |
| Revenue OS | §33 | Live (engine) / Specified (RevOps rollup) | 1.0 | CRO | runtime | AESL #18–#22 |
| Founder OS | §31 | Specified | 1.0 | Chief of Staff | Mission Control | AESL #27–#30 |
| Decision Engine | §35 | Live (expert-council) / Specified (decision record) | 1.0 | Executive Governor | runtime | AESL #20 |
| Capital Allocation | §34 | Live (allocator) / Specified (Profit-First buckets) | 1.0 | CFO | runtime | AESL #21 |
| Execution Verification | §14 | Live | 1.0 | Chief Systems Architect | approval gate | build-from-brainstorm |
| Connectors | §15 | Specified | 1.0 | Chief Systems Architect | approval gate, context | AESL #23–#26 |
| Knowledge Graph | §12, §16 (Part I) | Live | 1.0 | Chief Data Architect | — | knowledge-graph, source-of-truth |
| Review System | §20, §29 | Live (monthly+) / Specified (daily/weekly) | 1.0 | Chief of Staff | runtime | review-cadence |
| Approval Gates | §13 | Live (policy) / Specified (middleware) | 1.0 | Chief Security & Compliance Officer | runtime | AESL #6 |
| Continuous Improvement | §30 | Live (engines) / Specified (candidate loop) | 1.0 | CODO | report-back | AESL #15 |
| Execution Score | §32 | Specified | 1.0 | COO | report-back | AESL #13 |

---

# Engineering Specifications Library (AESL)

Specifications are the build-queue tasks in `ALFIE2_BUILD_QUEUE.md`, governed by the spec template in
`ALFIE_ENGINEERING_STANDARDS.md` §19. IDs are stable. Completion reflects live runtime, not design.

| Spec ID | Title | Owner | Ver | Status | Dependencies | Priority | Completion |
|---|---|---|---|---|---|---|---|
| AESL-001 | Env + live persistence proof | Platform | 1.0 | Ready | — | P0 | 20% |
| AESL-002 | Supabase Auth | Runtime | 1.0 | Ready | 001 | P0 | 0% |
| AESL-003 | Tenant context middleware | Runtime | 1.0 | Ready | 002 | P0 | 0% |
| AESL-004 | Repository port + Pg adapters (slice) | Data | 1.0 | Ready | 003 | P0 | 15% |
| AESL-005 | API gateway | Runtime | 1.0 | Ready | 002,003 | P0 | 0% |
| AESL-006 | Approval gate middleware | Runtime | 1.0 | Ready | 005 | P0 | 0% |
| AESL-007 | Business-profile context middleware | Runtime | 1.0 | Ready | 003 | P0 | 0% |
| AESL-008 | Executive Inbox routes | Runtime | 1.0 | Ready | 004,006 | P0 | 30% |
| AESL-009 | Delegation + report-back routes | Runtime | 1.0 | Ready | 006,007 | P1 | 0% |
| AESL-010–017 | Mission Control (contract, tables, engine, alerts, exec-score, KPI rollup, improvement loop, cadence runs, routes) | Mission Control | 1.0 | Specified | 004,009 | P1 | 5% |
| AESL-018–022 | Revenue OS (funnel, metrics, briefs, decision engine, capital allocation, tiles) | RevOps / Capital / Decision | 1.0 | Specified | 004 | P1 | 10% |
| AESL-023–026 | Connectors (interface, email in/out, Slack/social/CRM/payments) | Connectors | 1.0 | Specified | 006,007 | P1 | 0% |
| AESL-027–030 | FounderOS (capacity contract, engine, adaptation, UI) | Founder | 1.0 | Specified | 004,012 | P1 | 0% |
| AESL-031–036 | Later (orchestrator jobs, mass repo coverage, UI dashboards, observability, hardening, intelligence wiring) | Various | 1.0 | Specified | groups 1–5 | P2 | 0% |

---

# Build Queue

Authoritative detail in `ALFIE2_BUILD_QUEUE.md`.

- **Current sprint:** Group 1 — Foundations (AESL-001 to 009).
- **Upcoming sprint:** Group 2 — Mission Control (AESL-010 to 017), parallelizable with Group 3 RevOps
  briefs once AESL-004 lands.
- **Blocked:** none in code (all of Group 1 is ready); the whole queue is blocked only by "start
  building" and the `.env` credentials for AESL-001.
- **Completed:** domain layer (172 contracts, 173 engines, 237 tables); inbox + memory persistence.
- **Critical path:** 001 → 002 → 003 → 004 → 005 → 006 → (007) → 008/009.
- **Parallel work:** read path (Mission Control) and write path (RevOps brief + email connector) after
  Group 1; FounderOS capacity slots in beside Mission Control.
- **Technical debt:** runtime in-memory stores remain until Pg adapters roll out (AESL-032); tracked,
  not silent.

---

# Release Roadmap

Detail in `ALFIE_RELEASE_PLAN.md`.

| Release | Name | Status | Completion | Go/No-Go | Owner | Dependencies |
|---|---|---|---|---|---|---|
| R0 | Foundations | In scope (build pending) | 10% | G0: isolation + gate green | Chief Systems Architect | — |
| R1 | Mission Control | Specified | 5% | — | Chief of Staff | R0 |
| R2 | Executive Inbox | Specified | 25% | — | COO | R0 |
| R3 | Move Mi (first slice) | Specified | 0% | **G3: freeze exit** | CRO + Connectors | R0–R2 |
| R4 | Divini Procure | Planned | 0% | — | COO | R3 |
| R5 | FounderOS | Specified | 0% | — | Chief of Staff | R1 |
| R6 | Revenue OS | Specified | 10% | G6: money recommend-only | CRO + CFO | R3–R4 |
| R7 | Connectors | Specified | 0% | — | Chief Systems Architect | R3 |
| R8 | Public Beta | Planned | 0% | G8: hardening met | Chief Security & Compliance Officer | R0–R7 |
| R9 | Enterprise | Planned | 0% | G9: isolation at scale | Executive Governor | R8 |
| R10 | Self-Optimizing Org | Planned | 0% | — | CODO | R1–R9 |

---

# Businesses

All five Tier-1 profiles are seeded; none are live on the runtime yet (pre-slice), so revenue is $0
until Release 3. Source of truth for profiles: `business-profile` engine.

| Business | Profile | Status | Revenue | Current goal | AI departments | AI employees | Agents | Active projects | KPIs |
|---|---|---|---|---|---|---|---|---|---|
| Alfie2 | seeded | Building (the platform itself) | n/a | Ship first slice | all 15 | as assigned | per packet | runtime build | tables/engines/tests green |
| Move Mi | seeded | First revenue slice (R3) | $0 (pre-live) | First live email loop + bookings | Revenue, Ops, Growth, CS | assigned | per packet | R3 | bookings, close rate, response time |
| Divini Procure | seeded | Queued (R4) | $0 | Onboard onto proven runtime | Revenue, Ops | assigned | per packet | R4 | vendor pipeline, bid throughput |
| Divini Partners | seeded | Queued | $0 | Partner deal flow | Revenue, Growth | assigned | per packet | post-R4 | partner pipeline |
| StrataLogic | seeded | Queued (compliance-sensitive) | $0 | Clinician-facing readiness | Product, Legal/Compliance, Data | assigned | per packet | post-R6 | adoption, compliance posture |

> StrataLogic carries health/compliance cautions in its profile; every action inherits them.

---

# AI Organization

Source of truth: `ai-org` engine (78 role cards) and `department-os` (15 departments, 94 employees).

| Layer | Roles | Status |
|---|---|---|
| CEO | Alyssa DelTorre (final authority) | Active |
| Executive | Executive Governor · Chief of Staff · Portfolio Strategist | Live (cards) |
| Department Leaders | CRO · COO · CPO · Chief Systems Architect · Chief Security & Compliance Officer · CFO · Chief Data Architect · Hiring Strategist · Fundraising Strategist · R&D Lead · Creative Director · CODO | Live (cards) |
| AI Employees | 63 role-carded across 15 departments (94 with department-os scorecards) | Live (cards) |
| Specialist Agents | research/copy/email/social/SEO/CRM/GitHub/Supabase/QA/etc. | Pattern live; roster not yet seeded |

**Rules (live):** no work without a delegation packet; report-back and review; escalation ladder;
permission scopes; promotions that widen actions are approval-gated. Chain of command and responsibility
flow are defined in AOS §6–§9.

---

# Connectors

Source of truth: `connections` (ConnectionsHub) engine. No adapters are live yet; first is email at
Release 3.

| Connector | Status | Configured | Approval required |
|---|---|---|---|
| Email | Specified (R3, first) | No | Yes (OAuth + every send) |
| Slack | Specified (R7) | No | Yes |
| GitHub | Specified | No | Yes (writes) |
| Supabase (admin) | Live for migrations via MCP; app adapter specified | Partial | Yes |
| Payments | Specified (R7) | No | Yes (all money actions) |
| CRM | Specified (R7) | No | Yes (writes) |
| Analytics | Specified (R7) | No | No (read) / Yes (config) |
| Social | Specified (R7) | No | Yes (publish) |

---

# Knowledge

Source of truth: `knowledge-graph`, `source-of-truth`, `knowops` (Knowledge Ops), `expert-council`.

| Asset type | Home | Status |
|---|---|---|
| SOPs | continuous-improvement output + KB | Specified loop (AESL-015) |
| Templates | knowledge vault | Live (engine) |
| Prompts | prompt packs (build-from-brainstorm) | Live |
| Algorithms | engine logic (private; not in public copy) | Live |
| Frameworks | expert-council library | Live |
| Decision trees | decision engine / oversight | Live (oversight) / Specified (decision record) |
| Playbooks | knowledge-to-action | Live |
| Source of truth | source-of-truth engine | Live |

> Proprietary algorithm mechanics are never exposed in public or investor-facing copy (Constitution
> §20, §21).

---

# Founder Dashboard

Source of truth: `FounderCapacityEngine` (specified, R5) surfaced through Mission Control (R1).

| Module | Status |
|---|---|
| Current capacity | Specified (R5) |
| Decision queue | Specified (decision engine + Mission Control) |
| Approval queue | Specified (gate + Mission Control, R1) |
| Focus mode / do-not-interrupt | Specified (R5) |
| Strategic priorities (top 3) | Specified (R1) |
| Open loops | Specified (R1) |
| Recovery warnings | Specified (R5) |

---

# Metrics (current completion)

| Dimension | % | Note |
|---|---|---|
| Architecture | 100% | Design complete and frozen at v1.0 |
| Engineering (domain) | ~95% | 173 engines built; runtime engines pending |
| Runtime | ~5% | Only inbox + memory persist; no API/auth/gate yet |
| Testing | ~70% | 622 contract tests + smokes green; runtime/integration tests pending |
| Security | ~50% | RLS live on all tables; auth + gate enforcement pending |
| Revenue (live) | 0% | No business live until R3 |
| Documentation | ~90% | Constitution, AOS, Standards, Build Queue, Release Plan, AMC, ADOS in place |
| Automation | ~5% | Orchestrator not yet built |
| Founder optimization | ~10% | Design complete; capacity engine pending (R5) |
| Mission Control | ~5% | Specified; build at R1 |

---

# Change Log

Detail in `docs/CHANGELOG.md` and the live-state memory. Highlights:

- **Architecture:** v1.0 frozen; Part II enterprise layers added and reconciled; counts corrected to
  237 tables / 173 engines / 622 tests.
- **Specs:** AESL established from the 36-task build queue; spec template ratified in Standards.
- **Releases:** R0–R10 defined; R3 set as freeze-exit milestone.
- **Major decisions:** Architecture Freeze v1.0 declared; Constitution ratified as supreme document;
  five-operating-systems model named and mapped here.

---

# Future Roadmap

- **Near term:** ship R0–R3 (runtime, Mission Control, inbox, Move Mi slice). Lift the freeze.
- **Mid term:** R4–R7 (second business, FounderOS, Revenue OS, connectors). Multi-business, money
  discipline, broad I/O.
- **Long term:** R8–R10 (public beta, enterprise, self-optimizing organization). Scale and compounding
  leverage, within the gates.
- **Moonshots:** the broader venture ecosystem (additional consumer and B2B platforms) onboarded onto
  the proven runtime as configuration, not rebuilds.
- **Research:** AEO / AI-search visibility live-research feeder; advanced execution-scoring calibration;
  deeper decision-lens rubrics. All deferred until the runtime is proven and the freeze is lifted.

---

# Navigation Rules

1. **Every document registers here.** A new document is not "real" until it appears in this Master
   Control with an owner and a status.
2. **Every specification references this document** and its governing Constitution.
3. **Every release updates this document** (status, completion, gates).
4. **Every completed build updates this document** (metrics, AESL completion, change log).
5. **Nothing is production-ready unless reflected here.** If it is not discoverable from Master Control,
   it does not ship.
6. **Truth over optimism.** Statuses and percentages reflect the live system, not intentions. Stale
   entries are defects, corrected in place.

---

*Master Control is the front page of Alfie2. It governs navigation and orchestration beneath the
Constitution and stays consistent with the Architecture, Engineering Standards, Build Queue, Release
Plan, and ADOS. Keep it current: it is only useful if it is true.*
