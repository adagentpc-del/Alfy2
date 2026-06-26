# @alfy2/core

The kernel. Depends only on `@alfy2/shared` and `@alfy2/config`. Knows nothing about any specific
module or agent — it operates entirely through contracts.

## Subfolders (implemented from Phase 1)
- `registry/` — module & agent registries (load, validate manifests/registrations, resolve by key).
- `orchestration/` — Planner interface, Dispatcher (transport-abstracted), Approval Gate, Signal→Action assembler.
- `logging/` — append-only Event Log & Decision Log writers; structured logger.
- `ai/` — **the only place model calls happen**: flag check → content-hash cache → budget → usage ledger.
- `memory/` — the **Memory Engine** (Alfy²'s permanent brain): `MemoryEngine` over a `MemoryRepository`
  port, deterministic retrieval/pruning scoring, in-memory reference store. See `docs/MEMORY_ENGINE.md`.
- `decision/` — the **Decision Engine** (triage cortex): classifies any input and scores it across
  urgency/importance/difficulty/effort/revenue/risk, deriving approvals, agents, deadline, and
  automations. Deterministic, behind a swappable classifier port. See `docs/DECISION_ENGINE.md`.
- `chief-of-staff/` — the **Chief of Staff** (executive layer): synthesizes a structured daily briefing
  from decisions + memory. **Coordinates only — holds no dispatcher/AI/write access, executes nothing.**
  See `docs/CHIEF_OF_STAFF.md`.
- `agent-factory/` — the **Agent Factory** (self-extension): detects recurring responsibilities,
  recommends an agent, and (approval-gated) generates + registers a full agent so the orchestrator can
  use it immediately. Side effects only via `FileWriter`/`AgentRegistrar` ports. See `docs/AGENT_FACTORY.md`.
- `business/` — the **Business Template**: one canonical 12-department framework; `BusinessFactory`
  instantiates each business with the same framework but isolated `business_id`/data. See `docs/BUSINESS_TEMPLATE.md`.
- `personal-os/` — **Personal OS** (life layer): 12 modules over the Memory Engine; reuse if known,
  ask once if not, remember forever, auto-prepare next time. Reads are non-mutating. See `docs/PERSONAL_OS.md`.
- `idea-builder/` — the **Idea Builder**: "I have an idea." → a fifteen-section workup that **never
  builds until approved** (`handoff()` throws otherwise). Deterministic. See `docs/IDEA_BUILDER.md`.
- `pattern-engine/` — the **Pattern Engine**: observes behavior (14 signals), finds bottlenecks, recommends
  automations/agents/workflow changes. **Advisory only (never acts) and always explains.** v2 adds
  `insights.ts` (`detectStrengths`/`detectRepeatingMistakes`/`detectSuccessfulHabits`/
  `scheduleRecommendations`) surfacing strengths/repeating mistakes/successful habits/schedule
  recommendations. See `docs/PATTERN_ENGINE.md`.
- `tenancy/` — **Founder Intelligence System** tenant-scoped permissions: `PermissionChecker` over role
  grants (a grant in one tenant confers nothing in another). See `docs/FOUNDER_INTELLIGENCE_SYSTEM.md`.
- `executive-inbox/` — the **Executive Inbox**, the single entry point: drop anything →
  `ExecutiveInbox.process()` identifies, classifies, routes, links, saves, and gates it, composing the
  Decision + Memory engines. See `docs/EXECUTIVE_INBOX.md`.
- `model-router/` — the **Model Router**: provider-agnostic model selection per task type with a
  cross-provider fallback chain. Models are registry data; the AI Gateway executes. See `docs/MODEL_ROUTER.md`.
- `connector-registry/` — the **Connector Registry**: modular, non-hard-coded integrations carrying
  permissions/auth/risk/actions/health/sync. Tenant-scoped. See `docs/CONNECTOR_REGISTRY.md`.
- `github-intelligence/` — the **GitHub Intelligence System**: statically vets repos (**never executes**
  — `executed: false`), 10-dimension eval + 8-class security review → SAFE/NEEDS REVIEW/DO NOT USE,
  business case for safe repos, approval-gated Asset Library. See `docs/GITHUB_INTELLIGENCE.md`.
- `assets/` — the **Global Asset Library**: every business's assets (24 types) in one tenant-scoped
  catalog; **global search that maintains permissions** (private/sensitive gated by role). See `docs/GLOBAL_ASSET_LIBRARY.md`.
- `security/` — the **Enterprise Security** layer: `SecurityGate` is the chokepoint every action passes
  through (deterministic policy), with an append-only `AuditLog` (**audit everything**), a role-gated
  `ApprovalQueue`, a references-only `SecretVault` (value never stored, with rotation), a `SessionManager`,
  and a `PermissionGroupRegistry`. **Least privilege** (agents default read-only); the six sensitive
  classes **always require approval — even the owner**. Reuses tenancy permissions via resolvers. See `docs/ENTERPRISE_SECURITY.md`.
- `goal/` — the **Goal Engine**: turns any goal (9 types) into action — analyzes current/desired/gap,
  constraints, resources, opportunities and **three paths** (fastest/lowest-resistance/highest-ROI, with a
  recommendation), then generates a weekly plan, daily priorities, agents, automations, expected
  completion, and risk analysis. Composes the Decision Engine; deterministic. Pursued until
  completed/paused/cancelled/review_required; changes auto-recalculate (re-analyze, re-plan, version bump).
  See `docs/GOAL_ENGINE.md`.
- `persistent-approval/` — **Persistent Approval**: `PersistentApprovalRegistry` of **standing grants**
  (7 grant types) that **approve a workflow once** — each grant stores scope/expiration/limits/success
  metrics/review schedule, with `scope.ts` doing the `covers`/`isLive`/`matchesScope`/`withinLimits`
  matching. **Additively layered on the Security Gate**: a covering grant pre-approves a would-be approval
  (audited allow, one use recorded), no re-queue; grants **auto-expire into review**; bounded and
  production-excluded by default. See `docs/PERSISTENT_APPROVAL.md`.
- `campaign/` — **Campaign Intelligence**: `CampaignEngine` runs campaigns across **6 types** (`email`,
  `social`, `landing_page`, `funnel`, `outreach`, `lead_nurturing`), each shipping an **A/B** variant pair
  + success metrics + stop conditions (`templates.ts`). **Auto-reporting** (`report.ts`) picks the winner
  by conversion rate (min-conversions guard), computes lift, and emits recommendations. After approval it
  runs on **autopilot** until one of five stop conditions fires (goal reached/performance drop/risk
  increase/approval expired/pause, recorded in `stop_reason`); **monthly optimization** shifts traffic to
  the winner (70/30) and bumps the version. Composes the Goal Engine + Persistent Approval; deterministic.
  See `docs/CAMPAIGN_INTELLIGENCE.md`.
- `opportunity/` — **Opportunity Intelligence**: `OpportunityEngine` (`engine.ts`) relates the **10 entity
  sources** (`contact`, `business`, `vendor`, `investor`, `client`, `idea`, `github_repo`, `asset`,
  `conversation`, `market_trend`) and surfaces ranked opportunities; `matchers.ts` detects the **7
  relationship kinds** (`fit`/`introduction`/`solves`/`investment`/`partnership`/`synergy`/
  `trend_tailwind`); `scoring.ts` does the **5-dimension scoring** (revenue/probability/effort/risk/
  strategic_value) + weighted composite (effort & risk inverted), storing the sub-scores so it can re-sort
  by any dimension. `surface(threshold)` promotes new→surfaced and `top(n)` ranks; re-analysis **dedupes by
  signature** (`kind|source|target`), preserving decisions. Composes GitHub Intelligence/assets/businesses/
  contacts; deterministic. See `docs/OPPORTUNITY_INTELLIGENCE.md`.
- `agent-observability/` — **Agent Observability**: `AgentObservability` (`observer.ts`) records **every
  agent action append-only with full provenance** (agent name/task/input/tools used/memory used/decision/
  rationale/approval status/cost/runtime/outcome/errors/downstream effects/value/risk). `explain()` answers
  the four questions (what did it do/why/what data/what changed); `dashboard()` computes performance, failed
  actions, cost by agent, ROI by agent, risky actions, approval bottlenecks, and repeated failures. See `docs/AGENT_OBSERVABILITY.md`.
- `simulation/` — the **Simulation Engine**: `simulate()` (`engine.ts` + `models.ts`) models **8 kinds**
  (`campaign_outcome`, `revenue_path`, `hiring_vs_automation`, `pricing_change`, `priority_shift`,
  `cash_flow`, `implementation_risk`, `agent_failure`) and returns best/likely/worst `ScenarioCase`
  (assumptions + projection + narrative + probability), risks, a recommendation, `decision_needed`, and an
  `expected_value`. Deterministic. See `docs/SIMULATION_ENGINE.md`.
- `ai-coe/` — the **AI Center of Excellence** (internal standards layer): `AiCenterOfExcellence`
  (`engine.ts` + `standards.ts`) maintains a library of approved standards across **11 kinds** (`prompt`,
  `agent_template`, `workflow_template`, `security_standard`, `data_standard`, `naming_convention`,
  `testing_standard`, `documentation_standard`, `escalation_rule`, `model_usage_rule`, `cost_control`);
  `checkCompliance(target)` validates **every new agent/workflow/connector** (naming/testing/docs/
  model-usage/cost/security rules), passing only with no error-severity violations. See `docs/AI_CENTER_OF_EXCELLENCE.md`.
- `workflow-roi/` — **Workflow ROI Tracking**: `WorkflowRoiTracker` (`engine.ts`) tracks per-automation
  metrics (time saved/revenue/cost reduced/errors reduced/risk reduced/conversion improvement/operating
  cost/model-tool cost/human time), computes **value vs cost and ROI**, ranks workflows, and recommends
  **scale/pause/improve/delete**. See `docs/WORKFLOW_ROI_TRACKING.md`.
- `domain-model/` — **Domain Operating Models**: `DomainOperatingModelFactory` (`factory.ts` +
  `templates.ts`) stands up a full operating model for **each of 11 domains** (`sales`, `marketing`,
  `finance`, `operations`, `legal_risk`, `customer_success`, `product`, `recruiting`, `personal_admin`,
  `health`, `asset_management`), each with goals/workflows/agents/KPIs/assets/approvals/dashboards/
  escalation rules **deep-cloned from canonical templates**; `create()` + `createAll()`. See `docs/DOMAIN_OPERATING_MODELS.md`.
- `agent-identity/` — **Agent Identity & Zero Trust**: `AgentIdentityRegistry` (`registry.ts`) gives every
  agent a **unique, scoped, revocable identity** that starts **deny-by-default / read-only** (no money, no
  external messages, no production, no deletion, no tools); capabilities/tools/data boundaries/limits open
  **only via `grant()`**; `evaluate(request)` returns **allow/deny/needs_approval** per request under **zero
  trust**; `suspend()`/`revoke()`. **Complements the Security Gate** (the gate checks the action, identity
  checks who). See `docs/AGENT_IDENTITY_ZERO_TRUST.md`.
- `source-of-truth/` — **Source-of-Truth Management**: `SourceOfTruthRegistry` (`registry.ts`) distinguishes
  **9 knowledge kinds** (`verified_fact`, `assumption`, `outdated`, `user_preference`, `inferred_pattern`,
  `external_research`, `document`, `contact`, `financial_data`); every record carries source/confidence/
  freshness/owner/`last_verified_at`/`update_trigger`, with **freshness** (`fresh`/`aging`/`stale`/`expired`)
  derived from a **per-kind verification TTL**. `record`/`verify`/`markOutdated`/`refreshAll`/
  `needsVerification`/`query`. See `docs/SOURCE_OF_TRUTH.md`.
- `control-tower/` — the **Executive Control Tower** (operator dashboard): `ControlTower` (`engine.ts`)
  `assemble(input)` builds **one read-only snapshot** with cash (computed **runway**), revenue pipeline,
  goals, active campaigns, blocked deals, risks, agent performance, approvals needed, **top-3 priorities**
  (computed), business health, opportunities (ranked), workflows running, and the monthly/quarterly review
  queue. Snapshots stored **immutably**. See `docs/EXECUTIVE_CONTROL_TOWER.md`.
- `playbook/` — the **Enterprise Playbook Generator**: `PlaybookGenerator` (`generator.ts`) generates, per
  business/domain, a full playbook spanning **10 artifact kinds** (SOPs, workflows, scripts, checklists,
  onboarding docs, training docs, role scorecards, KPIs, escalation rules, client-facing assets),
  **composing the Domain Operating Models' `DOMAIN_TEMPLATES`**; `generate()` + `generateAll()`. See `docs/ENTERPRISE_PLAYBOOK_GENERATOR.md`.
- `portfolio/` — the **Strategic Portfolio Optimizer**: `PortfolioOptimizer` (`optimizer.ts`) analyzes **all
  businesses together**, scores each across **10 dimensions** (revenue potential, speed to cash, effort
  required, stress cost, strategic value, current traction, operational drag, capital required, team
  dependency, monetization path), ranks by **composite**, and recommends `focus_now`/`delegate`/`automate`/
  `pause`/`kill`/`package_for_sale`. See `docs/STRATEGIC_PORTFOLIO_OPTIMIZER.md`.
- `knowledge-ingestion/` — the **Knowledge Ingestion Engine**: `KnowledgeIngestionEngine` (`engine.ts`)
  processes **11 source types** (`book`, `pdf`, `youtube_transcript`, `podcast`, `course`, `article`,
  `screenshot`, `note`, `video`, `github_repo`, `competitor_page`) through a **10-step pipeline** (summarize,
  frameworks, tactics, business applications, which business, monetization use cases, SOPs, agent
  suggestions, Asset Library reference, link goals/campaigns/businesses). See `docs/KNOWLEDGE_ENGINES.md`.
- `knowledge-to-action/` — the **Knowledge-to-Action Converter**: `KnowledgeToActionConverter`
  (`converter.ts`) turns **every useful idea into an action** with **10 fields** (action item, business use
  case, implementation plan, revenue hypothesis, required assets, required agents, test plan, owner,
  deadline, dashboard card) plus a **reusable operating manual (IP)**; disposition `use_now`/`save_for_later`/
  `ignore`/`convert_to_campaign`. See `docs/KNOWLEDGE_ENGINES.md`.
- `conversion/` — the **Conversion Engine**: `ConversionEngine` (`engine.ts`) tracks and improves **11
  surfaces** (landing pages, offers, hooks, CTAs, emails, DMs, sales calls, decks, proposals, follow-ups,
  checkout flows); per business maintains baseline, active tests, winning/losing copy, objections, best
  offers, and next optimization; **A/B winners are decided by revenue per unit, not vanity conversion**.
  See `docs/REVENUE_EXECUTION_LAYER.md`.
- `follow-up/` — the **Follow-Up Execution Engine**: `FollowUpExecutionEngine` (`engine.ts`) tracks **9
  entity kinds** (leads, warm contacts, deals, vendors, investors, clients, partners, unanswered emails,
  stale opportunities) through sequences, reminders, approval queue, no-response handling, escalation, and
  reactivation; **after approval keeps going** until response/goal/sequence complete/risk/pause. See `docs/REVENUE_EXECUTION_LAYER.md`.
- `revenue/` — the **Revenue Command System**: `RevenueCommandSystem` (`command.ts`) per business computes
  the **fastest path to cash, easiest offer to sell, best lead source, highest-ROI campaign, stuck deals,
  next money action, and weighted pipeline**. See `docs/REVENUE_EXECUTION_LAYER.md`.
- `sales-asset/` — the **Sales Asset Generator**: `SalesAssetGenerator` (`generator.ts`) generates **12 sales
  asset kinds** (one-pager, pitch deck, investor deck, sales deck, proposal, email sequence, DM script, call
  script, objection handling, FAQ, case study template, onboarding packet) per business, **saving each to the
  Asset Library**. See `docs/REVENUE_EXECUTION_LAYER.md`.
- `execution-queue/` — the **Execution Queue**: `ExecutionQueue` (`queue.ts`) holds **8 buckets** (ideas,
  tasks, approved actions, blocked actions, waiting on Alyssa, automated workflows, money actions, risk
  actions) with priority order **revenue > risk > deadlines > follow-up > operations > personal_admin >
  nice_to_have**; `next()` returns the **highest-priority actionable item**, skipping blocked and
  waiting-on-Alyssa items. See `docs/REVENUE_EXECUTION_LAYER.md`.

## Invariants
- Irreversible `next_actions` cannot bypass the Approval Gate (enforced in Dispatcher).
- No model call outside `ai/`.
- Every state change emits an `event`.
