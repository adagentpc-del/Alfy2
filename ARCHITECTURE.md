# Alfy² — System Architecture

This document describes the foundational architecture. It defines the *shape* of the system,
the contracts between parts, and the rules that keep it modular and explainable. It does **not**
describe business features — those are added later, on top of this foundation.

---

## 1. Architectural goals (mapped to principles)

| Principle | Architectural mechanism |
|---|---|
| Modular | Every capability is a **Module**; every executor is an **Agent**. Both are registered, never hard-wired. |
| Replaceable | Modules/agents communicate only through versioned **contracts** in `packages/shared`. No direct imports across boundaries. |
| Explainable | Every action returns a **Signal → Action** envelope: *what changed, why it matters, what to do next*. |
| Human-gated | The **Approval Gate** intercepts any action flagged `irreversible` before execution. |
| Historical | Append-only **Event Log** + **Decision Log** in Postgres; nothing is silently overwritten. |
| Personalizing | A **Memory/Profile** store accumulates operator context and feeds the planner. |
| Productizable | Strict tenant scoping from day one (`tenant_id` on every row) so single-operator → multi-tenant SaaS (FounderOS) is a config change, not a rewrite. |

---

## 2. Layered view

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENTS (future)   FounderOS web app · mobile · CLI · API consumers   │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  HTTP / auth (Supabase JWT)
┌───────────────────────────────▼──────────────────────────────────────┐
│  SERVICE LAYER (TypeScript)                                            │
│  ┌───────────────┐        ┌───────────────────────────────────────┐  │
│  │ services/api  │──────▶ │ services/orchestrator                  │  │
│  │ (gateway,     │        │  • Planner   • Approval Gate           │  │
│  │  authn/z,     │        │  • Dispatcher• Signal→Action assembler │  │
│  │  rate limit)  │        │  • Event/Decision log writer           │  │
│  └───────────────┘        └───────────────┬───────────────────────┘  │
└──────────────────────────────────────────│──────────────────────────┘
                                            │  Agent Task contract
                                            │  (HTTP now; queue-ready)
┌───────────────────────────────────────────▼──────────────────────────┐
│  AGENT LAYER (Python workers)                                         │
│  workers/  one replaceable unit per agent family                      │
│  reads task → does work → returns Signal→Action result. No DB writes  │
│  except through the core's provided write-back contract.              │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  Repository contracts
┌───────────────────────────────▼──────────────────────────────────────┐
│  PLATFORM LAYER (Supabase / Postgres)                                 │
│  tenants · events (append-only) · decisions · approvals · memory ·    │
│  module_registry · agent_registry · ai_cache · audit_log · storage    │
└──────────────────────────────────────────────────────────────────────┘
```

**Dependency rule:** arrows point *down only*. The platform never imports the service layer;
agents never import the orchestrator; clients never reach the platform directly.

---

## 3. Core abstractions

### 3.1 Module
A domain capability (e.g. `finance`, `health`). A Module declares:
- `manifest` — id, version, owner, the **capabilities** it offers, and the **agents** it needs.
- `handlers` — pure functions that translate an operator intent into one or more **Plans**.
- It owns no infrastructure directly; it requests work through contracts.

Modules live in `modules/<name>/`. They are registered at boot via the **Module Registry**.
Removing a module = deleting its folder + its registry row. Nothing else breaks.

### 3.2 Agent
An executor that performs one kind of work (research, draft, classify, summarize, fetch).
- Lives in `workers/<agent_family>/`.
- Implements the **Agent Task contract**: receives a `Task`, returns a `SignalToAction` result.
- Is **stateless** between tasks and **side-effect-free** except via returned actions.
- Declared in the **Agent Registry**; swapped by changing the registry pointer.

### 3.3 Signal → Action envelope
The universal output shape. Every agent and every module action returns:

```jsonc
{
  "what_changed": "string — the observed signal",
  "why_it_matters": "string — interpreted significance",
  "next_actions": [ { "label": "...", "reversible": true, "payload": {} } ],
  "confidence": 0.0,            // 0..1
  "evidence": [ /* source refs */ ],
  "explanation": "string — plain-language rationale (always present)"
}
```

This is what makes the system explainable by construction: no action exists without a rationale.

### 3.4 Approval Gate
Before the Dispatcher executes any `next_action` with `reversible: false`, it is queued in the
`approvals` table and **execution halts** until a human approves or rejects. Reversible actions
may auto-execute per policy (still logged).

### 3.5 Event Log & Decision Log
- **Event Log** — append-only record of everything that happened (inputs, agent calls, results).
- **Decision Log** — the planner's choices and their rationale, linked to events.
These give the system its memory of *what was done and why*, and are the substrate for learning.

### 3.6 Memory / Profile — the Memory Engine
Alfy²'s permanent brain: a durable, tenant-scoped knowledge graph of everything the operator cares
about (people, companies, projects, meetings, vehicles, homes, doctors, contracts, subscriptions,
health history, decisions, lessons, and more). Every memory carries importance, confidence,
last-used, source, keywords, and typed relationships to other memories. The engine provides
retrieval (relevance × importance × confidence × recency), reinforcement-on-use, updating,
superseding, linking/traversal, and pruning — all deterministic (no AI). It lives in
`packages/core/memory` behind a repository port; the Planner reads it to personalize plans, and it is
written through an explicit, audited path. Full design: [`docs/MEMORY_ENGINE.md`](./docs/MEMORY_ENGINE.md)
and [`docs/adr/ADR-0002`](./docs/adr/ADR-0002-memory-engine.md).

---

### 3.7 Decision Engine
The triage cortex between raw input and the orchestration loop. It classifies any input
(business/personal/health/finance/relationship/idea/learning/risk/opportunity — multi-label) and
scores urgency, importance, difficulty, effort, revenue impact, and risk, then derives required
approvals, recommended agents, a recommended deadline, and automation opportunities — returning a
structured, explainable `Decision`. Deterministic by default, behind a swappable classifier port (an
AI classifier can replace the rule classifier later via the gated AI Gateway). Its routing fields
feed the rest of the system: `recommended_agents` are Agent Registry keys, `required_approvals` feed
the Approval Gate, and a `Decision` can be remembered as a `decision`-kind memory. Full design:
[`docs/DECISION_ENGINE.md`](./docs/DECISION_ENGINE.md), [`docs/adr/ADR-0003`](./docs/adr/ADR-0003-decision-engine.md).

### 3.8 Chief of Staff — the executive layer
Sits above the engines and gives the operator a single executive view. It triages inputs through the
Decision Engine, reads context from the Memory Engine via a **non-mutating `peek`**, and assembles a
structured briefing covering daily priorities, revenue focus, calendar/meeting prep, follow-ups, risk
alerts, blocked projects, personal reminders, an energy plan, a decision queue, and a dashboard.
**It coordinates work; it never executes it** — it holds no Dispatcher, no AI Gateway, and no memory
write access, so it can only recommend, route, and queue. Full design:
[`docs/CHIEF_OF_STAFF.md`](./docs/CHIEF_OF_STAFF.md), [`docs/adr/ADR-0004`](./docs/adr/ADR-0004-chief-of-staff.md).

### 3.9 Agent Factory — self-extension
Lets the system grow itself. It watches Decision Engine output for a **recurring responsibility** and
recommends a dedicated agent. Generation is **approval-gated**: it drafts an un-approved blueprint, and
only after the operator approves does it materialize the full agent (folder, config, instructions,
memory scope, permissions, tools, success metrics, dashboard card, task queue, tests, docs) and
register it. Side effects flow only through ports — a `FileWriter` for disk and the Agent Registry for
registration — so the kernel stays infra-free. Registering the new `AgentRegistration` makes the agent
**immediately resolvable by the Dispatcher**. Full design: [`docs/AGENT_FACTORY.md`](./docs/AGENT_FACTORY.md),
[`docs/adr/ADR-0005`](./docs/adr/ADR-0005-agent-factory.md).

### 3.10 Business Template — same framework, isolated data
Every business the operator runs is instantiated from one canonical, versioned `BUSINESS_TEMPLATE`
defining twelve standard departments (CEO, Operations, Sales, Marketing, Finance, Legal, Customer
Success, Projects, Product, Analytics, Deployment, Automation). `BusinessFactory.create()` gives each
business the **same framework** while assigning a unique `business_id` and `data_namespace` and
deep-cloning the shared specs, so its **data is isolated**. Departments reuse existing constructs
(memory scope, KPIs as success metrics, dashboard cards, default agents); the `automation` department
ties into the Agent Factory. Persistence carries `business_id` on every row on top of tenant RLS. Full
design: [`docs/BUSINESS_TEMPLATE.md`](./docs/BUSINESS_TEMPLATE.md), [`docs/adr/ADR-0006`](./docs/adr/ADR-0006-business-template.md).

### 3.11 Personal OS — the life layer
Gives the operator's personal life the same "never repeat yourself" intelligence across twelve modules
(Vehicles, Travel, Appointments, Shopping, Pets, Home, Insurance, Bills, Maintenance, Health, Goals,
Relationships). Built on the Memory Engine: `resolve()` reuses a known entity or returns a single
ask-once `InfoRequest`; `remember()` writes it forever and upserts (never duplicates); `prepare()`
auto-assembles everything known for next time. Reads use the non-mutating `peek`. Most entities map to
existing memory kinds (a dealership is a `company`, insurance a `contract`); pets/travel/goals use the
added `pet`/`trip`/`goal` kinds. Full design: [`docs/PERSONAL_OS.md`](./docs/PERSONAL_OS.md),
[`docs/adr/ADR-0007`](./docs/adr/ADR-0007-personal-os.md).

### 3.12 Idea Builder — 0→1, gated on approval
Launched by the phrase "I have an idea." It classifies the idea (Decision Engine), generates a complete
fifteen-section workup (market research, competitors, pricing, offer, positioning, MVP, database, API
needs, required agents, marketing, SEO, launch, monetization, risks, recommendation), captures it
(Memory Engine, kind `idea`), and **stops** — `status: awaiting_approval`, `approved: false`. It never
begins building: `handoff()` throws `IdeaApprovalError` unless approved, and even then only returns the
*plan* of what would be built. Deterministic by default; research sections are framed as hypotheses.
Full design: [`docs/IDEA_BUILDER.md`](./docs/IDEA_BUILDER.md), [`docs/adr/ADR-0008`](./docs/adr/ADR-0008-idea-builder.md).

### 3.13 Pattern Engine — self-awareness
Observes a window of behavioral signals (how you work, what you avoid, when you perform best, energy,
stress, and follow-up/sales/launch/meeting/decision habits), detects patterns and bottlenecks, and
recommends automations, new agents, and workflow improvements. Two invariants enforced by
construction: it is **advisory only** — it holds no write/dispatch ports, every report is
`advisory_only: true`, and it never modifies behavior — and it **always explains**, with required,
evidence-backed explanations on every pattern, bottleneck, and recommendation. Recommended agents feed
the Agent Factory; meeting fixes reference the Chief of Staff. **v2** widens the observed signals to
fourteen (adding `focus`, `health`, `calendar`, and `productivity`) and enriches the report with
`strengths`, `repeating_mistakes`, `successful_habits`, and `schedule_recommendations` (analyzers in
`insights.ts`), preserving both invariants. Full design:
[`docs/PATTERN_ENGINE.md`](./docs/PATTERN_ENGINE.md), [`docs/adr/ADR-0009`](./docs/adr/ADR-0009-pattern-engine.md).

### 3.14 Executive Inbox — the single entry point
The primary interaction surface. Anything (voice notes, screenshots, PDFs, emails, GitHub links,
receipts, contracts, business cards, text…) is dropped into one place and `process()` returns a fully
routed `ProcessedInboxItem`: identified, classified into one of fourteen categories, matched to an
existing business and owner, linked to existing memories, turned into tasks when appropriate, checked
for missing info, matched to agents, saved as reusable memory, and gated for approval only when
necessary — with a unique id, timestamp, source, confidence, urgency, and next action. It composes the
Decision and Memory engines and the approval gate; it adds only item-type detection and category
classification. The operator never decides where something belongs. Full design:
[`docs/EXECUTIVE_INBOX.md`](./docs/EXECUTIVE_INBOX.md), [`docs/adr/ADR-0011`](./docs/adr/ADR-0011-executive-inbox.md).

### 3.15 Model Router & Connector Registry — provider/integration independence
**Model Router:** Alfy2 never depends on a single AI provider. Models are registry descriptors (data,
not an enum) scored per task type; `route()` returns the best model and a **cross-provider fallback
chain**, and the AI Gateway executes the chosen model. Future models register without code changes.
**Connector Registry:** integrations are modular and never hard-coded — each connector is a descriptor
with free-text `kind`/`category` carrying authentication, permissions, risk level, allowed actions, the
businesses using it, health status, and last sync. Blueprints install known connectors per tenant;
arbitrary future/MCP connectors register directly. Both are seeded with data and extended with data.
Full design: [`docs/MODEL_ROUTER.md`](./docs/MODEL_ROUTER.md), [`docs/CONNECTOR_REGISTRY.md`](./docs/CONNECTOR_REGISTRY.md),
[`docs/adr/ADR-0012`](./docs/adr/ADR-0012-router-and-connectors.md).

### 3.16 GitHub Intelligence System — vet repos, never execute
Repositories are never trusted automatically and **nothing is ever executed**. `scan()` statically
analyzes provided metadata + file content (no shell/eval/network/install), evaluates ten dimensions,
runs an eight-class security review, and returns SAFE / NEEDS REVIEW / DO NOT USE. The no-execution
guarantee is in the contract (`executed` is a literal `false`) and the database (an `executed = false`
CHECK). Safe repos get a business case (applications, benefiting businesses, roadmap, agents, effort,
ROI); `approve()` stores them in the tenant-scoped, SAFE-only Asset Library. Full design:
[`docs/GITHUB_INTELLIGENCE.md`](./docs/GITHUB_INTELLIGENCE.md), [`docs/adr/ADR-0013`](./docs/adr/ADR-0013-github-intelligence.md).

### 3.17 Global Asset Library — every asset, globally searchable, permission-aware
One tenant-scoped catalog of every business's assets across 24 types (logos, brand guides, decks,
contracts, NDAs, SOPs, templates, landing pages, automations, GitHub repos, API keys, product specs,
media, training, pricing, vendor/customer lists, campaigns). Each asset carries owner, business,
version, relationships, tags, status, approval, location, usage history, and search keywords. `search()`
ranks **across all businesses** in a tenant and then **filters to what the requesting principal may
see** — private assets to their owner/elevated roles, sensitive assets (e.g. API keys) to elevated
roles only — so global discovery never leaks gated assets. Reuses the tenancy roles via an injected
resolver; stores `location` references, never payloads or secrets. Full design:
[`docs/GLOBAL_ASSET_LIBRARY.md`](./docs/GLOBAL_ASSET_LIBRARY.md), [`docs/adr/ADR-0014`](./docs/adr/ADR-0014-global-asset-library.md).

### 3.18 Enterprise Security — the chokepoint every action passes through
The **Security Gate** is the single point through which every action flows: `policy.ts` applies
deterministic rules, and the gate returns an explainable `SecurityDecision` (allow, require approval, or
deny). The posture is **least privilege everywhere** — new agents default to **read-only** — and the
**six sensitive classes** (`spend_money`, `delete_data`, `modify_production`, `contact_external`,
`sign_contract`, `install_package`) **ALWAYS require explicit approval, even the owner**, giving hard
money/production/deletion/contract safeguards. Every action — allowed or not — writes an entry to the
**append-only `AuditLog`** (audit everything). Approvals are held in a **role-gated `ApprovalQueue`**;
the **`SecretVault`** stores credential *references only* (the value is never stored, enforced by a
`value_stored = false` literal in the contract and a DB CHECK) with rotation; a `SessionManager` and a
`PermissionGroupRegistry` round out the layer. It **reuses the tenancy `PermissionChecker` via injected
resolvers**, so isolation holds per tenant. Full design:
[`docs/ENTERPRISE_SECURITY.md`](./docs/ENTERPRISE_SECURITY.md), [`docs/adr/ADR-0015`](./docs/adr/ADR-0015-enterprise-security.md).

### 3.19 Goal Engine — every goal turned into action
Takes any goal across nine types (`personal`, `financial`, `business`, `health`, `learning`,
`relationships`, `launches`, `sales`, `cash_flow`) and makes it executable. For each goal it
**determines** the current state, desired state, and the gap between them, plus the constraints,
resources, and best opportunities, and lays out **three paths** — *fastest*, *lowest-resistance*, and
*highest-ROI* — with a recommended path. It then **generates** a weekly plan, daily priorities,
recommended agents, recommended automations, an expected completion, and a risk analysis — **composing
the Decision Engine** for priority, agents, and automations. Deterministic (no AI). A goal stays `draft`
until approved; once approved it is **pursued (`active`) until it is completed, paused, cancelled, or
flagged `review_required` — it never stops on its own**. Any change **auto-recalculates** (re-analyze,
re-plan, version bump, `last_recalculated_at`): progress reaching the target auto-completes, below-target
recalculates, and `review_required` resumes to `active`; `completed`/`cancelled` are terminal.
Tenant-scoped. Full design: [`docs/GOAL_ENGINE.md`](./docs/GOAL_ENGINE.md),
[`docs/adr/ADR-0016`](./docs/adr/ADR-0016-goal-engine.md).

### 3.20 Persistent Approval — approve a workflow once
Lets the operator **approve a workflow ONCE** instead of re-approving the same action forever. A grant is
created from one of **seven grant buttons** (`remember_this`, `always`, `business`, `until_goal`,
`duration`, `review_monthly`, `review_quarterly`), and every grant stores its **scope** (action class,
action pattern, business, goal, environments), **expiration**, **limits** (max uses, used count, max
amount), **success metrics**, and **review schedule**. The integration with the Security Gate is
**additive**: the gate gains an **optional** `persistentApprovals` registry, and when policy would queue a
fresh approval it first authorizes against standing grants — a **covering** grant (live, in-scope, and
within-limits) turns a would-be `requires_approval` into an **audited `allow`**, records one use,
references the grant in the audit entry, and **does not re-queue**. With no registry the gate behaves
exactly as before. Grants **auto-expire into review** (`expireDue` → `in_review`), and an allow-until-goal
grant ends on goal completion. Everything is **bounded** — by scope, amount, use count, environment,
expiry, and review cadence — and **production is excluded by default**. Full design:
[`docs/PERSISTENT_APPROVAL.md`](./docs/PERSISTENT_APPROVAL.md),
[`docs/adr/ADR-0017`](./docs/adr/ADR-0017-persistent-approval.md).

### 3.21 Campaign Intelligence — campaigns that run themselves on autopilot
Runs marketing and outreach campaigns across **six types** (`email`, `social`, `landing_page`, `funnel`,
`outreach`, `lead_nurturing`). Every campaign ships an **A/B variant pair** plus **success metrics** and
**stop conditions** out of the box. As results arrive it does **automatic reporting** — it picks the
**winner by conversion rate** (guarded by a minimum-conversions threshold so a lucky early click can't
win), computes the **lift**, writes a summary, and emits improvement **recommendations**. Once approved a
campaign runs on **autopilot** and keeps going until one of five stop conditions fires — the **goal is
reached** (→ `completed`), the **approval expires**, **risk increases**, **performance drops**, or the
operator **pauses** it — and the trigger is recorded in `stop_reason`. **Monthly optimization** shifts
traffic toward the winning variant (70/30) and bumps the version. It **composes the Goal Engine** (goal
tracking and completion) and **Persistent Approval** (the standing grant that keeps autopilot live and
expires it), and is deterministic (no AI). Full design:
[`docs/CAMPAIGN_INTELLIGENCE.md`](./docs/CAMPAIGN_INTELLIGENCE.md),
[`docs/adr/ADR-0018`](./docs/adr/ADR-0018-campaign-intelligence.md).

### 3.22 Opportunity Intelligence — connect the dots no one else sees
Continuously analyzes the **ten entity sources** (`contact`, `business`, `vendor`, `investor`, `client`,
`idea`, `github_repo`, `asset`, `conversation`, `market_trend`) and **surfaces ranked opportunities** by
finding the **relationships between them** across **seven kinds** — e.g. "this developer also fits Divini
Procure" (`fit`), "this GitHub repo solves Move Mi" (`solves`), "this investor should meet this project"
(`investment`), "this vendor should be introduced to this developer" (`introduction`), plus `synergy`
(asset↔business), `trend_tailwind` (market trend↔business), and `partnership` (business↔business). Every
opportunity is scored on **five dimensions** — **revenue, probability, effort, risk, and strategic_value**
— plus a **weighted composite** (effort & risk inverted, lower is better); the five sub-scores are stored
so opportunities can be re-sorted by any dimension. It **surfaces automatically** — `surface(threshold)`
promotes `new`→`surfaced` above the composite threshold, then `accept`/`dismiss`/`markActed`/`top(n)`
drive the lifecycle — and **dedupes on re-analysis** by upserting on a signature (`kind|source|target`),
so nothing duplicates and prior decisions are preserved. It **composes the GitHub Intelligence verdicts,
assets, businesses, and contacts**, and is deterministic (no AI). Full design:
[`docs/OPPORTUNITY_INTELLIGENCE.md`](./docs/OPPORTUNITY_INTELLIGENCE.md),
[`docs/adr/ADR-0019`](./docs/adr/ADR-0019-opportunity-intelligence.md).

### 3.23 Agent Observability — what every agent did, and why
Makes every agent action **fully accountable**. The `AgentObservability` observer records each action
**append-only with complete provenance** — agent name, task, input, tools used, memory used, decision,
rationale, approval status, cost, runtime, outcome, errors, downstream effects, value, and risk — so
nothing an agent does is opaque after the fact. `explain()` answers the **four questions** about any
action (what did it do, why, what data it used, what it changed), and `dashboard()` rolls the log up into
performance, failed actions, cost by agent, ROI by agent, risky actions, approval bottlenecks, and
repeated failures. The record is append-only by construction (no edits, no deletes). Full design:
[`docs/AGENT_OBSERVABILITY.md`](./docs/AGENT_OBSERVABILITY.md),
[`docs/adr/ADR-0020`](./docs/adr/ADR-0020-agent-observability.md).

### 3.24 Simulation Engine — model the decision before you make it
Lets the operator **see the outcome before committing**. `simulate()` models **eight kinds** of decision
(`campaign_outcome`, `revenue_path`, `hiring_vs_automation`, `pricing_change`, `priority_shift`,
`cash_flow`, `implementation_risk`, `agent_failure`) and returns **three cases** — best, likely, and
worst — each a `ScenarioCase` carrying its assumptions, a projection, a narrative, and a probability,
alongside the **risks**, a **recommendation**, a `decision_needed` flag, and an `expected_value`. It is
deterministic (no AI), so the same inputs always yield the same scenarios. Full design:
[`docs/SIMULATION_ENGINE.md`](./docs/SIMULATION_ENGINE.md),
[`docs/adr/ADR-0021`](./docs/adr/ADR-0021-simulation-engine.md).

### 3.25 AI Center of Excellence — the internal standards layer
Holds the platform to its **own approved standards**. The `AiCenterOfExcellence` maintains a library of
standards across **eleven kinds** (`prompt`, `agent_template`, `workflow_template`, `security_standard`,
`data_standard`, `naming_convention`, `testing_standard`, `documentation_standard`, `escalation_rule`,
`model_usage_rule`, `cost_control`), and its compliance checker `checkCompliance(target)` validates **every
new agent, workflow, and connector** against the naming, testing, docs, model-usage, cost, and security
rules. A target passes only when it produces **no error-severity violations**, so nothing substandard
enters the system unchecked. Full design: [`docs/AI_CENTER_OF_EXCELLENCE.md`](./docs/AI_CENTER_OF_EXCELLENCE.md),
[`docs/adr/ADR-0022`](./docs/adr/ADR-0022-ai-center-of-excellence.md).

### 3.26 Workflow ROI Tracking — prove every automation pays
Makes each automation **earn its place**. The `WorkflowRoiTracker` records per-automation metrics — time
saved, revenue, cost reduced, errors reduced, risk reduced, conversion improvement, operating cost,
model/tool cost, and human time — then computes **value versus cost and ROI**, ranks workflows against one
another, and recommends whether to **scale, pause, improve, or delete** each one. The result is a single
honest view of which automations create value and which quietly drain it. Full design:
[`docs/WORKFLOW_ROI_TRACKING.md`](./docs/WORKFLOW_ROI_TRACKING.md),
[`docs/adr/ADR-0023`](./docs/adr/ADR-0023-workflow-roi-tracking.md).

### 3.27 Domain Operating Models — a full operating model per domain
Stands up a **complete operating model** for each domain on demand. The `DomainOperatingModelFactory`
builds one for **each of eleven domains** (`sales`, `marketing`, `finance`, `operations`, `legal_risk`,
`customer_success`, `product`, `recruiting`, `personal_admin`, `health`, `asset_management`), each carrying
its goals, workflows, agents, KPIs, assets, approvals, dashboards, and escalation rules — **deep-cloned
from canonical templates** so every domain starts complete and isolated. `create()` builds a single domain;
`createAll()` builds them all. Full design: [`docs/DOMAIN_OPERATING_MODELS.md`](./docs/DOMAIN_OPERATING_MODELS.md),
[`docs/adr/ADR-0024`](./docs/adr/ADR-0024-domain-operating-models.md).

### 3.28 Agent Identity & Zero Trust — who an agent is, before what it does
Gives **every agent a unique, scoped, revocable identity** under **zero trust**. The
`AgentIdentityRegistry` starts each identity **deny-by-default / read-only** — no money, no external
messages, no production, no deletion, no tools — and capabilities, tools, data boundaries, and limits are
opened **only via `grant()`**. `evaluate(request)` returns **allow, deny, or needs_approval** for every
request, judged against what that identity actually holds, and `suspend()`/`revoke()` shut it down. It
**complements the Security Gate**: the gate checks the **action**, identity checks **who** is asking, so the
two together answer "is this allowed, and is this agent even permitted to ask." Full design:
[`docs/AGENT_IDENTITY_ZERO_TRUST.md`](./docs/AGENT_IDENTITY_ZERO_TRUST.md),
[`docs/adr/ADR-0025`](./docs/adr/ADR-0025-agent-identity-zero-trust.md).

### 3.29 Source-of-Truth Management — knowing what is still true
Keeps the system's knowledge **honest about its own freshness**. The `SourceOfTruthRegistry` distinguishes
**nine knowledge kinds** (`verified_fact`, `assumption`, `outdated`, `user_preference`, `inferred_pattern`,
`external_research`, `document`, `contact`, `financial_data`), and every record carries its **source,
confidence, freshness, owner, `last_verified_at`, and `update_trigger`**. **Freshness** (`fresh`, `aging`,
`stale`, `expired`) is **derived from a per-kind verification TTL**, so a financial figure ages faster than a
stable document. `record`/`verify`/`markOutdated`/`refreshAll`/`needsVerification`/`query` drive the
lifecycle, surfacing exactly what must be re-checked before it is trusted again. Full design:
[`docs/SOURCE_OF_TRUTH.md`](./docs/SOURCE_OF_TRUTH.md),
[`docs/adr/ADR-0026`](./docs/adr/ADR-0026-source-of-truth.md).

### 3.30 Executive Control Tower — one read-only view of the whole operation
The **operator dashboard**. `assemble(input)` builds **one read-only snapshot** of the entire business at a
moment in time: cash (with computed **runway**), revenue pipeline, goals, active campaigns, blocked deals,
risks, agent performance, approvals needed, the **top-3 priorities** (computed), business health,
opportunities (ranked), workflows running, and the monthly/quarterly **review queue**. Snapshots are stored
**immutably**, so each one is a faithful record of how things looked when it was taken. It reads across the
engines and **executes nothing** — it presents, it does not act. Full design:
[`docs/EXECUTIVE_CONTROL_TOWER.md`](./docs/EXECUTIVE_CONTROL_TOWER.md),
[`docs/adr/ADR-0027`](./docs/adr/ADR-0027-executive-control-tower.md).

### 3.31 Enterprise Playbook Generator — a full playbook per business
Turns a business or domain into a **complete, runnable playbook**. The `PlaybookGenerator` produces **ten
artifact kinds** at once — SOPs, workflows, scripts, checklists, onboarding docs, training docs, role
scorecards, KPIs, escalation rules, and client-facing assets — **composing the Domain Operating Models'
`DOMAIN_TEMPLATES`** so each playbook starts from the same canonical operating model rather than a blank
page. `generate()` builds one playbook; `generateAll()` builds them across every business. Full design:
[`docs/ENTERPRISE_PLAYBOOK_GENERATOR.md`](./docs/ENTERPRISE_PLAYBOOK_GENERATOR.md),
[`docs/adr/ADR-0028`](./docs/adr/ADR-0028-enterprise-playbook-generator.md).

### 3.32 Strategic Portfolio Optimizer — where to spend the next hour
Looks at **all the businesses together** and decides where attention belongs. The `PortfolioOptimizer`
scores each business across **ten dimensions** (revenue potential, speed to cash, effort required, stress
cost, strategic value, current traction, operational drag, capital required, team dependency, monetization
path), ranks them by a **composite**, and recommends a disposition for each — `focus_now`, `delegate`,
`automate`, `pause`, `kill`, or `package_for_sale`. The result is one honest ranking of where energy and
capital produce the most return. Full design:
[`docs/STRATEGIC_PORTFOLIO_OPTIMIZER.md`](./docs/STRATEGIC_PORTFOLIO_OPTIMIZER.md),
[`docs/adr/ADR-0029`](./docs/adr/ADR-0029-strategic-portfolio-optimizer.md).

### 3.33 Knowledge Ingestion Engine — turn any source into structured knowledge
Takes whatever the operator consumes and makes it usable. The `KnowledgeIngestionEngine` accepts **eleven
source types** (`book`, `pdf`, `youtube_transcript`, `podcast`, `course`, `article`, `screenshot`, `note`,
`video`, `github_repo`, `competitor_page`) and runs each through a **ten-step pipeline** — summarize,
extract frameworks, extract tactics, map business applications, decide which business, derive monetization
use cases, draft SOPs, suggest agents, reference it into the Asset Library, and link it to existing goals,
campaigns, and businesses. Nothing the operator reads or watches stays inert. Full design:
[`docs/KNOWLEDGE_ENGINES.md`](./docs/KNOWLEDGE_ENGINES.md),
[`docs/adr/ADR-0030`](./docs/adr/ADR-0030-knowledge-ingestion-engine.md).

### 3.34 Knowledge-to-Action Converter — every idea becomes a move
Closes the loop after ingestion: it **turns every useful idea into an action**. The
`KnowledgeToActionConverter` produces **ten fields** per idea — action item, business use case,
implementation plan, revenue hypothesis, required assets, required agents, test plan, owner, deadline, and
dashboard card — plus a **reusable operating manual** that becomes durable IP. Each idea carries a
disposition — `use_now`, `save_for_later`, `ignore`, or `convert_to_campaign` — so insight always resolves
into a decision rather than a note. Full design:
[`docs/KNOWLEDGE_ENGINES.md`](./docs/KNOWLEDGE_ENGINES.md) (shared with the Knowledge Ingestion Engine),
[`docs/adr/ADR-0031`](./docs/adr/ADR-0031-knowledge-to-action-converter.md).

### 3.35 Conversion Engine — turn the same traffic into more money
Tracks and improves the **eleven surfaces** where money is won or lost — landing pages, offers, hooks,
CTAs, emails, DMs, sales calls, decks, proposals, follow-ups, and checkout flows. Per business, the
`ConversionEngine` maintains a baseline, the active tests, the winning and losing copy, the known
objections, the best offers, and the next optimization to run. Crucially, **A/B winners are decided by
revenue per unit, not vanity conversion** — a variant that converts less but earns more still wins. Full
design: [`docs/REVENUE_EXECUTION_LAYER.md`](./docs/REVENUE_EXECUTION_LAYER.md),
[`docs/adr/ADR-0032`](./docs/adr/ADR-0032-conversion-engine.md).

### 3.36 Follow-Up Execution Engine — nothing slips through
Makes sure no relationship goes cold. The `FollowUpExecutionEngine` tracks **nine entity kinds** (leads,
warm contacts, deals, vendors, investors, clients, partners, unanswered emails, stale opportunities) and
drives sequences, reminders, an approval queue, no-response handling, escalation, and reactivation. **After
approval it keeps going on its own** until a response arrives, the goal is met, the sequence completes, a
risk appears, or it is paused. Full design:
[`docs/REVENUE_EXECUTION_LAYER.md`](./docs/REVENUE_EXECUTION_LAYER.md),
[`docs/adr/ADR-0033`](./docs/adr/ADR-0033-follow-up-execution-engine.md). It now includes the
**Follow-Up Autopilot** extension (part of the Revenue Chain): **meeting_booked** and
**deal_closed** success stops, plus an **escalation path** that hands a thread to its own escalation queue
**only when human judgment is needed** (new `escalated` status and `escalation_reason`). Extension design:
[`docs/REVENUE_CHAIN.md`](./docs/REVENUE_CHAIN.md),
[`docs/adr/ADR-0044`](./docs/adr/ADR-0044-follow-up-autopilot.md).

### 3.37 Revenue Command System — the next move that makes money
Answers the only question that matters on a given day: where does the next dollar come from? Per business,
the `RevenueCommandSystem` computes the **fastest path to cash**, the **easiest offer to sell**, the **best
lead source**, the **highest-ROI campaign**, the **stuck deals**, the **next money action**, and the
**weighted pipeline**. It turns scattered revenue signals into a single, ranked instruction. Full design:
[`docs/REVENUE_EXECUTION_LAYER.md`](./docs/REVENUE_EXECUTION_LAYER.md),
[`docs/adr/ADR-0034`](./docs/adr/ADR-0034-revenue-command-system.md).

### 3.38 Sales Asset Generator — everything you need to sell, on demand
Produces the full set of selling materials for a business. The `SalesAssetGenerator` generates **twelve
sales asset kinds** — one-pager, pitch deck, investor deck, sales deck, proposal, email sequence, DM
script, call script, objection handling, FAQ, case study template, and onboarding packet — and **saves each
to the Asset Library** so it is versioned, searchable, and reusable rather than scattered. Full design:
[`docs/REVENUE_EXECUTION_LAYER.md`](./docs/REVENUE_EXECUTION_LAYER.md),
[`docs/adr/ADR-0035`](./docs/adr/ADR-0035-sales-asset-generator.md).

### 3.39 Execution Queue — one ordered list of what to do next
Collapses everything competing for attention into a single ordered queue. The `ExecutionQueue` holds **eight
buckets** (ideas, tasks, approved actions, blocked actions, waiting on Alyssa, automated workflows, money
actions, risk actions) and applies a fixed **priority order** — revenue, then risk, deadlines, follow-up,
operations, personal admin, and nice-to-have. `next()` returns the **highest-priority actionable item**,
skipping anything blocked or waiting on Alyssa, so there is always exactly one right thing to do next. Full
design: [`docs/REVENUE_EXECUTION_LAYER.md`](./docs/REVENUE_EXECUTION_LAYER.md),
[`docs/adr/ADR-0036`](./docs/adr/ADR-0036-execution-queue.md).

### 3.40 Don't Drop the Ball System — catch what falls through the cracks
Detects the **nine kinds of dropped item** — forgotten leads, missed follow-ups, unfinished launches,
abandoned ideas, stale campaigns, unpaid invoices, unsigned contracts, open loops, and waiting-on
responses — by flagging anything past a **per-kind staleness threshold**. The dropped-ball engine surfaces
the open items **daily, ranked by value then age**, each with a recommended action; approving an item
**assigns an agent to close the loop**, and re-scanning **dedupes by signature** so nothing surfaces twice.
Full design: [`docs/EXECUTION_SAFETY_NETS.md`](./docs/EXECUTION_SAFETY_NETS.md),
[`docs/adr/ADR-0037`](./docs/adr/ADR-0037-dont-drop-the-ball.md).

### 3.41 Business Asset Checklist — know what each business is missing
Tracks the **twenty-five key assets** every business should have and shows, per business, which are
**present and which are missing** plus a **completeness** fraction. It **recommends the fastest,
highest-leverage missing asset to build next** by walking a fixed priority order (offer first), advances
the recommendation as assets are marked present, and **shows missing assets across businesses** so gaps are
visible at the portfolio level. Full design:
[`docs/EXECUTION_SAFETY_NETS.md`](./docs/EXECUTION_SAFETY_NETS.md),
[`docs/adr/ADR-0038`](./docs/adr/ADR-0038-business-asset-checklist.md).

### 3.42 Money-First Operating Mode — bias the whole system toward cash
A switch that reshapes priorities when cash is the goal. When active it **prioritizes nine money-aligned
focuses** — cash collection, sales, follow-up, booked calls, proposals, invoices, high-conversion content,
warm relationships, and low-friction offers — and **deprioritizes five** — perfection, branding polish,
unnecessary features, low-conversion ideas, and research without action. It **classifies** each item and
**reorders work money-first** while active, and **passes work through unchanged** when off. Full design:
[`docs/EXECUTION_SAFETY_NETS.md`](./docs/EXECUTION_SAFETY_NETS.md),
[`docs/adr/ADR-0039`](./docs/adr/ADR-0039-money-first-operating-mode.md).

### 3.43 Knowledge Vault — every drop becomes an asset and an action
The front door over the Knowledge Ingestion Engine and Knowledge-to-Action Converter. It accepts **thirteen
input kinds** (adding voice notes, meeting notes, and random ideas to the earlier ingestion set), extracts
each drop into **eleven fields** — key ideas, frameworks, tactics, quotes, examples, business applications,
monetization opportunities, related businesses, related agents, related assets, and **action items** —
**saves the source to the Asset Library by reference**, and **converts the knowledge into executable
actions**. It never just stores. Full design:
[`docs/REVENUE_CHAIN.md`](./docs/REVENUE_CHAIN.md),
[`docs/adr/ADR-0040`](./docs/adr/ADR-0040-knowledge-vault.md).

### 3.44 Revenue Factory — "what do we do today to make money?"
A per-business money cockpit. From offers, pricing, leads, proposals, and follow-ups the Revenue Factory
computes the **fastest path to cash**, the **easiest offer**, the **offer most likely to convert**, the
**best warm contact**, the **lowest-effort revenue action**, and the **highest-value follow-up**, then names
the single headline money move for today. Full design:
[`docs/REVENUE_CHAIN.md`](./docs/REVENUE_CHAIN.md),
[`docs/adr/ADR-0041`](./docs/adr/ADR-0041-revenue-factory.md).

### 3.45 Conversion War Room — conversation → conversion, decided on revenue
Runs A/B tests across **nine surfaces** while tracking the **full funnel**. The winner is decided on
**revenue per send, then booked calls, then qualified leads** — never vanity opens or clicks — and only once
each variant has cleared the **minimum sends**; objections are logged along the way. Full design:
[`docs/REVENUE_CHAIN.md`](./docs/REVENUE_CHAIN.md),
[`docs/adr/ADR-0042`](./docs/adr/ADR-0042-conversion-war-room.md).

### 3.46 Deal Desk — conversion → cash
One full-context record per opportunity (**fourteen fields**), ranked by **probability, revenue, speed,
strategic value, or effort**. The Deal Desk always surfaces the **next money move**, the **blocked deals**,
and the **deals likely to die** without action. Full design:
[`docs/REVENUE_CHAIN.md`](./docs/REVENUE_CHAIN.md),
[`docs/adr/ADR-0043`](./docs/adr/ADR-0043-deal-desk.md).

### 3.47 Agent Evaluation Lab — earn trust before broad permissions
Before any agent is trusted it is tested against test tasks with **expected outputs**, **failure cases**, and
**risk checks**, scored on **accuracy, usefulness, cost, speed, reliability** (each `0..1`; cost and speed are
the inverse of cost and runtime). Agents climb a **six-stage ladder** (draft → testing → limited_use →
approved → production → retired); an agent **passes** when accuracy, reliability, and usefulness all clear the
threshold (default `0.8`) **and** no risk is flagged on a non-failure case. `promote()` into the gated stages
(approved, production) **throws** unless the agent passed — no agent gets broad permissions without earning
them. A Control Plane capability composing Agent Identity & Zero Trust and the AI Center of Excellence. Full
design: [`docs/GOVERNANCE_AND_PRINCIPLE.md`](./docs/GOVERNANCE_AND_PRINCIPLE.md),
[`docs/adr/ADR-0045`](./docs/adr/ADR-0045-agent-evaluation-lab.md).

### 3.48 Control/Execution Plane registry — the spine
The platform splits into two planes: a **Control Plane** (ten concerns — policy, identity, permissions,
approvals, routing, evaluations, observability, audit logs, cost controls, risk controls) and an **Execution
Plane** (eight concerns — agents, workflows, automations, connectors, tools, campaigns, repo actions, content
generation). `PLANE_CATALOG` tags every engine to a plane and concern; `guard(ExecutionRequest)` allows an
execution action **only if** identity is verified, policy is checked, and it is permitted — and, when approval
is required, only if approved — otherwise it is a **`bypass_attempt`** and is denied. **No agent may bypass the
Control Plane.** The catalog is static architecture metadata, so this engine has **no migration**. Full
design: [`docs/GOVERNANCE_AND_PRINCIPLE.md`](./docs/GOVERNANCE_AND_PRINCIPLE.md),
[`docs/adr/ADR-0046`](./docs/adr/ADR-0046-control-execution-planes.md).

### 3.49 Cost & Token CFO — keep the spend legible
Tracks **six cost categories** (model, api, automation, tool_subscription, compute, storage) against value
(revenue plus human time saved × rate). Per workflow it computes total cost, value, **cost per
task/lead/booked-call/sale** (`null` when the denominator is zero), **ROI** `(value − cost) / cost`,
**break-even**, and the largest cost category, then recommends a concrete move (cheaper_model/local_model,
batch_processing, pause_expensive_agent, upgrade_when_roi_supports, better_workflow). Complements Workflow ROI
Tracking with cost decomposition, per-unit costs, and infra moves — a Control Plane cost-control capability.
Full design: [`docs/GOVERNANCE_AND_PRINCIPLE.md`](./docs/GOVERNANCE_AND_PRINCIPLE.md),
[`docs/adr/ADR-0047`](./docs/adr/ADR-0047-cost-token-cfo.md).

### 3.50 Business Simulation Engine — pick the better option
An A-vs-B comparator over **six decision kinds** (focus_choice, campaign_choice, hire_vs_automate,
pricing_choice, lead_focus, build_vs_sell). Each option (projected_revenue, probability, time_cost_days,
stress_cost, risk) is projected to **best/likely/worst** with an **expected value** of `revenue × probability`
and scored on a composite that weighs that EV against risk, stress, and time; the engine recommends the
higher-scoring option with a reason. It **informs** decisions, it does not execute them. Distinct from the
scenario Simulation Engine — this one picks a winner between two options and adds stress_cost and time_cost.
Full design: [`docs/GOVERNANCE_AND_PRINCIPLE.md`](./docs/GOVERNANCE_AND_PRINCIPLE.md),
[`docs/adr/ADR-0048`](./docs/adr/ADR-0048-business-simulation-engine.md).

### 3.51 FounderOS Commercialization Layer — prepare the product map
Alfy² is Tenant 001, designed to later become FounderOS. Every feature is classified by **tier**
(personal_only, business_reusable, founder_saas_feature, agency_service, enterprise_product) and flagged for
whether it is a **SaaS-module candidate**; the registry seeds **ten named features** (Executive Inbox, Revenue
Factory, Conversion War Room, Agent Factory, Follow-Up Autopilot, Asset Library, Goal Engine, Pattern Engine,
Control Tower, Knowledge-to-Money Engine). **Preparation only** — `commercialized` is always false and nothing
is activated. Full design: [`docs/GOVERNANCE_AND_PRINCIPLE.md`](./docs/GOVERNANCE_AND_PRINCIPLE.md),
[`docs/adr/ADR-0049`](./docs/adr/ADR-0049-founderos-commercialization.md).

### 3.52 Founder Operating Principle — the doctrine
The global principle: convert speed of thought into speed of execution, and never let an idea die in notes.
`route()` resolves **every** idea to exactly one of **eight dispositions** (task, asset, campaign, offer,
agent, workflow, parked_idea, killed_idea) — it always returns one. `nextActions()` guarantees every business
its **five next actions** (money, risk, follow-up, asset, conversion), filling blanks with defaults.
`OPTIMIZATION_ORDER` is the system-wide priority **cash > conversion > follow_up > risk_control >
execution_speed > founder_energy > reusable_ip** that arbitrates every conflict. The doctrine the whole
platform serves. Full design: [`docs/GOVERNANCE_AND_PRINCIPLE.md`](./docs/GOVERNANCE_AND_PRINCIPLE.md),
[`docs/adr/ADR-0050`](./docs/adr/ADR-0050-founder-principle.md).

### 3.53 Constitution — the highest authority
`PRINCIPLES` is the frozen catalog of **ten principles** (1 Human remains in command, 2 Think aggressively, 3
Act conservatively, 4 Execute with urgency, 5 Finish what was started, 6 Protect trust, 7 Optimize for
measurable outcomes, 8 Reuse before rebuilding, 9 Explain important decisions, 10 Continuously improve).
`check(action)` returns a verdict per principle; the **hard gates** are Principle 3 (an irreversible/financial/
legal/production action without approval must go for approval — a violation until approved) and Principle 5
(abandoning approved work without a documented reason — a violation), while 7 and 9 flag a missing measurable
outcome / explanation. Every agent references it during execution; it composes the AI Center of Excellence, the
Security Gate, and the Plane registry, sitting above them. Frozen catalog, **no migration**. Full design:
[`docs/CONSTITUTION_AND_ENTERPRISE.md`](./docs/CONSTITUTION_AND_ENTERPRISE.md),
[`docs/adr/ADR-0051`](./docs/adr/ADR-0051-constitution.md).

### 3.54 Enterprise Hierarchy — the org tree
The **8-level** tree Enterprise → Company → Department → Team → Project → Asset → Task → Agent. Every node
inherits policies, security, branding, permissions, and reusable assets from its ancestors; `resolve()` merges
top-down (**lists union, scalars override**) so a company override is local and never breaks inheritance.
`atLevel` drives portfolio reporting and `sharedAcrossCompanies` enables shared vendors/SOPs/compliance and
cross-company opportunities; a child's level must sit below its parent's. Full design:
[`docs/CONSTITUTION_AND_ENTERPRISE.md`](./docs/CONSTITUTION_AND_ENTERPRISE.md),
[`docs/adr/ADR-0052`](./docs/adr/ADR-0052-enterprise-hierarchy.md).

### 3.55 Reflection Engine — periodic lessons
A **weekly/monthly/quarterly/yearly** review evaluating revenue, missed opportunities, follow-up failures,
automation & agent performance, workflow bottlenecks, time, energy, decision quality, and goal progress;
generates lessons, improvements, workflows to automate/retire, new agents, risks, and next-period priorities.
Reviews accumulate in `history` — the institutional memory of how the platform has performed over time. Composes
the Pattern Engine and Workflow ROI Tracking. Full design:
[`docs/CONSTITUTION_AND_ENTERPRISE.md`](./docs/CONSTITUTION_AND_ENTERPRISE.md),
[`docs/adr/ADR-0053`](./docs/adr/ADR-0053-reflection-engine.md).

### 3.56 Enterprise Knowledge Graph — everything connected
**Fifteen node kinds** (people, businesses, projects, tasks, documents, assets, meetings, github repos,
automations, goals, workflows, agents, vendors, investors, competitors) connected by typed, weighted
relationships. `search` by kind/term, `neighborhood` one-hop, and `recommendations` via **triadic closure**
(pairs sharing ≥2 neighbours but not directly linked). Answers the cross-cutting "every project involving these
people, businesses, investors, and this topic" query that flat lists cannot. Full design:
[`docs/CONSTITUTION_AND_ENTERPRISE.md`](./docs/CONSTITUTION_AND_ENTERPRISE.md),
[`docs/adr/ADR-0054`](./docs/adr/ADR-0054-knowledge-graph.md).

### 3.57 Operating Manual Generator — stable workflows become IP
When a workflow becomes stable, generates its **8 artifacts** (SOP, checklist, playbook, onboarding guide,
training document, troubleshooting guide, KPIs, ownership matrix), each saved to the Asset Library **by
reference** (`assetSink`) and marked reusable IP. **Gated on `is_stable`**. Workflow-triggered, distinct from
the domain-triggered Enterprise Playbook Generator. Full design:
[`docs/CONSTITUTION_AND_ENTERPRISE.md`](./docs/CONSTITUTION_AND_ENTERPRISE.md),
[`docs/adr/ADR-0055`](./docs/adr/ADR-0055-operating-manual-generator.md).

### 3.58 Digital Twin — a live model to plan against
A continuously-updated model of the enterprise (businesses, finances, assets, contacts, projects, agents,
workflows, campaigns, goals, risks) with computed **runway**. `simulate()` runs **4 what-if scenarios** (hire,
pause_business, revenue_drop, launch_offer) projecting state/runway/deltas with a recommendation. The basis for
forecasting and planning; complements the Control Tower (read snapshot) and the Business Simulation Engine
(A-vs-B). Full design: [`docs/CONSTITUTION_AND_ENTERPRISE.md`](./docs/CONSTITUTION_AND_ENTERPRISE.md),
[`docs/adr/ADR-0056`](./docs/adr/ADR-0056-digital-twin.md).

### 3.59 Institutional Memory — never forget a decision
An **append-only** ledger across **9 record kinds** (decision rationale, rejected idea, failed experiment,
successful experiment, negotiation outcome, lesson learned, vendor experience, client preference, implementation
history) — **never edited or deleted**. A `decision_rationale` **must** record `what_we_knew` and `why_chosen`
(answering "what did we know at the time, and why did we choose this?"); `rationaleFor` returns it. Complements
the Memory Engine and the Reflection Engine. Full design:
[`docs/CONSTITUTION_AND_ENTERPRISE.md`](./docs/CONSTITUTION_AND_ENTERPRISE.md),
[`docs/adr/ADR-0057`](./docs/adr/ADR-0057-institutional-memory.md).

### 3.60 Executive Mission Control — one screen
The one-screen executive dashboard — enterprise & company health (scored, labelled), revenue, pipeline, cash,
runway, goals, blocked items, risks, approvals, top opportunities, agent/automation/system health, AI costs,
ROI, daily priorities — plus a single computed **headline** (urgent runway → approvals → risks → blocked →
today's first priority). A **read model** composing the Control Tower, Cost CFO, and Agent Observability, so
**no migration**; the Tower is the operator snapshot, Mission Control the executive composite adding
system/automation health, AI cost, and the headline. Full design:
[`docs/CONSTITUTION_AND_ENTERPRISE.md`](./docs/CONSTITUTION_AND_ENTERPRISE.md),
[`docs/adr/ADR-0058`](./docs/adr/ADR-0058-mission-control.md).

### 3.61 Continuous Improvement Engine — keep every workflow honest
Scores every workflow on **speed, quality, cost efficiency, conversion, reliability, user ease** (health = mean)
and recommends **simplify / automate / remove / merge / split / delegate**, each with expected impact and
confidence, sorted by **impact × confidence**; `worstFirst` prioritizes where improvement matters most;
re-evaluation upserts. Complements Workflow ROI Tracking and the Reflection Engine. Full design:
[`docs/CONSTITUTION_AND_ENTERPRISE.md`](./docs/CONSTITUTION_AND_ENTERPRISE.md),
[`docs/adr/ADR-0059`](./docs/adr/ADR-0059-continuous-improvement.md).

### 3.62 Builder Mode — stand up a venture on command
Trigger phrase `BUILDER_TRIGGER = "I want to build"`. `build()` produces the complete **18-stage** venture
operating system (discovery, market validation, offer design, pricing, business model, brand, product
architecture, technical architecture, database, agent plan, asset checklist, legal, marketing plan, sales plan,
automation plan, launch plan, KPIs, review checkpoints) — each stage with a title, summary, items, and open
questions, not just a task list. **Human-in-command**: always returns `awaiting_approval`; nothing is built
until `approve()`. Composes the Idea Builder and Business Template. Full design:
[`docs/CONSTITUTION_AND_ENTERPRISE.md`](./docs/CONSTITUTION_AND_ENTERPRISE.md),
[`docs/adr/ADR-0060`](./docs/adr/ADR-0060-builder-mode.md).

### 3.63 Finance Command Center — the whole money picture
The complete personal and business financial view: per business — monthly revenue/expenses, **profit**,
**margin**, **tax exposure**, **cash runway**, **best next financial action**, **risks**, **opportunities** —
plus rolled-up totals and **personal net worth**. The hard guardrail is mechanical:
**`money_actions_require_approval` is always true** and **`forbiddenActions()`** exposes the never-without-
approval list (move_money, spend_money, open_account, execute_investment, file_taxes, sign_document). Analyze
aggressively, execute conservatively. Snapshots append-only. Full design:
[`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0061`](./docs/adr/ADR-0061-finance-command-center.md).

### 3.64 Legal Tax Strategy Analyzer — optimization, not advice
Analyzes **15 tax areas**; every recommendation carries `why_it_may_apply`, `estimated_benefit`, `risk_level`,
`complexity`, `requires_professional_review` (**always true**), `documents_needed`, `next_step`, and
`questions_for_advisor`, under a standing disclaimer. **Legal optimization only** — avoidance, deferral,
deduction, structuring, planning — **never evasion**; analysis-for-review, not advice; CPA/attorney review
required. Full design: [`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0062`](./docs/adr/ADR-0062-tax-strategy-analyzer.md).

### 3.65 Entity Structure Optimizer — recommend, never form
LLC vs S Corp vs C Corp vs subsidiary vs holding company by a transparent rule (**raise/exit → C Corp;
IP/SaaS/liability → holding company; profit ≥ 60k + payroll → LLC/S Corp; else LLC**), with alternatives
(pros/cons/tax/legal), CPA & attorney questions, and an action checklist; `requires_professional_review`
**always true**. Never forms, converts, files, or signs. Full design:
[`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0063`](./docs/adr/ADR-0063-entity-structure-optimizer.md).

### 3.66 Wealth Architecture Dump Box — the finance drop
A finance-specific drop run through a **10-step pipeline** (classify, summarize, scope personal/business,
legality notes, upside, risk, link goals, advisor questions, save to the Wealth Knowledge Vault **by reference**,
next action); tax / trust / IRA / offshore / financial-product items are flagged for professional review. Full
design: [`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0064`](./docs/adr/ADR-0064-wealth-dump-box.md).

### 3.67 Elite Money Game Engine — the downside-first playbook
A **17-strategy** catalog (holding / operating / IP companies, management fees, owner comp, retirement, SDIRA,
Solo 401(k), trusts, real estate, investments, deductions, charitable, insurance, asset protection, estate,
compliant offshore), each with what / when / when-not / benefits / risks / compliance / advisor / complexity /
steps; `analyze()` assembles a ranked plan with **`protect_downside_first`** and **`legal_avoidance_only`**
always true. Legal avoidance only; advisor execution. Full design:
[`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0065`](./docs/adr/ADR-0065-elite-money-game.md).

### 3.68 Algorithm Overlay System — one transparent ranking layer
**15 transparent scoring algorithms** (priority, ROI, fastest path to cash, friction, conversion probability,
agent-need detection, opportunity matching, business health, goal gap, risk, pattern prediction, energy-aware
scheduling, knowledge-to-money, portfolio allocation, A/B-test winner) above agents/workflows/goals/businesses/
campaigns/tasks. **Phase 1 rules-based** (phases graduate rules → weighted → historical → predictive). Each
score is `0..1` with confidence, why, `data_used`, `data_missing`, recommended action, `requires_approval`, and
an override. **No migration** (static catalog + computed scores). Full design:
[`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0066`](./docs/adr/ADR-0066-algorithm-overlay.md).

### 3.69 Executive Intelligence Network — intelligence, not summaries
Converts external information into executive intelligence — **ten article scores** drive a five-way
**classification** (ignore / interesting / monitor / research / immediate_action); each item states why it
matters, businesses/goals affected, agents to notify, immediate actions, future implications, confidence,
sources, follow-ups. Developing stories roll into **one living briefing** with a timeline — the same story is
**never reread twice**. Items append-only; living briefings mutable. Full design:
[`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0067`](./docs/adr/ADR-0067-intelligence-network.md).

### 3.70 Failure Database + Future Trends Lab — remember the past, prepare for the future
The Failure Database tracks **9 failure kinds** as permanent institutional knowledge (what happened, timeline,
why, root cause, warning signs, lessons, how Alfy² avoids repeating it), append-only. The Future Trends Lab
tracks trends over **6 months–10 years** with likelihood, impact, affected industries/businesses, prep steps,
skills/tech needed, investments, threats, and a **readiness score (likelihood × impact)**, mutable — preparing
Alyssa before everyone else. Full design: [`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0068`](./docs/adr/ADR-0068-failure-trends.md).

### 3.71 Intelligence Lenses — relevant and stress-tested
**Why This Matters** translates any item into decisions for Alyssa's businesses (affected, needs change,
competitive advantage, compliance risk, product opportunity, test/ignore, assets/agents/workflows to update,
strategy-review tier). **Contrarian View** constructs the strongest credible opposing case (mainstream vs
contrarian, evidence both sides, ignored risks, questionable assumptions, barriers, compliance, business-model
weaknesses, execution risks, recommendation) to cut blind spots and prevent hype-driven decisions. Both are
**read models with no migration**. Full design: [`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0069`](./docs/adr/ADR-0069-intel-lenses.md).

### 3.72 Briefing Engine — the executive's rhythm
One engine, four briefings: **morning** (priorities/revenue/follow-ups/blocked/calendar/news lanes/agent recs,
~5 min), **lunch** (a learning/intelligence update — top reads, why, action), **evening** (close the day —
wins/money/what-didn't-move + 7 questions, saving reflections to **Institutional Memory**), **weekly** (a
strategic intelligence report). A greeting per kind, sections from labeled inputs, estimated reading time.
Append-only. Full design: [`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0070`](./docs/adr/ADR-0070-briefing-engine.md).

### 3.73 Podcast Studio OS — idea → episode → monetization
Manages "Decoded with Alyssa DelTorre." Each episode idea — title, hook, premise, why now, audience, key story,
talking points, guest fit, business tie-in, monetization angle, clips, CTA, related businesses, assets needed —
moves through a **six-stage lifecycle**. Inputs come from the Executive Intelligence Network, business updates,
and the failure/trends databases. Full design: [`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0071`](./docs/adr/ADR-0071-podcast-studio.md).

### 3.74 Podcast Guest Booking Agent — book both directions, contact on approval
Mines contacts + external experts, ranks by a weighted composite of relevance / credibility / audience-fit /
business-value, drafts outreach, tracks replies, schedules, and books Alyssa onto other shows too
(**inbound_guest** vs **outbound_appearance**). **Never contacts anyone until outreach is approved** (or
persistent approval exists) — **`markContacted` throws** otherwise. Full design:
[`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0072`](./docs/adr/ADR-0072-podcast-guests.md).

### 3.75 PR Department — the thirteenth standard department
PR is now the **13th standard department** — the Business Template (`business/template.ts`) adds it,
`DepartmentKind` gains **`pr`**, and the template now defines **thirteen departments** every business inherits.
The PR generator produces media angles, target publications, podcast targets, a founder-story angle, credibility
proof, a press-kit checklist, outreach templates, and reputation risks. Full design:
[`docs/FINANCE_INTEL_MEDIA.md`](./docs/FINANCE_INTEL_MEDIA.md),
[`docs/adr/ADR-0073`](./docs/adr/ADR-0073-pr-department.md).

### 3.76 Story Mining Engine — never lose a good story
Turns every experience from **twelve sources** into a fully worked story for **eight channels**, each carrying its
hook, conflict, lesson, emotion, transformation, why-it-matters, audience, business-tie-in, CTA, proof,
best-channels, and urgency. Merges the prior Story Mining and Story Intelligence ideas; every mined story is
retained append-only so a good story is never lost. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0074`](./docs/adr/ADR-0074-story-mining.md).

### 3.77 Media Operating System — one moment, many assets, gated
One raw moment in **eleven input kinds** → many finished, brand-correct assets across **twelve output kinds**;
**`requires_approval` is always true** so nothing publishes without Alyssa. Removes the production labor without
removing command, and resolves brand via Brand DNA before producing a single asset. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0075`](./docs/adr/ADR-0075-media-os.md).

### 3.78 Brand DNA Engine — which brand, and what it is
Seeds **nine brands**, each with a full identity (voice, visuals, audience, values, promise), as the source of
truth the media stack reads from. **`resolveBrand()`** auto-detects which brand a moment belongs to, so the Media
OS produces every asset under the right identity without manual tagging. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0076`](./docs/adr/ADR-0076-brand-dna.md).

### 3.79 Content Factory — one source, a 42-piece package, nothing made twice
One source → a **42-piece linked package** via `CONTENT_MULTIPLIER` (1 YouTube long, 5 shorts, 5 reels, 10 X,
5 LinkedIn, 3 carousels, …) — a declared recipe yielding the same complete package every time. Pieces are linked
to source and siblings, tracked as one unit, and nothing is created twice; packages are append-only. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0077`](./docs/adr/ADR-0077-content-factory.md).

### 3.80 Production Studio — approval triggers finished media
Stores **seventeen production-asset kinds** as a reusable library + **per-brand presets** that run the
post-approval pipeline automatically (Decoded: Intro A / Outro B / sponsor after first topic / chapters /
subtitles / clips / show notes / schedule). Presets sit downstream of the approval gate. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0078`](./docs/adr/ADR-0078-production-studio.md).

### 3.81 Visibility Engine — measure it, name the weak signals
Per-business **Visibility Score** from **fourteen signals** + recommends where/what/when to post, collaborators,
podcasts to appear on, conferences, and awards; names the **three weakest signals** outright. Scores are
append-only; outreach flowing from recommendations is approval-gated. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0079`](./docs/adr/ADR-0079-visibility-engine.md).

### 3.82 PR & Authority Engine — catch the moment, never send unapproved
Auto-detects PR opportunities from **six triggers** (launch / partnership / funding / win / trend / innovation) →
a drafted pitch + target outlets + the authority asset stack; **`markSent` throws unless approved**. Complements
the per-business PR Strategy Generator (ADR-0073): strategy there, moment-catching here. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0080`](./docs/adr/ADR-0080-pr-authority.md).

### 3.83 Audience Intelligence — distill the audience, merge as it speaks
Distills an audience's fears / goals / language / objections / desires / misconceptions / favorite-content /
best-offers from **nine signal kinds**; re-analysis **upserts** (merges new signal into the existing portrait) so
understanding accumulates rather than resets. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0081`](./docs/adr/ADR-0081-audience-intelligence.md).

### 3.84 Personal Freedom Engine — more freedom without losing performance
Tracks **work vs life hours**, computes a **freedom score**, recommends automation / delegation / agent-creation /
workflow-improvement / batch; every recommendation carries **`preserves_performance: true`**. Maximize life, not
work; append-only. Full design: [`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0082`](./docs/adr/ADR-0082-personal-freedom.md).

### 3.85 Legacy Engine — knowledge that compounds for decades
Turns repeatable knowledge in **ten kinds** into enduring legacy forms (SOP / FounderOS feature / course /
podcast / keynote / book chapter / licensing / consulting framework) with a **legacy score** ranking the
conversions by durable, compounding value. Append-only IP record. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0083`](./docs/adr/ADR-0083-legacy-engine.md).

### 3.86 Compounding Engine — optimize for compounding, not output
Evaluates every completed task for **twenty-one reusable forms**, scores it on **eight compounding dimensions**,
recommends the reusable version, and maintains the **Asset Lineage Graph** (what created it / what it created /
businesses / revenue / agents / workflows / version). Evaluations append-only; the lineage graph mutable. Full
design: [`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0084`](./docs/adr/ADR-0084-compounding-engine.md).

### 3.87 Multiplication Engine — 1 solution → 100 uses → 1000 hours saved
Never solve once: evaluates whether a solution helps **nine targets**, recommends **eight shared forms**, and
scores **Multiplication** as future uses per 100, surfacing the solutions where one build yields the most
downstream uses. Append-only. Full design: [`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0085`](./docs/adr/ADR-0085-multiplication-engine.md).

### 3.88 Leverage Engine — the highest-leverage path, not the fastest
Scores every recommendation on **fourteen inputs** into a **tier** (low / medium / high / compounding /
generational); **`compare()`** recommends the highest-leverage path even when it is not the fastest. `score()` is
pure; **`compare()` persists** its comparisons append-only. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0086`](./docs/adr/ADR-0086-leverage-engine.md).

### 3.89 The Five Immutable Laws — the frozen bedrock
**Protect the Human, Compound Everything, Allocate Capital Intelligently, Prefer Systems Over Heroics, Increase
Founder Freedom** — every feature / agent / workflow / recommendation must satisfy them; **Law 1 and Law 4 are
hard gates**; every major recommendation explains how it satisfies the laws. **No migration** (frozen catalog +
checker). Full design: [`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0087`](./docs/adr/ADR-0087-immutable-laws.md).

### 3.90 Executive Capital Allocator — never deplete one resource for another
Daily / weekly / quarterly highest-value allocation across **twelve capital kinds** (time / money / energy /
attention / relationships / reputation / knowledge / technology / assets / employees / agents / automation);
surfaces highest ROI / leverage / compounding / strategic / freedom, the trade-offs (what each pick depletes), and
quarterly what to stop. Append-only. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0088`](./docs/adr/ADR-0088-capital-allocator.md).

### 3.91 Opportunity Cost Engine — always show what is not chosen
Compares **two to four options** on upside / downside / capital / time / stress / complexity / risk / confidence /
leverage, computes each option's opportunity cost vs the best alternative, and names the best financial /
strategic / long-term / low-risk / fastest / highest-leverage choice — always showing what is **not** chosen and
why. Append-only. Full design: [`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0089`](./docs/adr/ADR-0089-opportunity-cost.md).

### 3.92 Executive Decision Journal — close the loop on every decision
Records decisions with alternatives / reasoning / data / assumptions / risks / expected outcome; **schedules
30/90/365-day reviews** to record actual outcome + lessons; surfaces recurring decision patterns (categories with
≥2 decisions) to improve future recommendations. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0090`](./docs/adr/ADR-0090-decision-journal.md).

### 3.93 Enterprise Memory Timeline — origins and consequences, retrievable
A chronological history of **thirteen event kinds**, each linking related assets / agents / people / businesses /
lessons; **`firstMention`** answers "when did we first discuss this?" and **`after`** answers "what happened after
that decision?" Append-only — extended, never rewritten. Full design:
[`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0091`](./docs/adr/ADR-0091-memory-timeline.md).

### 3.94 Executive Review Board — a board for a solo founder
A virtual board of **ten roles** (CEO / CFO / COO / CTO / CMO / CLO / CRO / CSO / CPO / CCO), each independently
evaluating benefits / risks / blind-spots / dependencies / costs / operational-impact through its lens;
synthesizes a final recommendation and **highlights disagreements** rather than forcing consensus. Append-only.
Full design: [`docs/LEVERAGE_AND_MEDIA.md`](./docs/LEVERAGE_AND_MEDIA.md),
[`docs/adr/ADR-0092`](./docs/adr/ADR-0092-review-board.md).

### 3.95 Cognitive Offloading Engine — the L0 front door
**`process()`** takes any of **8 input kinds** and runs the **5-stage pipeline** (Understand → Connect → Build →
Delegate → Executive Report), answering "can Alyssa forget this?" per item and reporting `cognitive_load_removed`;
the Stage-5 report is the Executive Decision Filter. Append-only (`0172`). Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0093`](./docs/adr/ADR-0093-cognitive-offload.md).

### 3.96 Life Logistics Engine — events arrive prepared
A detected event → checklists (**19 categories**), calendar blocks, a night-before / two-hours-before / after-event
reminder cadence, and follow-ups, so Alyssa never has to remember it. Append-only (`0173`). Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0094`](./docs/adr/ADR-0094-life-logistics.md).

### 3.97 Anti-Fragility Engine — improve because of failures
**`analyze()`** turns each of **9 failure types** into root cause, reusable lesson, and a new safeguard / automation
/ agent / SOP / redesign, with recovery speed, learning gained, and future risk reduction; composes the Failure
Database (§3.70). Full design: [`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0095`](./docs/adr/ADR-0095-anti-fragility.md).

### 3.98 Brain/Hands Separation — recommend, govern, coordinate, execute
Four layers — **Brain recommends / Policy governs / Orchestrator coordinates / Hands execute** — and **`guard()`**
blocks any execution that bypasses policy / approval / audit as a `bypass_attempt`; composes the Control/Execution
Planes (ADR-0046). Static catalog (no migration). Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0096`](./docs/adr/ADR-0096-brain-hands.md).

### 3.99 Confidence-Weighted Agent Council — independent, confidence-weighted
**`convene()`** runs **10 roles** independently with confidence scores → agreement, confidence_gap,
unresolved_risks, and needs_more_data (declines to decide when data is thin); complements the Review Board (§3.94).
Full design: [`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0097`](./docs/adr/ADR-0097-agent-council.md).

### 3.100 Billion-Dollar Operator Mode — the $100M+ lens
**`review()`** holds every major recommendation to "would this work at $100M+?" (`hundred_m_fit`) and returns the
cleaner, scalable version when fit is low. Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0098`](./docs/adr/ADR-0098-operator-mode.md).

### 3.101 Capital Allocation Board — per-option payback, liquidity, disposition
**`allocate()`** scores each option on payback / liquidity / leverage / compounding / opportunity cost and issues
one of **8 dispositions**; complements the Executive Capital Allocator (§3.90). Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0099`](./docs/adr/ADR-0099-capital-board.md).

### 3.102 Million-Dollar Sprint Engine — ranked cash paths, no fantasy math
**`build()`** ranks cash paths to $1M on speed / size / probability / effort / risk / leverage / readiness / energy
with 7/30/90-day plans; every path shows assumptions, risks, and required actions. Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0100`](./docs/adr/ADR-0100-million-sprint.md).

### 3.103 Revenue Truth System — activity is not revenue
**`report()`** places deals on a **9-rung honest ladder**, prioritizing cash collected over signed over invoiced
over qualified over booked, and flags stalled deals. Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0101`](./docs/adr/ADR-0101-revenue-truth.md).

### 3.104 Executive Delegation System — what Alyssa should not do herself
**`classify()`** assigns each task one of **9 owners**, reserving `alyssa_only` for work that genuinely needs her
vision / relationships / creativity / approval. Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0102`](./docs/adr/ADR-0102-delegation.md).

### 3.105 Enterprise Risk Register — the weekly top-ten
Risks across **13 categories** with computed exposure; mutable (`add` / `update`); **`top(10)`** drives the weekly
review. Full design: [`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0103`](./docs/adr/ADR-0103-risk-register.md).

### 3.106 Board Packet Generator — operate like a serious company
**`generate()`** produces board-level monthly reporting as a read model before a board exists. Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0104`](./docs/adr/ADR-0104-board-packet.md).

### 3.107 Strategic Exit & Asset Value Engine — build it to be sellable
**`assess()`** values every asset against **8 exit paths** with valuation logic and the steps to make it sellable.
Full design: [`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0105`](./docs/adr/ADR-0105-strategic-exit.md).

### 3.108 Founder Nervous System Protection — burnout is an enterprise risk
**`assess()`** tracks founder load (ok / elevated / high / critical) and recommends relief (delegate / delay /
batch / automate / cancel / simplify / escalate / convert-to-checklist) that preserves execution speed. Full
design: [`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0106`](./docs/adr/ADR-0106-nervous-system.md).

### 3.109 Relaxation Outcome + True Progress — never confuse intensity with progress
Optimize for money / risk control / delegation / systems / freedom / peace of mind — never busyness or vanity
metrics; True Progress refuses to call intensity progress. (Two engines.) Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0107`](./docs/adr/ADR-0107-outcome-engines.md).

### 3.110 Capital Engine — every form of capital, lifetime accumulation
**`report()`** scores recommendations across **10 capital types** with compounding, payoff horizon, and conversion
paths; optimizes for lifetime accumulation, not short-term activity. Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0108`](./docs/adr/ADR-0108-capital-engine.md).

### 3.111 Consequence Horizon Engine — what doors open later
**`project()`** estimates second- and third-order consequences across **immediate / 30-day / 90-day / 1-year /
5-year** horizons, optimizing for long-term leverage. Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0109`](./docs/adr/ADR-0109-consequence-horizon.md).

### 3.112 The Alfy² Pyramid — every feature must move up
**`classify()`** places a feature/output on the **8-level pyramid** (Capture → Organize → Understand → Recommend →
Execute → Compound → Multiply → Freedom) and recommends the next level up — pulling the platform toward Freedom.
Full design: [`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md),
[`docs/adr/ADR-0110`](./docs/adr/ADR-0110-pyramid.md).

### 3.113 Doctrine — folded into the Constitution and the Five Immutable Laws
The L0/L1 capstone's mission and principles are not re-built: they are honored by the Constitution (§ ADR-0051) and
the Five Immutable Laws (§3.89, ADR-0087), so the nineteen engines apply the doctrine by construction rather than
duplicating it. One consolidated smoke `pnpm capstone:smoke` runs all 19. Full design:
[`docs/COGNITIVE_OFFLOADING_OS.md`](./docs/COGNITIVE_OFFLOADING_OS.md).

### 3.114 Operating System Meta-Layer — keep it ahead, prove it works, simplify itself
The **operating-system meta-layer**: **eleven engines** that sit above the platform and run it like a company built
to stay ahead, measure whether it is working, and improve itself faster than it grows. **R&D Department**
(ADR-0111) — `evaluate()` → disposition + confidence, `report()` the Innovation Report, only high-confidence
discoveries surface (`0186`, append-only). **Acquisition Engine** (ADR-0112) — `evaluate()` → one of 8 dispositions
(build / buy / partner / license / white_label / acquire / invest / ignore) by capital-allocator scoring (`0187`).
**Executive Flight Deck** (ADR-0113) — `assemble()` returns only decision-changing sections; replaces the
dashboard; read model. **Founder Freedom Index** (ADR-0114) — `compute()` → 0–100 with trend / bottleneck /
recommendation (`0188`, append-only). **Life ROI Engine** (ADR-0115) — `evaluate()` scores financial ROI **and**
life returned (`workdays_returned`) (`0189`). **Never Again Engine** (ADR-0116) — `capture()` turns a frustration
into permanent infrastructure (`0190`). **Enterprise Self-Improvement Engine** (ADR-0117) — `selfEvaluate()` runs a
monthly OS self-eval, simpler over bigger (`0191`). **Enterprise Operating Rhythm** (ADR-0118) — `agenda()` returns
daily / weekly / monthly / quarterly / annual agendas; read model. **Executive Operating Manual** (ADR-0119) —
`assemble()` composes the Operating Manual Generator (ADR-0055) over the OS and flags staleness; read model. **The
Infinite Loop** (ADR-0120) — `stageOf()` maps each module to a loop stage (Observe → Understand → Decide → Execute →
Compound → Increase Freedom → Observe); read model; the Alfy² Equation (Reality → Understanding → Execution →
Compounding → Freedom → Possibility → Reality) is its philosophical statement. **The Ultimate Design Rule**
(ADR-0121) — `admit()` admits a feature only if it satisfies ≥1 of six criteria (increase leverage / reduce
friction / compound knowledge / protect trust / generate measurable value / increase founder freedom); the highest
admission gate, above the README and Constitution; read model. One consolidated smoke `pnpm meta:smoke`. Full design:
[`docs/OPERATING_SYSTEM_META_LAYER.md`](./docs/OPERATING_SYSTEM_META_LAYER.md),
[`docs/adr/ADR-0111`](./docs/adr/ADR-0111-rnd.md) … [`docs/adr/ADR-0121`](./docs/adr/ADR-0121-ultimate-design-rule.md).

### 3.115 Identity, Conversation & Voice — who Alyssa is, and how she talks to Alfy²
The **identity, conversation & voice layer**: **five engines** that protect who Alyssa is and make natural
conversation the primary interface. **Identity OS** (ADR-0122) — `setAnchor()` / `check()`; on any
identity↔optimization conflict **identity OVERRIDES optimization**; anchors mutable (`0192` `identity_anchors`).
**Philosophy Library** (ADR-0123) — `add()` / `revise()` / `pin()`; `todaysReminder()` is a **deterministic daily**
"Today's Reminder"; mutable (`0193` `philosophies`). **Conversation Engine** (ADR-0124) — `converse()` is a thinking
partner turning natural speech into extractions across tasks / assets / agents / businesses / workflows / knowledge /
capital; **nothing executes without approval**; distinct from the Conversion Engine (ADR-0032); `0194`
`conversation_extractions`, append-only. **Vision Builder** (ADR-0125) — "I have an idea…" → a collaborative
thinking session that generates plans, composing the Idea Builder (ADR-0008); **`awaiting_approval` always true**;
`0195` `vision_sessions`, append-only. **Voice Interface** (ADR-0126) — `interpret()` maps utterance → `VoiceCommand`;
sensitive actions confirm first; a calm companion; read model (speech I/O is runtime). One consolidated smoke
`pnpm identity:smoke`. Full design: [`docs/IDENTITY_CONVERSATION_VOICE.md`](./docs/IDENTITY_CONVERSATION_VOICE.md),
[`docs/adr/ADR-0122`](./docs/adr/ADR-0122-identity-os.md) …
[`docs/adr/ADR-0126`](./docs/adr/ADR-0126-voice-interface.md).

## 4. Control flow (a single request)

1. **Ingress** — `services/api` authenticates, resolves `tenant_id`, rate-limits, validates input.
2. **Plan** — orchestrator's Planner asks the relevant Module(s) to produce a `Plan` of `Tasks`.
3. **Dispatch** — Dispatcher sends each `Task` to the registered Agent worker.
4. **Execute** — Agent returns a `SignalToAction` result.
5. **Assemble** — orchestrator merges results into a single Signal→Action response.
6. **Gate** — irreversible `next_actions` are routed to the Approval Gate; reversible ones proceed per policy.
7. **Record** — every step appends to Event Log; the plan/choice appends to Decision Log.
8. **Respond** — explainable result returned to the client.

Every numbered step is observable and replayable from the logs.

---

## 5. Multi-tenancy & FounderOS path

- Every persisted row carries `tenant_id`; Postgres **Row-Level Security** enforces isolation.
- The single-operator deployment is just **one tenant**. Becoming FounderOS SaaS means enabling
  signups and per-tenant billing — no schema or boundary changes.
- No module may read another tenant's data; the platform layer is the only place tenancy is enforced.

**Founder Intelligence System (FIS):** the multi-tenant productization is additive, not a rewrite — the
platform was tenant-first from ADR-0001. Five separations (memory, businesses, agents, dashboards,
automation) were already tenant-scoped; billing, permissions, and knowledge were made first-class
(`tenancy.ts`, migrations `0008`/`0009`, `PermissionChecker`). A cross-tenant isolation test proves the
nine engines isolate two tenants with zero code changes. See
[`docs/FOUNDER_INTELLIGENCE_SYSTEM.md`](./docs/FOUNDER_INTELLIGENCE_SYSTEM.md) and
[`docs/adr/ADR-0010`](./docs/adr/ADR-0010-founder-intelligence-system.md).

---

## 6. AI cost & safety posture (summary)

- AI calls are **feature-flagged** and **manually triggered** by default.
- Results are **cached by content hash** (`ai_cache`) to avoid repeat spend.
- Every AI call is **logged** (tokens, model, cost estimate) and **rate-limited**.
- Cheapest viable model per task; deterministic logic preferred before any model call.

Full policy: [`docs/COST_CONTROL_PLAN.md`](./docs/COST_CONTROL_PLAN.md).

---

## 7. What is intentionally NOT here yet

- Concrete module business logic.
- Concrete agent implementations (only the contract + one reference stub).
- Frontend / FounderOS web app.
- Billing, signups, external connectors.

These are sequenced in [`docs/BUILD_PLAN.md`](./docs/BUILD_PLAN.md).
