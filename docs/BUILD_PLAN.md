# Alfy² — Build Plan

Small, controlled steps. Each phase is independently reviewable and leaves the repo green.
**This repository currently completes Phase 0.** Later phases are scoped, not built.

---

## Phase 0 — Foundation (this delivery) ✅ scope

- [x] Architecture, PRD, tech spec, cost-control plan.
- [x] Coding standards, naming conventions, config system, folder hierarchy, startup sequence.
- [x] Monorepo skeleton: packages, services, workers, modules, infra placeholders.
- [x] Root manifests, base TS config, Python worker project, `.env.example`.
- [x] ADR-0001 (stack & repo shape), GLOSSARY, SECURITY, CHANGELOG.

Exit criteria: clean clone installs; `pnpm run check` passes; structure matches docs.

## Phase 1 — Platform spine (no features) ✅ complete
- [x] Supabase migrations for platform tables (§TECH_SPEC 5) with RLS deny-by-default; `events`/`audit_log` append-only; seed default tenant.
- [x] `packages/shared`: Zod contracts (Task, SignalToAction, ModuleManifest, AgentRegistration) + Pydantic mirror in `workers/`, kept in lockstep and proven by shared fixtures (7 contract tests green).
- [x] `packages/config`: layered loader (defaults→file→env→flags) + Zod schema validation + boot-fail + secret redaction.
- [x] `packages/core`: module/agent registries, append-only Event/Decision log ports, Approval Gate, Dispatcher (HTTP transport, queue-ready), Signal→Action assembler, AI Gateway (flag→cache→budget→usage). `tsc -b` clean.

## Phase 2 — Orchestration loop (one reference path)
- [ ] `services/api`: auth, tenant resolution, rate limit, validation, `/healthz` `/readyz`.
- [ ] `services/orchestrator`: planner interface, dispatcher (HTTP transport), Signal→Action assembler.
- [ ] One **reference agent** in `workers/` implementing the Task contract end-to-end (echo/no-op).
- [ ] One **reference module** producing a trivial plan — proves the loop, ships no business value.

## Phase 3 — AI gateway & memory
- [x] `packages/core/ai`: flag → cache → budget → usage pipeline. *(delivered in Phase 1)*
- [x] **Memory Engine** — contracts, engine (remember/recall/reinforce/revise/supersede/link/prune),
  scoring, in-memory store, Supabase schema, smoke test. See `docs/MEMORY_ENGINE.md`.
- [ ] Wire the Supabase-backed `MemoryRepository` (replaces the in-memory reference) — Phase 2.
- [ ] Planner personalization hook (read memory when building plans).

## Phase 3.5 — Decision Engine ✅ complete
- [x] Decision contracts (`packages/shared`) + Pydantic mirror (contract suite 19 tests green).
- [x] `DecisionEngine` (`packages/core/decision`): multi-label classification + dimension scorers +
  routing (approvals, agents, deadline, automations), deterministic, behind a classifier port.
- [x] `scripts/decision-smoke.mts` verifies end-to-end. See `docs/DECISION_ENGINE.md`.
- [ ] Optional later: AI classifier behind the AI Gateway; persist decisions as `decision` memories.

## Phase 3.6 — Chief of Staff (executive layer) ✅ complete
- [x] Briefing contracts (`packages/shared`) + Pydantic mirror (contract suite 22 tests green).
- [x] `ChiefOfStaff.brief()` (`packages/core/chief-of-staff`): all eleven sections + dashboard, built
  from Decision Engine + memory, deterministic, **executes nothing**.
- [x] `MemoryEngine.peek` (non-mutating read) for side-effect-free context.
- [x] `scripts/chief-of-staff-smoke.mts` verifies sections + the never-executes invariant. See `docs/CHIEF_OF_STAFF.md`.

## Phase 3.7 — Agent Factory (self-extension) ✅ complete
- [x] Factory contracts (`packages/shared`) + Pydantic mirror (contract suite 28 tests green).
- [x] `AgentFactory` (`packages/core/agent-factory`): `recommend()` / `draftBlueprint()` /
  approval-gated `generate()`; full agent scaffold + registration via `FileWriter`/`AgentRegistrar` ports.
- [x] `scripts/agent-factory-smoke.mts` verifies detect → approve-gate → generate → register →
  orchestrator dispatch. See `docs/AGENT_FACTORY.md`.

## Phase 3.8 — Business Template ✅ complete
- [x] Business contracts (`packages/shared`) + Pydantic mirror (contract suite 34 tests green).
- [x] Canonical 12-department `BUSINESS_TEMPLATE` + `BusinessFactory.create()` (same framework,
  isolated `business_id`/data, deep-cloned specs).
- [x] Supabase migrations `0005_business.sql` / `0006_business_rls.sql` (tenant_id + business_id + RLS).
- [x] `scripts/business-smoke.mts` verifies same-framework + isolated-data. See `docs/BUSINESS_TEMPLATE.md`.

## Phase 3.9 — Personal OS (life layer) ✅ complete
- [x] Personal OS contracts (`packages/shared`) + Pydantic mirror (contract suite 42 tests green).
- [x] 12-module catalog + `PersonalOS` (`packages/core/personal-os`): resolve / remember / prepare over
  the Memory Engine; reuse-or-ask-once, upsert, non-mutating reads.
- [x] MemoryKind extended (`pet`/`trip`/`goal`) + migration `0007_memory_kinds_personal.sql`.
- [x] `scripts/personal-os-smoke.mts` verifies the dealership flow. See `docs/PERSONAL_OS.md`.

## Phase 3.10 — Idea Builder ✅ complete
- [x] Idea Builder contracts (`packages/shared`) + Pydantic mirror (contract suite 47 tests green).
- [x] `IdeaBuilder` (`packages/core/idea-builder`): trigger phrase, 15-section deterministic workup,
  Decision+Memory integration, hard approval gate (`handoff()` throws `IdeaApprovalError`).
- [x] `scripts/idea-builder-smoke.mts` verifies sections + the no-build-until-approved gate. See `docs/IDEA_BUILDER.md`.

## Phase 3.11 — Pattern Engine ✅ complete
- [x] Pattern Engine contracts (`packages/shared`) + Pydantic mirror (contract suite 52 tests green).
- [x] `PatternEngine.analyze()` (`packages/core/pattern-engine`): deterministic analyzers, bottleneck
  detection, recommendations (automations/agents/workflows). Advisory-only + always-explain invariants.
- [x] `scripts/pattern-engine-smoke.mts` verifies detection + both invariants. See `docs/PATTERN_ENGINE.md`.

## Phase 3.12 — Executive Inbox (single entry point) ✅ complete
- [x] Executive Inbox contracts (`packages/shared`) + Pydantic mirror (contract suite 64 tests green).
- [x] `ExecutiveInbox.process()` (`packages/core/executive-inbox`): detection + classification +
  composition of Decision/Memory + business matching + approval gate → `ProcessedInboxItem`.
- [x] Supabase migrations `0010`/`0011` (`inbox_items`, RLS).
- [x] `scripts/executive-inbox-smoke.mts` drops 5 item kinds and verifies routing. See `docs/EXECUTIVE_INBOX.md`.

## Phase 3.13 — Model Router & Connector Registry ✅ complete
- [x] Model Router contracts + `ModelRouter` (provider-agnostic, cross-provider fallback, registry-as-data).
- [x] Connector Registry contracts + `ConnectorRegistry` (modular, non-hard-coded, tenant-scoped) +
  migrations `0012`/`0013`. Pydantic mirrors (contract suite 70 tests green).
- [x] `scripts/router-connector-smoke.mts` verifies routing + modular connectors. See `docs/MODEL_ROUTER.md`, `docs/CONNECTOR_REGISTRY.md`.

## Phase 3.14 — GitHub Intelligence System ✅ complete
- [x] Contracts + Pydantic mirror (contract suite 77 tests green; `executed=true` rejected).
- [x] `GitHubIntelligence` (`packages/core/github-intelligence`): static scan (never executes),
  10-dimension eval, 8-class security review, verdict, business case (safe only), approval-gated Asset Library.
- [x] Supabase migrations `0014`/`0015` (`repo_assessments` with `executed=false` CHECK, `asset_library`, RLS).
- [x] `scripts/github-intelligence-smoke.mts` verifies verdicts + never-execute + gate. See `docs/GITHUB_INTELLIGENCE.md`.

## Phase 3.15 — Global Asset Library ✅ complete
- [x] Asset contracts + Pydantic mirror (contract suite 82 tests green).
- [x] `GlobalAssetLibrary` (`packages/core/assets`): 24 types, permission-aware global search,
  relationships/version/usage/approval. Reuses tenancy roles via a resolver.
- [x] Supabase migrations `0016`/`0017` (`assets` + RLS, generated search_tsv).
- [x] `scripts/global-assets-smoke.mts` verifies global search + permission gating. See `docs/GLOBAL_ASSET_LIBRARY.md`.

## Phase 3.16 — Enterprise Security ✅ complete
- [x] Security contracts + Pydantic mirror (`SecurityDecision`, `AuditEntry`, `ApprovalRequest`,
  `PermissionGroup`, `SecretRef` with `value_stored=false`, `Session`; python suite 93 passing).
- [x] `SecurityGate` (`packages/core/security`): deterministic policy chokepoint, append-only `AuditLog`
  (audit everything), role-gated `ApprovalQueue`, references-only `SecretVault` (rotation),
  `SessionManager`, `PermissionGroupRegistry`. Least privilege (agents default read-only); the six
  sensitive classes ALWAYS require approval (even owner). Reuses tenancy `PermissionChecker` via resolvers.
- [x] Supabase migrations `0018`/`0019` (append-only `security_audit`, `approval_requests`,
  `permission_groups`, `secrets` with `value_stored=false` CHECK, `sessions`; deny-by-default RLS).
- [x] `scripts/security-smoke.mts` runs 10 checks (gate, six classes, read-only default, audit-everything,
  vault references-only, role-gated approvals, sessions, groups, tenant isolation). See `docs/ENTERPRISE_SECURITY.md`.

## Phase 3.17 — Goal Engine ✅ complete
- [x] Goal contracts + Pydantic mirror (`GoalType` 9 types, `GoalStatus`, `PathKind`, `GoalPath`,
  `Constraint`/`Resource`/`Opportunity`, `RiskItem`, `WeeklyPlanItem`, `GoalAnalysis`, `GoalPlan`, `Goal`,
  `CreateGoalInput`, `GoalChange`; python suite 101 passing).
- [x] `GoalEngine` (`packages/core/goal`): situation analysis (current/desired/gap, constraints,
  resources, opportunities, three paths + recommended) + plan generation (weekly plan, daily priorities,
  agents, automations, expected completion, risk analysis). Composes the Decision Engine; deterministic.
  Pursued until completed/paused/cancelled/review_required; changes auto-recalculate (re-analyze,
  re-plan, version bump); progress reaching target auto-completes.
- [x] Supabase migrations `0020`/`0021` (`goals` with analysis/plan jsonb, `version`,
  `type`/`status`/`priority` CHECKs, `set_updated_at` trigger; deny-by-default RLS).
- [x] `scripts/goal-engine-smoke.mts` runs 7 checks (analysis + three paths, plan generation, lifecycle
  pursuit, change recalculation, progress auto-completion, terminal states, tenant isolation). See `docs/GOAL_ENGINE.md`.

## Phase 3.18 — Persistent Approval ✅ complete
- [x] Persistent Approval contracts + Pydantic mirror (`GrantType` 7 types, `ReviewSchedule`,
  `ApprovalLifecycleStatus`, `ApprovalScope`, `ApprovalLimits`, `PersistentApproval`,
  `CreatePersistentApprovalInput`; python suite 110 passing).
- [x] `PersistentApprovalRegistry` (`packages/core/persistent-approval`): `grant`, `authorize`/match,
  `expireDue`, `expireForGoal`, `renew`, `revoke`, `list`; `scope.ts` (`covers`/`isLive`/`matchesScope`/
  `withinLimits`). Approve a workflow once — every grant stores scope, expiration, limits, success
  metrics, and review schedule. Auto-expires into review; bounded by scope/amount/use-count/environment/
  expiry/review cadence; production excluded by default.
- [x] **Additive Security Gate integration**: optional `persistentApprovals` registry; a covering
  (live + in-scope + within-limits) grant turns a would-be approval into an audited allow (records one
  use, references the grant), no re-queue. With no registry the gate is unchanged.
- [x] Supabase migrations `0022`/`0023` (`persistent_approvals` with scope/limits jsonb, `status`,
  `expires_at`/`next_review_at`, `set_updated_at` trigger; deny-by-default RLS).
- [x] `scripts/persistent-approval-smoke.mts` (`pnpm run approval:smoke`) runs 9 checks, all passing; the
  Enterprise Security smoke still passes unchanged. See `docs/PERSISTENT_APPROVAL.md`.

## Phase 3.19 — Campaign Intelligence ✅ complete
- [x] Campaign contracts + Pydantic mirror (`CampaignType` 6 types, `CampaignStatus`, `StopReason`,
  `VariantKey`, `Variant`, `CampaignSuccessMetric`, `VariantResult`, `CampaignRecommendation`,
  `CampaignReport`, `StopConditions`, `Campaign`, `CreateCampaignInput`, `CampaignMetricsInput`,
  `AssessSignals`; success-metric/recommendation types `Campaign`-prefixed to avoid collisions; python
  suite 119 passing).
- [x] `CampaignEngine` (`packages/core/campaign`): `engine.ts` runs the six campaign types, `templates.ts`
  the per-type A/B variant pair + default success metric, `report.ts` the winner/lift/recommendations.
  Every campaign ships an A/B variant pair + success metrics + stop conditions; automatic reporting picks
  the winner by conversion rate (min-conversions guard), computes lift, summary, and recommendations.
  Composes the Goal Engine + Persistent Approval; deterministic.
- [x] **Autopilot**: after approval a campaign runs until one of five stop conditions fires — goal reached
  (→ completed), approval expired, risk increase, performance drop, or pause — recorded in `stop_reason`.
  Monthly optimization shifts traffic to the winner (70/30) and bumps the version.
- [x] Supabase migrations `0024`/`0025` (`campaigns` with variants/success_metrics/stop_conditions/
  latest_report jsonb, `status`, `stop_reason`, `version`, `set_updated_at` trigger; deny-by-default RLS).
- [x] `scripts/campaign-intelligence-smoke.mts` (`pnpm campaign:smoke`) runs 6 checks, all passing.
  See `docs/CAMPAIGN_INTELLIGENCE.md`.

## Phase 3.20 — Opportunity Intelligence ✅ complete
- [x] Opportunity contracts + Pydantic mirror (`EntityKind` 10 types, `RelationshipKind` 7 types,
  `OpportunityStatus`, `EntityRef`, `OpportunityScore`, `Opportunity`, `AnalyzeInput`, `ScoreWeights`;
  the TS `Opportunity`/`OpportunitySchema` exported from the shared barrel aliased as
  `OpportunityIntel`/`OpportunityIntelSchema` — mirrored in Pydantic as `OpportunityIntel` — to avoid
  colliding with the Goal Engine's `Opportunity`; python suite 127 passing).
- [x] `OpportunityEngine` (`packages/core/opportunity`): `engine.ts` continuously analyzes the ten entity
  sources and surfaces ranked opportunities, `matchers.ts` detects relationships, `scoring.ts` the
  5-dimension scoring + composite. Finds `fit`/`solves`/`investment`/`introduction`/`synergy`/
  `trend_tailwind`/`partnership` relationships (e.g. "this developer also fits Divini Procure", "this
  GitHub repo solves Move Mi"). Composes GitHub Intelligence verdicts/assets/businesses/contacts;
  deterministic.
- [x] **5-dimension scoring + composite ranking**: every opportunity scored on revenue/probability/effort/
  risk/strategic_value plus a weighted composite (effort & risk inverted); the five sub-scores stored so
  it can be re-sorted by any dimension.
- [x] **Automatic surfacing & dedupe**: `surface(threshold)` promotes new→surfaced above the composite
  threshold; `accept`/`dismiss`/`markActed`/`top(n)` lifecycle. Re-analysis upserts by signature
  (`kind|source|target`) — no duplicates, decisions preserved.
- [x] Supabase migrations `0026`/`0027` (`opportunities` with source/target/scores/evidence/
  recommended_agents jsonb, `kind`, `status`, `set_updated_at` trigger; deny-by-default RLS).
- [x] `scripts/opportunity-intelligence-smoke.mts` (`pnpm opportunity:smoke`) runs 7 checks, all passing.
  See `docs/OPPORTUNITY_INTELLIGENCE.md`.

## Phase 3.21 — Pattern Engine v2 ✅ complete
- [x] Extended Pattern Engine contracts + Pydantic mirror: `BehaviorSignal` adds `focus`/`health`/
  `calendar`/`productivity` (now 14 signals); `PatternReport` adds `strengths[]`/`repeating_mistakes[]`/
  `successful_habits[]`/`schedule_recommendations[]` with new schemas `Strength`/`RepeatingMistake`/
  `SuccessfulHabit`/`ScheduleRec` (python suite 142 passing).
- [x] New analyzers `packages/core/src/pattern-engine/insights.ts` (`detectStrengths`/
  `detectRepeatingMistakes`/`detectSuccessfulHabits`/`scheduleRecommendations`) wired into the engine.
  Still advisory-only + always-explain.
- [x] Supabase migrations `0028`/`0029` (`pattern_observations` + `pattern_reports`, append-only).
- [x] `scripts/pattern-engine-v2-smoke.mts` (`pnpm patternv2:smoke`). Extends ADR-0009 (no new ADR). See `docs/PATTERN_ENGINE.md`.

## Phase 3.22 — Agent Observability ✅ complete
- [x] Agent Observability contracts (`packages/shared/src/contracts/agent-observability.ts`) + Pydantic
  mirror (python suite 142 passing).
- [x] `AgentObservability` (`packages/core/src/agent-observability/observer.ts`): records every agent action
  append-only with full provenance (agent name/task/input/tools used/memory used/decision/rationale/
  approval status/cost/runtime/outcome/errors/downstream effects/value/risk). `explain()` answers the four
  questions (what did it do/why/what data/what changed); `dashboard()` computes performance, failed
  actions, cost by agent, ROI by agent, risky actions, approval bottlenecks, and repeated failures.
- [x] Supabase migrations `0030`/`0031` (`agent_actions` append-only).
- [x] `scripts/agent-observability-smoke.mts` (`pnpm observability:smoke`). See `docs/AGENT_OBSERVABILITY.md`, `docs/adr/ADR-0020-agent-observability.md`.

## Phase 3.23 — Simulation Engine ✅ complete
- [x] Simulation contracts (`packages/shared/src/contracts/simulation.ts`) + Pydantic mirror (python suite
  142 passing).
- [x] `SimulationEngine` (`packages/core/src/simulation`): `engine.ts` + `models.ts`. `simulate()` models
  eight kinds (`campaign_outcome`, `revenue_path`, `hiring_vs_automation`, `pricing_change`,
  `priority_shift`, `cash_flow`, `implementation_risk`, `agent_failure`) and returns best/likely/worst
  `ScenarioCase` (assumptions + projection + narrative + probability), risks, a recommendation,
  `decision_needed`, and an `expected_value`. Deterministic.
- [x] Supabase migrations `0032`/`0033`.
- [x] `scripts/simulation-engine-smoke.mts` (`pnpm simulation:smoke`). See `docs/SIMULATION_ENGINE.md`, `docs/adr/ADR-0021-simulation-engine.md`.

## Phase 3.24 — AI Center of Excellence ✅ complete
- [x] AI CoE contracts (`packages/shared/src/contracts/ai-coe.ts`) + Pydantic mirror (python suite 157
  passing).
- [x] `AiCenterOfExcellence` (`packages/core/src/ai-coe`): `engine.ts` + `standards.ts`. Maintains a library
  of approved standards across 11 kinds (`prompt`, `agent_template`, `workflow_template`,
  `security_standard`, `data_standard`, `naming_convention`, `testing_standard`, `documentation_standard`,
  `escalation_rule`, `model_usage_rule`, `cost_control`); `checkCompliance(target)` validates every new
  agent/workflow/connector (naming/testing/docs/model-usage/cost/security rules), passing only with no
  error-severity violations.
- [x] Supabase migrations `0034`/`0035`.
- [x] `scripts/ai-coe-smoke.mts` (`pnpm coe:smoke`). See `docs/AI_CENTER_OF_EXCELLENCE.md`, `docs/adr/ADR-0022-ai-center-of-excellence.md`.

## Phase 3.25 — Workflow ROI Tracking ✅ complete
- [x] Workflow ROI contracts (`packages/shared/src/contracts/workflow-roi.ts`) + Pydantic mirror (python
  suite 157 passing).
- [x] `WorkflowRoiTracker` (`packages/core/src/workflow-roi/engine.ts`): tracks per-automation metrics (time
  saved/revenue/cost reduced/errors reduced/risk reduced/conversion improvement/operating cost/model-tool
  cost/human time), computes value vs cost and ROI, ranks workflows, and recommends scale/pause/improve/
  delete.
- [x] Supabase migrations `0036`/`0037`.
- [x] `scripts/workflow-roi-smoke.mts` (`pnpm roi:smoke`). See `docs/WORKFLOW_ROI_TRACKING.md`, `docs/adr/ADR-0023-workflow-roi-tracking.md`.

## Phase 3.26 — Domain Operating Models ✅ complete
- [x] Domain model contracts (`packages/shared/src/contracts/domain-model.ts`) + Pydantic mirror (python
  suite 157 passing).
- [x] `DomainOperatingModelFactory` (`packages/core/src/domain-model`): `factory.ts` + `templates.ts`. Stands
  up a full operating model for each of 11 domains (`sales`, `marketing`, `finance`, `operations`,
  `legal_risk`, `customer_success`, `product`, `recruiting`, `personal_admin`, `health`,
  `asset_management`), each with goals/workflows/agents/KPIs/assets/approvals/dashboards/escalation rules
  deep-cloned from canonical templates; `create()` + `createAll()`.
- [x] Supabase migrations `0038`/`0039`.
- [x] `scripts/domain-operating-models-smoke.mts` (`pnpm domain:smoke`). See `docs/DOMAIN_OPERATING_MODELS.md`, `docs/adr/ADR-0024-domain-operating-models.md`.

## Phase 3.27 — Agent Identity & Zero Trust ✅ complete
- [x] Agent Identity contracts (`packages/shared/src/contracts/agent-identity.ts`) + Pydantic mirror (python
  suite 172 passing).
- [x] `AgentIdentityRegistry` (`packages/core/src/agent-identity/registry.ts`): every agent gets a unique,
  scoped, revocable identity that starts deny-by-default / read-only (no money, no external messages, no
  production, no deletion, no tools); capabilities/tools/data boundaries/limits opened only via `grant()`;
  `evaluate(request)` returns allow/deny/needs_approval per request under zero trust; `suspend()`/`revoke()`.
  Complements the Security Gate (the gate checks the action, identity checks who).
- [x] Supabase migrations `0040`/`0041`.
- [x] `scripts/agent-identity-smoke.mts` (`pnpm identity:smoke`). See `docs/AGENT_IDENTITY_ZERO_TRUST.md`, `docs/adr/ADR-0025-agent-identity-zero-trust.md`.

## Phase 3.28 — Source-of-Truth Management ✅ complete
- [x] Source-of-Truth contracts (`packages/shared/src/contracts/source-of-truth.ts`) + Pydantic mirror
  (python suite 172 passing).
- [x] `SourceOfTruthRegistry` (`packages/core/src/source-of-truth/registry.ts`): distinguishes 9 knowledge
  kinds (`verified_fact`, `assumption`, `outdated`, `user_preference`, `inferred_pattern`,
  `external_research`, `document`, `contact`, `financial_data`); every record carries source/confidence/
  freshness/owner/`last_verified_at`/`update_trigger`; freshness (fresh/aging/stale/expired) derived from a
  per-kind verification TTL; `record`/`verify`/`markOutdated`/`refreshAll`/`needsVerification`/`query`.
- [x] Supabase migrations `0042`/`0043`.
- [x] `scripts/source-of-truth-smoke.mts` (`pnpm truth:smoke`). See `docs/SOURCE_OF_TRUTH.md`, `docs/adr/ADR-0026-source-of-truth.md`.

## Phase 3.29 — Executive Control Tower ✅ complete
- [x] Control Tower contracts (`packages/shared/src/contracts/control-tower.ts`, `Tower`-prefixed section
  types) + Pydantic mirror (python suite 172 passing).
- [x] `ControlTower` (`packages/core/src/control-tower/engine.ts`): `assemble(input)` builds one read-only
  snapshot with cash (computed runway), revenue pipeline, goals, active campaigns, blocked deals, risks,
  agent performance, approvals needed, top-3 priorities (computed), business health, opportunities (ranked),
  workflows running, and the monthly/quarterly review queue. Snapshots stored immutably.
- [x] Supabase migrations `0044`/`0045`.
- [x] `scripts/control-tower-smoke.mts` (`pnpm tower:smoke`). See `docs/EXECUTIVE_CONTROL_TOWER.md`, `docs/adr/ADR-0027-executive-control-tower.md`.

## Phase 3.30 — Enterprise Playbook Generator ✅ complete
- [x] Playbook contracts (`packages/shared/src/contracts/playbook.ts`) + Pydantic mirror (python suite 190
  passing).
- [x] `PlaybookGenerator` (`packages/core/src/playbook/generator.ts`): per business/domain, generates a full
  playbook spanning 10 artifact kinds (SOPs, workflows, scripts, checklists, onboarding docs, training docs,
  role scorecards, KPIs, escalation rules, client-facing assets), composing the Domain Operating Models'
  `DOMAIN_TEMPLATES`; `generate()` + `generateAll()`.
- [x] Supabase migrations `0046`/`0047`.
- [x] `scripts/playbook-smoke.mts` (`pnpm playbook:smoke`). See `docs/ENTERPRISE_PLAYBOOK_GENERATOR.md`, `docs/adr/ADR-0028-enterprise-playbook-generator.md`.

## Phase 3.31 — Strategic Portfolio Optimizer ✅ complete
- [x] Portfolio contracts (`packages/shared/src/contracts/portfolio.ts`) + Pydantic mirror (python suite 190
  passing).
- [x] `PortfolioOptimizer` (`packages/core/src/portfolio/optimizer.ts`): analyzes all businesses together,
  scores each across 10 dimensions (revenue potential, speed to cash, effort required, stress cost, strategic
  value, current traction, operational drag, capital required, team dependency, monetization path), ranks by
  composite, and recommends focus_now/delegate/automate/pause/kill/package_for_sale.
- [x] Supabase migrations `0048`/`0049`.
- [x] `scripts/portfolio-smoke.mts` (`pnpm portfolio:smoke`). See `docs/STRATEGIC_PORTFOLIO_OPTIMIZER.md`, `docs/adr/ADR-0029-strategic-portfolio-optimizer.md`.

## Phase 3.32 — Knowledge Ingestion Engine ✅ complete
- [x] Knowledge Ingestion contracts (`packages/shared/src/contracts/knowledge-ingestion.ts`) + Pydantic
  mirror (python suite 190 passing).
- [x] `KnowledgeIngestionEngine` (`packages/core/src/knowledge-ingestion/engine.ts`): processes 11 source
  types (`book`, `pdf`, `youtube_transcript`, `podcast`, `course`, `article`, `screenshot`, `note`, `video`,
  `github_repo`, `competitor_page`) through a 10-step pipeline (summarize, frameworks, tactics, business
  applications, which business, monetization use cases, SOPs, agent suggestions, Asset Library reference,
  link goals/campaigns/businesses).
- [x] Supabase migrations `0050`/`0051`.
- [x] `scripts/knowledge-ingestion-smoke.mts` (`pnpm ingest:smoke`). See `docs/KNOWLEDGE_ENGINES.md`, `docs/adr/ADR-0030-knowledge-ingestion-engine.md`.

## Phase 3.33 — Knowledge-to-Action Converter ✅ complete
- [x] Knowledge-to-Action contracts (`packages/shared/src/contracts/knowledge-to-action.ts`) + Pydantic
  mirror (python suite 190 passing).
- [x] `KnowledgeToActionConverter` (`packages/core/src/knowledge-to-action/converter.ts`): turns every useful
  idea into an action with 10 fields (action item, business use case, implementation plan, revenue
  hypothesis, required assets, required agents, test plan, owner, deadline, dashboard card) plus a reusable
  operating manual (IP); disposition use_now/save_for_later/ignore/convert_to_campaign.
- [x] Supabase migrations `0052`/`0053`.
- [x] `scripts/knowledge-to-action-smoke.mts` (`pnpm k2a:smoke`). See `docs/KNOWLEDGE_ENGINES.md` (shared with the Knowledge Ingestion Engine), `docs/adr/ADR-0031-knowledge-to-action-converter.md`.

## Phase 3.34 — Conversion Engine ✅ complete
- [x] Conversion contracts (`packages/shared/src/contracts/conversion.ts`) + Pydantic mirror (python suite 211
  passing).
- [x] `ConversionEngine` (`packages/core/src/conversion/engine.ts`): tracks and improves 11 surfaces (landing
  pages, offers, hooks, CTAs, emails, DMs, sales calls, decks, proposals, follow-ups, checkout flows); per
  business maintains baseline, active tests, winning/losing copy, objections, best offers, next optimization;
  A/B winners decided by revenue per unit, not vanity conversion.
- [x] Supabase migrations `0054`/`0055`.
- [x] `scripts/conversion-smoke.mts` (`pnpm conversion:smoke`). See `docs/REVENUE_EXECUTION_LAYER.md`, `docs/adr/ADR-0032-conversion-engine.md`.

## Phase 3.35 — Follow-Up Execution Engine ✅ complete
- [x] Follow-Up contracts (`packages/shared/src/contracts/follow-up.ts`) + Pydantic mirror (python suite 211
  passing).
- [x] `FollowUpExecutionEngine` (`packages/core/src/follow-up/engine.ts`): tracks 9 entity kinds (leads, warm
  contacts, deals, vendors, investors, clients, partners, unanswered emails, stale opportunities) through
  sequences, reminders, approval queue, no-response handling, escalation, and reactivation; after approval
  keeps going until response/goal/sequence complete/risk/pause.
- [x] Supabase migrations `0056`/`0057`.
- [x] `scripts/follow-up-smoke.mts` (`pnpm followup:smoke`). See `docs/REVENUE_EXECUTION_LAYER.md`, `docs/adr/ADR-0033-follow-up-execution-engine.md`.

## Phase 3.36 — Revenue Command System ✅ complete
- [x] Revenue contracts (`packages/shared/src/contracts/revenue.ts`) + Pydantic mirror (python suite 211
  passing).
- [x] `RevenueCommandSystem` (`packages/core/src/revenue/command.ts`): per business computes fastest path to
  cash, easiest offer to sell, best lead source, highest-ROI campaign, stuck deals, next money action, and
  weighted pipeline.
- [x] Supabase migrations `0058`/`0059`.
- [x] `scripts/revenue-smoke.mts` (`pnpm revenue:smoke`). See `docs/REVENUE_EXECUTION_LAYER.md`, `docs/adr/ADR-0034-revenue-command-system.md`.

## Phase 3.37 — Sales Asset Generator ✅ complete
- [x] Sales Asset contracts (`packages/shared/src/contracts/sales-asset.ts`) + Pydantic mirror (python suite
  211 passing).
- [x] `SalesAssetGenerator` (`packages/core/src/sales-asset/generator.ts`): generates 12 sales asset kinds
  (one-pager, pitch deck, investor deck, sales deck, proposal, email sequence, DM script, call script,
  objection handling, FAQ, case study template, onboarding packet) per business, saving each to the Asset
  Library.
- [x] Supabase migrations `0060`/`0061`.
- [x] `scripts/sales-asset-smoke.mts` (`pnpm salesasset:smoke`). See `docs/REVENUE_EXECUTION_LAYER.md`, `docs/adr/ADR-0035-sales-asset-generator.md`.

## Phase 3.38 — Execution Queue ✅ complete
- [x] Execution Queue contracts (`packages/shared/src/contracts/execution-queue.ts`) + Pydantic mirror (python
  suite 211 passing).
- [x] `ExecutionQueue` (`packages/core/src/execution-queue/queue.ts`): 8 buckets (ideas, tasks, approved
  actions, blocked actions, waiting on Alyssa, automated workflows, money actions, risk actions); priority
  order revenue>risk>deadlines>follow-up>operations>personal_admin>nice_to_have; `next()` returns the
  highest-priority actionable item, skipping blocked and waiting-on-Alyssa items.
- [x] Supabase migrations `0062`/`0063`.
- [x] `scripts/execution-queue-smoke.mts` (`pnpm queue:smoke`). See `docs/REVENUE_EXECUTION_LAYER.md`, `docs/adr/ADR-0036-execution-queue.md`.

## Phase 3.39 — Don't Drop the Ball System ✅ complete
- [x] Don't Drop the Ball contracts (`packages/shared/src/contracts/dont-drop-ball.ts`) + Pydantic mirror.
- [x] `DontDropTheBallEngine` (`packages/core/src/dont-drop-ball/engine.ts`): detects 9 dropped-item kinds
  (forgotten leads, missed follow-ups, unfinished launches, abandoned ideas, stale campaigns, unpaid invoices,
  unsigned contracts, open loops, waiting-on responses) past per-kind staleness thresholds; surfaces daily
  ranked by value then age with a recommended action; approve assigns an agent to close the loop; re-scan
  dedupes by signature.
- [x] Supabase migrations `0064`/`0065`.
- [x] `scripts/dont-drop-ball-smoke.mts` (`pnpm ball:smoke`). See `docs/EXECUTION_SAFETY_NETS.md`, `docs/adr/ADR-0037-dont-drop-the-ball.md`.

## Phase 3.40 — Business Asset Checklist ✅ complete
- [x] Business Asset Checklist contracts (`packages/shared/src/contracts/asset-checklist.ts`) + Pydantic mirror.
- [x] `AssetChecklistEngine` (`packages/core/src/asset-checklist/engine.ts`): tracks the 25 key assets per
  business, showing present/missing and a completeness fraction; recommends the fastest, highest-leverage
  missing asset next by walking a priority order (offer first); advances the recommendation as assets are
  marked present; shows missing assets across businesses.
- [x] Supabase migrations `0066`/`0067`.
- [x] `scripts/asset-checklist-smoke.mts` (`pnpm checklist:smoke`). See `docs/EXECUTION_SAFETY_NETS.md`, `docs/adr/ADR-0038-business-asset-checklist.md`.

## Phase 3.41 — Money-First Operating Mode ✅ complete
- [x] Money-First contracts (`packages/shared/src/contracts/money-first.ts`) + Pydantic mirror.
- [x] `MoneyFirstMode` (`packages/core/src/money-first/mode.ts`): an activatable mode that prioritizes 9
  money-aligned focuses (cash collection, sales, follow-up, booked calls, proposals, invoices, high-conversion
  content, warm relationships, low-friction offers) and deprioritizes 5 (perfection, branding polish,
  unnecessary features, low-conversion ideas, research without action); classifies and reorders work
  money-first when active, passing through unchanged when off.
- [x] Supabase migrations `0068`/`0069`.
- [x] `scripts/money-first-smoke.mts` (`pnpm moneyfirst:smoke`). See `docs/EXECUTION_SAFETY_NETS.md`, `docs/adr/ADR-0039-money-first-operating-mode.md`.

## Phase 3.42 — Knowledge Vault ✅ complete
- [x] Knowledge Vault contracts (`packages/shared/src/contracts/knowledge-vault.ts`) + Pydantic mirror.
- [x] `KnowledgeVault` (`packages/core/src/knowledge-vault/vault.ts`): the front door over the Knowledge
  Ingestion Engine + Knowledge-to-Action Converter; accepts 13 input kinds (adds voice_note, meeting_notes,
  random_idea); extracts 11 fields (key ideas, frameworks, tactics, quotes, examples, business applications,
  monetization opportunities, related businesses, related agents, related assets, action items); saves the
  source to the Asset Library by reference; converts knowledge into action items.
- [x] Supabase migrations `0070`/`0071`.
- [x] `scripts/knowledge-vault-smoke.mts` (`pnpm vault:smoke`). See `docs/REVENUE_CHAIN.md`, `docs/adr/ADR-0040-knowledge-vault.md`.

## Phase 3.43 — Revenue Factory ✅ complete
- [x] Revenue Factory contracts (`packages/shared/src/contracts/revenue-factory.ts`) + Pydantic mirror.
- [x] `RevenueFactory` (`packages/core/src/revenue-factory/factory.ts`): a per-business money cockpit that
  computes the fastest path to cash, the easiest offer, the offer most likely to convert, the best warm
  contact, the lowest-effort action, and the highest-value follow-up, then names the single headline answer
  to "what do we do today to make money?".
- [x] Supabase migrations `0072`/`0073` (append-only).
- [x] `scripts/revenue-factory-smoke.mts` (`pnpm revfactory:smoke`). See `docs/REVENUE_CHAIN.md`, `docs/adr/ADR-0041-revenue-factory.md`.

## Phase 3.44 — Conversion War Room ✅ complete
- [x] Conversion War Room contracts (`packages/shared/src/contracts/war-room.ts`) + Pydantic mirror.
- [x] `ConversionWarRoom` (`packages/core/src/war-room/engine.ts`): A/B tests across 9 surfaces tracking the
  full funnel; the winner is decided on revenue per send, then booked calls, then qualified leads (never
  vanity opens/clicks) and only once each variant has the minimum sends; logs objections.
- [x] Supabase migrations `0074`/`0075`.
- [x] `scripts/war-room-smoke.mts` (`pnpm warroom:smoke`). See `docs/REVENUE_CHAIN.md`, `docs/adr/ADR-0042-conversion-war-room.md`.

## Phase 3.45 — Deal Desk ✅ complete
- [x] Deal Desk contracts (`packages/shared/src/contracts/deal-desk.ts`) + Pydantic mirror.
- [x] `DealDesk` (`packages/core/src/deal-desk/desk.ts`): one full-context record per opportunity (14
  fields), ranked by probability, revenue, speed, strategic value, or effort; always surfaces the next money
  move, the blocked deals, and the deals likely to die without action.
- [x] Supabase migrations `0076`/`0077`.
- [x] `scripts/deal-desk-smoke.mts` (`pnpm dealdesk:smoke`). See `docs/REVENUE_CHAIN.md`, `docs/adr/ADR-0043-deal-desk.md`.

## Phase 3.46 — Follow-Up Autopilot ✅ complete
- [x] Follow-Up Autopilot extends the Follow-Up Execution Engine contracts
  (`packages/shared/src/contracts/follow-up.ts`) + Pydantic mirror.
- [x] `FollowUpExecutionEngine` (`packages/core/src/follow-up/engine.ts`) extended: adds meeting_booked and
  deal_closed success stops and an escalation path that escalates only when human judgment is needed, with a
  new `escalated` status and `escalation_reason`.
- [x] Supabase migration `0078` (ALTER `follow_ups`).
- [x] `scripts/follow-up-autopilot-smoke.mts` (`pnpm autopilot:smoke`). See `docs/REVENUE_CHAIN.md`, `docs/adr/ADR-0044-follow-up-autopilot.md`.

## Phase 3.47 — Agent Evaluation Lab ✅ complete
- [x] Agent Evaluation Lab contracts (`packages/shared/src/contracts/agent-eval.ts`) + Pydantic mirror.
- [x] `AgentEvaluationLab` (`packages/core/src/agent-eval/lab.ts`): runs an agent against test tasks with
  expected outputs, failure cases, and risk checks, scoring accuracy/usefulness/cost/speed/reliability (each
  0..1; cost/speed inverse of cost/runtime); 6-stage ladder draft→testing→limited_use→approved→production→
  retired; pass = accuracy/reliability/usefulness all over threshold (default 0.8) and no risk flagged on a
  non-failure case; `promote()` into the gated stages (approved, production) throws unless passed — no
  `broad_permissions_allowed` without a pass. Composes Agent Identity & Zero Trust + AI Center of Excellence.
- [x] Supabase migrations `0079`/`0080`.
- [x] `scripts/agent-eval-smoke.mts` (`pnpm agenteval:smoke`). See `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0045-agent-evaluation-lab.md`.

## Phase 3.48 — Control/Execution Plane registry ✅ complete
- [x] Planes contracts (`packages/shared/src/contracts/planes.ts`) + Pydantic mirror.
- [x] `PlaneRegistry` (`packages/core/src/planes/registry.ts`): splits the platform into a Control Plane (10
  concerns) and an Execution Plane (8 concerns); `PLANE_CATALOG` tags each engine to a plane+concern;
  `guard(ExecutionRequest)` allows an execution action only if identity_verified + policy_checked + permitted
  (and, when approval required, approved) — any missing gate → `bypass_attempt`, denied. No agent may bypass
  the Control Plane.
- [x] **No migration** — static architecture metadata.
- [x] `scripts/planes-smoke.mts` (`pnpm planes:smoke`). See `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0046-control-execution-planes.md`.

## Phase 3.49 — Cost & Token CFO ✅ complete
- [x] Cost CFO contracts (`packages/shared/src/contracts/cost-cfo.ts`) + Pydantic mirror.
- [x] `CostTokenCFO` (`packages/core/src/cost-cfo/cfo.ts`): tracks 6 cost categories (model, api, automation,
  tool_subscription, compute, storage) against value (revenue + human time saved × rate); per workflow
  computes total cost, value, cost per task/lead/booked-call/sale (null when denominator 0), ROI
  `(value − cost) / cost`, break-even, and largest cost category; recommends cheaper_model/local_model,
  batch_processing, pause_expensive_agent, upgrade_when_roi_supports, or better_workflow. Complements Workflow
  ROI Tracking.
- [x] Supabase migrations `0081`/`0082` (append-only).
- [x] `scripts/cost-cfo-smoke.mts` (`pnpm cfo:smoke`). See `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0047-cost-token-cfo.md`.

## Phase 3.50 — Business Simulation Engine ✅ complete
- [x] Business Simulation contracts (`packages/shared/src/contracts/business-simulation.ts`) + Pydantic mirror.
- [x] `BusinessSimulationEngine` (`packages/core/src/business-simulation/engine.ts`): an A-vs-B comparator over
  6 decision kinds (focus_choice, campaign_choice, hire_vs_automate, pricing_choice, lead_focus,
  build_vs_sell); each option (projected_revenue, probability, time_cost_days, stress_cost, risk) is projected
  to best/likely/worst with expected value `revenue × probability` and scored on a composite weighing EV
  against risk, stress, and time; recommends the higher-scoring option with a reason. Distinct from the
  scenario Simulation Engine — picks a winner between two options and adds stress_cost + time_cost.
- [x] Supabase migrations `0083`/`0084` (append-only).
- [x] `scripts/business-simulation-smoke.mts` (`pnpm bizsim:smoke`). See `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0048-business-simulation-engine.md`.

## Phase 3.51 — FounderOS Commercialization Layer ✅ complete
- [x] Commercialization contracts (`packages/shared/src/contracts/commercialization.ts`) + Pydantic mirror.
- [x] `CommercializationRegistry` (`packages/core/src/commercialization/registry.ts`): Alfy² is Tenant 001,
  designed to later become FounderOS; classifies every feature by tier (personal_only, business_reusable,
  founder_saas_feature, agency_service, enterprise_product) and flags SaaS-module candidates; seeds 10 named
  features (Executive Inbox, Revenue Factory, Conversion War Room, Agent Factory, Follow-Up Autopilot, Asset
  Library, Goal Engine, Pattern Engine, Control Tower, Knowledge-to-Money Engine). Preparation only —
  `commercialized` is always false; nothing is activated.
- [x] Supabase migrations `0085`/`0086`.
- [x] `scripts/commercialization-smoke.mts` (`pnpm commercial:smoke`). See `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0049-founderos-commercialization.md`.

## Phase 3.52 — Founder Operating Principle ✅ complete
- [x] Founder Principle contracts (`packages/shared/src/contracts/founder-principle.ts`) + Pydantic mirror.
- [x] `FounderPrinciple` (`packages/core/src/founder-principle/principle.ts`): the global doctrine — convert
  speed of thought into speed of execution, never let an idea die in notes. `route()` resolves every idea to
  exactly one of 8 dispositions (task, asset, campaign, offer, agent, workflow, parked_idea, killed_idea) —
  always returns one. `nextActions()` guarantees every business its 5 next actions (money, risk, follow-up,
  asset, conversion), filling blanks with defaults. `OPTIMIZATION_ORDER` is the system-wide priority
  cash > conversion > follow_up > risk_control > execution_speed > founder_energy > reusable_ip.
- [x] Supabase migrations `0087`/`0088`.
- [x] `scripts/founder-principle-smoke.mts` (`pnpm principle:smoke`). See `docs/GOVERNANCE_AND_PRINCIPLE.md`, `docs/adr/ADR-0050-founder-principle.md`.

## Phase 3.53 — Constitution ✅ complete
- [x] Constitution contracts (`packages/shared/src/contracts/constitution.ts`) + Pydantic mirror.
- [x] `Constitution` (`packages/core/src/constitution/constitution.ts`): the highest authority — ten principles
  exposed as the frozen `PRINCIPLES` catalog (1 Human remains in command, 2 Think aggressively, 3 Act
  conservatively, 4 Execute with urgency, 5 Finish what was started, 6 Protect trust, 7 Optimize for measurable
  outcomes, 8 Reuse before rebuilding, 9 Explain important decisions, 10 Continuously improve). `check(action)`
  returns a verdict per principle; hard gates are Principle 3 (irreversible/financial/legal/production without
  approval → a violation until approved) and Principle 5 (abandoning approved work without a documented reason →
  a violation); 7 and 9 flag missing measurable outcome / explanation. Composes the AI Center of Excellence, the
  Security Gate, and the Plane registry.
- [x] No migration (frozen principle catalog).
- [x] `scripts/constitution-smoke.mts` (`pnpm constitution:smoke`). See `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0051-constitution.md`.

## Phase 3.54 — Enterprise Hierarchy ✅ complete
- [x] Hierarchy contracts (`packages/shared/src/contracts/hierarchy.ts`) + Pydantic mirror.
- [x] `HierarchyRegistry` (`packages/core/src/hierarchy/registry.ts`): the 8-level org tree Enterprise → Company
  → Department → Team → Project → Asset → Task → Agent; every node inherits policies, security, branding,
  permissions, and reusable assets from its ancestors. `resolve()` merges top-down (lists union, scalars
  override) so company overrides don't break inheritance; `atLevel` supports portfolio reporting,
  `sharedAcrossCompanies` supports shared vendors/SOPs/compliance and cross-company opportunities; a child's
  level must sit below its parent's.
- [x] Supabase migrations `0089`/`0090`.
- [x] `scripts/hierarchy-smoke.mts` (`pnpm hierarchy:smoke`). See `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0052-enterprise-hierarchy.md`.

## Phase 3.55 — Reflection Engine ✅ complete
- [x] Reflection contracts (`packages/shared/src/contracts/reflection.ts`) + Pydantic mirror.
- [x] `ReflectionEngine` (`packages/core/src/reflection/engine.ts`): a weekly/monthly/quarterly/yearly review
  evaluating revenue, missed opportunities, follow-up failures, automation & agent performance, workflow
  bottlenecks, time, energy, decision quality, and goal progress; generates lessons, improvements, workflows to
  automate/retire, new agents, risks, and next-period priorities. Reviews accumulate in `history`. Composes the
  Pattern Engine and Workflow ROI Tracking.
- [x] Supabase migrations `0091`/`0092` (append-only).
- [x] `scripts/reflection-smoke.mts` (`pnpm reflection:smoke`). See `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0053-reflection-engine.md`.

## Phase 3.56 — Enterprise Knowledge Graph ✅ complete
- [x] Knowledge Graph contracts (`packages/shared/src/contracts/knowledge-graph.ts`) + Pydantic mirror.
- [x] `KnowledgeGraph` (`packages/core/src/knowledge-graph/graph.ts`): 15 node kinds (people, businesses,
  projects, tasks, documents, assets, meetings, github repos, automations, goals, workflows, agents, vendors,
  investors, competitors) connected by typed, weighted relationships. `search` by kind/term, `neighborhood`
  one-hop, `recommendations` via triadic closure (pairs sharing ≥2 neighbours but not directly linked).
- [x] Supabase migrations `0093`/`0094` (nodes+edges).
- [x] `scripts/knowledge-graph-smoke.mts` (`pnpm graph:smoke`). See `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0054-knowledge-graph.md`.

## Phase 3.57 — Operating Manual Generator ✅ complete
- [x] Operating Manual contracts (`packages/shared/src/contracts/operating-manual.ts`) + Pydantic mirror.
- [x] `OperatingManualGenerator` (`packages/core/src/operating-manual/generator.ts`): when a workflow becomes
  stable, generates its 8 artifacts (SOP, checklist, playbook, onboarding guide, training document,
  troubleshooting guide, KPIs, ownership matrix), each saved to the Asset Library by reference (`assetSink`) and
  marked reusable IP. Gated on `is_stable`. Workflow-triggered, distinct from the domain-triggered Enterprise
  Playbook Generator.
- [x] Supabase migrations `0095`/`0096`.
- [x] `scripts/operating-manual-smoke.mts` (`pnpm manual:smoke`). See `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0055-operating-manual-generator.md`.

## Phase 3.58 — Digital Twin ✅ complete
- [x] Digital Twin contracts (`packages/shared/src/contracts/digital-twin.ts`) + Pydantic mirror.
- [x] `DigitalTwin` (`packages/core/src/digital-twin/twin.ts`): a continuously-updated model of the enterprise
  (businesses, finances, assets, contacts, projects, agents, workflows, campaigns, goals, risks) with runway.
  `simulate()` runs 4 what-if scenarios (hire, pause_business, revenue_drop, launch_offer) projecting
  state/runway/deltas with a recommendation. Complements the Control Tower (read snapshot) and the Business
  Simulation Engine (A-vs-B).
- [x] Supabase migrations `0097`/`0098` (append-only).
- [x] `scripts/digital-twin-smoke.mts` (`pnpm twin:smoke`). See `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0056-digital-twin.md`.

## Phase 3.59 — Institutional Memory ✅ complete
- [x] Institutional Memory contracts (`packages/shared/src/contracts/institutional-memory.ts`) + Pydantic mirror.
- [x] `InstitutionalMemory` (`packages/core/src/institutional-memory/ledger.ts`): an append-only ledger across 9
  record kinds (decision rationale, rejected idea, failed experiment, successful experiment, negotiation
  outcome, lesson learned, vendor experience, client preference, implementation history) — never edited or
  deleted. A `decision_rationale` must record `what_we_knew` and `why_chosen`; `rationaleFor` returns it.
  Complements the Memory Engine and the Reflection Engine.
- [x] Supabase migrations `0099`/`0100` (append-only).
- [x] `scripts/institutional-memory-smoke.mts` (`pnpm institutional:smoke`). See `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0057-institutional-memory.md`.

## Phase 3.60 — Executive Mission Control ✅ complete
- [x] Mission Control contracts (`packages/shared/src/contracts/mission-control.ts`) + Pydantic mirror.
- [x] `MissionControl` (`packages/core/src/mission-control/engine.ts`): the one-screen executive dashboard —
  enterprise & company health (scored, labelled), revenue, pipeline, cash, runway, goals, blocked items, risks,
  approvals, top opportunities, agent/automation/system health, AI costs, ROI, daily priorities, and a single
  computed headline (urgent runway → approvals → risks → blocked → today's first priority). A read model
  composing the Control Tower, Cost CFO, and Agent Observability; the Tower is the operator snapshot, Mission
  Control the executive composite adding system/automation health, AI cost, and the headline.
- [x] No migration (read model).
- [x] `scripts/mission-control-smoke.mts` (`pnpm mission:smoke`). See `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0058-mission-control.md`.

## Phase 3.61 — Continuous Improvement Engine ✅ complete
- [x] Continuous Improvement contracts (`packages/shared/src/contracts/continuous-improvement.ts`) + Pydantic mirror.
- [x] `ContinuousImprovementEngine` (`packages/core/src/continuous-improvement/engine.ts`): scores every workflow
  on speed, quality, cost efficiency, conversion, reliability, user ease (health = mean) and recommends
  simplify/automate/remove/merge/split/delegate, each with expected impact and confidence, sorted by
  impact × confidence; `worstFirst` prioritizes where improvement matters most; re-evaluation upserts.
  Complements Workflow ROI Tracking and the Reflection Engine.
- [x] Supabase migrations `0101`/`0102`.
- [x] `scripts/continuous-improvement-smoke.mts` (`pnpm improve:smoke`). See `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0059-continuous-improvement.md`.

## Phase 3.62 — Builder Mode ✅ complete
- [x] Builder Mode contracts (`packages/shared/src/contracts/builder-mode.ts`) + Pydantic mirror.
- [x] `BuilderMode` (`packages/core/src/builder-mode/builder.ts`): trigger phrase
  `BUILDER_TRIGGER = "I want to build"`. `build()` produces the complete 18-stage venture operating system
  (discovery, market validation, offer design, pricing, business model, brand, product architecture, technical
  architecture, database, agent plan, asset checklist, legal, marketing plan, sales plan, automation plan,
  launch plan, KPIs, review checkpoints) — each stage with a title, summary, items, and open questions.
  Human-in-command: always returns `awaiting_approval`; nothing is built until `approve()`. Composes the Idea
  Builder and Business Template.
- [x] Supabase migrations `0103`/`0104`.
- [x] `scripts/builder-mode-smoke.mts` (`pnpm builder:smoke`). See `docs/CONSTITUTION_AND_ENTERPRISE.md`, `docs/adr/ADR-0060-builder-mode.md`.

## Phase 3.63 — Finance Command Center ✅ complete
- [x] Finance Command contracts (`packages/shared/src/contracts/finance-command.ts`) + Pydantic mirror.
- [x] `FinanceCommandCenter` (`packages/core/src/finance-command/center.ts`): the complete personal and business
  financial view — per business monthly revenue/expenses, profit, margin, tax exposure, cash runway, best next
  financial action, risks, opportunities, plus rolled-up totals and personal net worth. The hard guardrail:
  `money_actions_require_approval` is always true and `forbiddenActions()` exposes the never-without-approval
  list (move_money, spend_money, open_account, execute_investment, file_taxes, sign_document). Analyze
  aggressively, execute conservatively.
- [x] Supabase migrations `0105`/`0106` (append-only snapshots).
- [x] `scripts/finance-command-smoke.mts` (`pnpm finance:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0061-finance-command-center.md`.

## Phase 3.64 — Legal Tax Strategy Analyzer ✅ complete
- [x] Tax Strategy contracts (`packages/shared/src/contracts/tax-strategy.ts`) + Pydantic mirror.
- [x] `TaxStrategyAnalyzer` (`packages/core/src/tax-strategy/analyzer.ts`): analyzes 15 tax areas; every
  recommendation carries why_it_may_apply, estimated_benefit, risk_level, complexity,
  requires_professional_review (always true), documents_needed, next_step, and questions_for_advisor, under a
  standing disclaimer. Legal optimization only (avoidance/deferral/deduction/structuring/planning), never
  evasion; analysis-for-review, not advice; CPA/attorney review required.
- [x] Supabase migrations `0107`/`0108` (append-only).
- [x] `scripts/tax-strategy-smoke.mts` (`pnpm tax:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0062-tax-strategy-analyzer.md`.

## Phase 3.65 — Entity Structure Optimizer ✅ complete
- [x] Entity Structure contracts (`packages/shared/src/contracts/entity-structure.ts`) + Pydantic mirror.
- [x] `EntityStructureOptimizer` (`packages/core/src/entity-structure/optimizer.ts`): LLC vs S Corp vs C Corp vs
  subsidiary vs holding company by a rule (raise/exit → C Corp; IP/SaaS/liability → holding company;
  profit ≥ 60k + payroll → LLC/S Corp; else LLC), with alternatives (pros/cons/tax/legal), CPA & attorney
  questions, and an action checklist; requires_professional_review always true. Never forms, converts, files, or
  signs.
- [x] Supabase migrations `0109`/`0110` (append-only).
- [x] `scripts/entity-structure-smoke.mts` (`pnpm entity:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0063-entity-structure-optimizer.md`.

## Phase 3.66 — Wealth Architecture Dump Box ✅ complete
- [x] Wealth Dump Box contracts (`packages/shared/src/contracts/wealth-dump-box.ts`) + Pydantic mirror.
- [x] `WealthDumpBox` (`packages/core/src/wealth-dump-box/box.ts`): a finance-specific drop run through a 10-step
  pipeline (classify, summarize, scope personal/business, legality notes, upside, risk, link goals, advisor
  questions, save to the Wealth Knowledge Vault by reference, next action); tax/trust/IRA/offshore/
  financial-product items are flagged for professional review.
- [x] Supabase migrations `0111`/`0112`.
- [x] `scripts/wealth-dump-box-smoke.mts` (`pnpm wealthbox:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0064-wealth-dump-box.md`.

## Phase 3.67 — Elite Money Game Engine ✅ complete
- [x] Money Game contracts (`packages/shared/src/contracts/money-game.ts`) + Pydantic mirror.
- [x] `EliteMoneyGame` (`packages/core/src/money-game/engine.ts`): a 17-strategy catalog (holding/operating/IP
  companies, management fees, owner comp, retirement, SDIRA, Solo 401(k), trusts, real estate, investments,
  deductions, charitable, insurance, asset protection, estate, compliant offshore), each with
  what/when/when-not/benefits/risks/compliance/advisor/complexity/steps; `analyze()` assembles a ranked plan
  with `protect_downside_first` and `legal_avoidance_only` always true. Legal avoidance only; advisor execution.
- [x] Supabase migrations `0113`/`0114` (append-only).
- [x] `scripts/money-game-smoke.mts` (`pnpm moneygame:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0065-elite-money-game.md`.

## Phase 3.68 — Algorithm Overlay System ✅ complete
- [x] Algorithm Overlay contracts (`packages/shared/src/contracts/algorithm-overlay.ts`) + Pydantic mirror.
- [x] `AlgorithmOverlay` (`packages/core/src/algorithm-overlay/overlay.ts`): 15 transparent scoring algorithms
  (priority, ROI, fastest path to cash, friction, conversion probability, agent-need detection, opportunity
  matching, business health, goal gap, risk, pattern prediction, energy-aware scheduling, knowledge-to-money,
  portfolio allocation, A/B-test winner) above agents/workflows/goals/businesses/campaigns/tasks. Phase 1
  rules-based (phases graduate rules → weighted → historical → predictive). Each score is 0..1 with confidence,
  why, data_used, data_missing, recommended action, requires_approval, and an override.
- [x] No migration (static catalog + computed scores).
- [x] `scripts/algorithm-overlay-smoke.mts` (`pnpm overlay:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0066-algorithm-overlay.md`.

## Phase 3.69 — Executive Intelligence Network ✅ complete
- [x] Intelligence Network contracts (`packages/shared/src/contracts/intelligence-network.ts`) + Pydantic mirror.
- [x] `ExecutiveIntelligenceNetwork` (`packages/core/src/intelligence-network/ein.ts`): converts external
  information into executive intelligence — ten article scores drive a five-way classification (ignore/
  interesting/monitor/research/immediate_action); each item states why it matters, businesses/goals affected,
  agents to notify, immediate actions, future implications, confidence, sources, follow-ups. Developing stories
  roll into one living briefing with a timeline — the same story is never reread twice.
- [x] Supabase migrations `0115`/`0116` (items, append-only) + `0117`/`0118` (living briefings, mutable).
- [x] `scripts/intelligence-network-smoke.mts` (`pnpm ein:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0067-intelligence-network.md`.

## Phase 3.70 — Failure Database + Future Trends Lab ✅ complete
- [x] Failure Trends contracts (`packages/shared/src/contracts/failure-trends.ts`) + Pydantic mirror.
- [x] `FailureDatabase` (`packages/core/src/failure-database/database.ts`): tracks 9 failure kinds as permanent
  institutional knowledge (what happened, timeline, why, root cause, warning signs, lessons, how Alfy² avoids
  repeating it), append-only. `FutureTrendsLab` (`packages/core/src/future-trends/lab.ts`): tracks trends over
  6 months–10 years with likelihood, impact, affected industries/businesses, prep steps, skills/tech needed,
  investments, threats, and a readiness score (likelihood × impact), mutable.
- [x] Supabase migrations `0119`/`0120` (failures, append-only) + `0121`/`0122` (trends, mutable).
- [x] `scripts/failure-database-smoke.mts` (`pnpm failuredb:smoke`) + `scripts/future-trends-smoke.mts` (`pnpm trends:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0068-failure-trends.md`.

## Phase 3.71 — Intelligence Lenses ✅ complete
- [x] Intel Lenses contracts (`packages/shared/src/contracts/intel-lenses.ts`) + Pydantic mirror.
- [x] `WhyThisMatters` (`packages/core/src/intel-lenses/why-this-matters.ts`): translates any item into
  decisions for Alyssa's businesses (affected, needs change, competitive advantage, compliance risk, product
  opportunity, test/ignore, assets/agents/workflows to update, strategy-review tier). `ContrarianView`
  (`packages/core/src/intel-lenses/contrarian.ts`): constructs the strongest credible opposing case (mainstream
  vs contrarian, evidence both sides, ignored risks, questionable assumptions, barriers, compliance,
  business-model weaknesses, execution risks, recommendation) to cut blind spots and prevent hype-driven
  decisions.
- [x] No migration (compute read-models).
- [x] `scripts/why-this-matters-smoke.mts` (`pnpm whymatters:smoke`) + `scripts/contrarian-smoke.mts` (`pnpm contrarian:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0069-intel-lenses.md`.

## Phase 3.72 — Briefing Engine ✅ complete
- [x] Briefings contracts (`packages/shared/src/contracts/briefings.ts`) + Pydantic mirror.
- [x] `BriefingEngine` (`packages/core/src/briefings/engine.ts`): one engine, four briefings — morning
  (priorities/revenue/follow-ups/blocked/calendar/news lanes/agent recs, ~5 min), lunch (a learning/intelligence
  update — top reads, why, action), evening (close the day — wins/money/what-didn't-move + 7 questions, saving
  reflections to Institutional Memory), weekly (a strategic intelligence report). A greeting per kind, sections
  from labeled inputs, estimated reading time.
- [x] Supabase migrations `0123`/`0124` (append-only).
- [x] `scripts/briefing-smoke.mts` (`pnpm briefing:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0070-briefing-engine.md`.

## Phase 3.73 — Podcast Studio OS ✅ complete
- [x] Podcast Studio contracts (`packages/shared/src/contracts/podcast-studio.ts`) + Pydantic mirror.
- [x] `PodcastStudio` (`packages/core/src/podcast-studio/studio.ts`): manages "Decoded with Alyssa DelTorre"
  idea → episode → monetization. Per idea: title, hook, premise, why now, audience, key story, talking points,
  guest fit, business tie-in, monetization angle, clips, CTA, related businesses, assets needed; a six-stage
  lifecycle. Inputs come from the Executive Intelligence Network, business updates, and the failure/trends
  databases.
- [x] Supabase migrations `0125`/`0126`.
- [x] `scripts/podcast-studio-smoke.mts` (`pnpm podcast:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0071-podcast-studio.md`.

## Phase 3.74 — Podcast Guest Booking Agent ✅ complete
- [x] Podcast Guests contracts (`packages/shared/src/contracts/podcast-guests.ts`) + Pydantic mirror.
- [x] `PodcastGuestBookingAgent` (`packages/core/src/podcast-guests/agent.ts`): mines contacts + external
  experts, ranks by a weighted composite of relevance/credibility/audience-fit/business-value, drafts outreach,
  tracks replies, schedules, and books Alyssa onto other shows too (inbound_guest vs outbound_appearance). Never
  contacts anyone until outreach is approved (or persistent approval exists) — `markContacted` throws otherwise.
- [x] Supabase migrations `0127`/`0128`.
- [x] `scripts/podcast-guests-smoke.mts` (`pnpm guestbooking:smoke`). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0072-podcast-guests.md`.

## Phase 3.75 — PR Department ✅ complete
- [x] PR contracts (`packages/shared/src/contracts/pr.ts`) + Pydantic mirror; `DepartmentKind` gains `pr`.
- [x] Edited the Business Template (`packages/core/src/business/template.ts`) to add PR as the 13th standard
  department, and added the PR generator (`packages/core/src/pr/generator.ts`): media angles, target
  publications, podcast targets, a founder-story angle, credibility proof, a press-kit checklist, outreach
  templates, and reputation risks. Every business now inherits PR; the Business Template defines thirteen
  departments.
- [x] Supabase migrations `0129`/`0130` (`pr_strategies`) + `0131` (widens the `business_departments` CHECK to
  allow `'pr'`).
- [x] Covered by `pnpm business:smoke` (now 13 departments). See `docs/FINANCE_INTEL_MEDIA.md`, `docs/adr/ADR-0073-pr-department.md`.

## Phase 3.76 — Story Mining Engine ✅ complete
- [x] Story Mining contracts (`packages/shared/src/contracts/story-mining.ts`) + Pydantic mirror.
- [x] `StoryMiningEngine` (`packages/core/src/story-mining/engine.ts`): turns every experience from 12 sources
  into a fully worked story for 8 channels — hook/conflict/lesson/emotion/transformation/why-it-matters/audience/
  business-tie-in/CTA/proof/best-channels/urgency. Merges Story Mining + Story Intelligence; never lose a good
  story.
- [x] Supabase migrations `0132`/`0133` (append-only).
- [x] `scripts/story-mining-smoke.mts` (`pnpm story:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0074-story-mining.md`.

## Phase 3.77 — Media Operating System ✅ complete
- [x] Media OS contracts (`packages/shared/src/contracts/media-os.ts`) + Pydantic mirror.
- [x] `MediaOS` (`packages/core/src/media-os/engine.ts`): one raw moment in 11 input kinds → many finished,
  brand-correct assets across 12 output kinds; `requires_approval` always true — nothing publishes without Alyssa;
  resolves brand via Brand DNA.
- [x] Supabase migrations `0134`/`0135`.
- [x] `scripts/media-os-smoke.mts` (`pnpm mediaos:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0075-media-os.md`.

## Phase 3.78 — Brand DNA Engine ✅ complete
- [x] Brand DNA contracts (`packages/shared/src/contracts/brand-dna.ts`) + Pydantic mirror.
- [x] `BrandDNAEngine` (`packages/core/src/brand-dna/engine.ts`): seeds 9 brands with full identity (voice,
  visuals, audience, values, promise); `resolveBrand()` auto-detects which brand content belongs to.
- [x] Supabase migrations `0136`/`0137`.
- [x] `scripts/brand-dna-smoke.mts` (`pnpm brand:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0076-brand-dna.md`.

## Phase 3.79 — Content Factory ✅ complete
- [x] Content Factory contracts (`packages/shared/src/contracts/content-factory.ts`) + Pydantic mirror.
- [x] `ContentFactory` (`packages/core/src/content-factory/factory.ts`): one source → a 42-piece linked package
  via `CONTENT_MULTIPLIER` (1 YouTube long, 5 shorts, 5 reels, 10 X, 5 LinkedIn, 3 carousels, …); pieces linked to
  source and siblings; nothing created twice.
- [x] Supabase migrations `0138`/`0139` (append-only).
- [x] `scripts/content-factory-smoke.mts` (`pnpm contentfactory:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0077-content-factory.md`.

## Phase 3.80 — Production Studio ✅ complete
- [x] Production Studio contracts (`packages/shared/src/contracts/production-studio.ts`) + Pydantic mirror.
- [x] `ProductionStudio` (`packages/core/src/production-studio/studio.ts`): stores 17 production-asset kinds +
  per-brand presets that run the post-approval pipeline automatically (Decoded: Intro A / Outro B / sponsor after
  first topic / chapters / subtitles / clips / show notes / schedule).
- [x] Supabase migrations `0140`/`0141` (assets) + `0142`/`0143` (presets).
- [x] `scripts/production-studio-smoke.mts` (`pnpm prodstudio:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0078-production-studio.md`.

## Phase 3.81 — Visibility Engine ✅ complete
- [x] Visibility contracts (`packages/shared/src/contracts/visibility.ts`) + Pydantic mirror.
- [x] `VisibilityEngine` (`packages/core/src/visibility/engine.ts`): per-business Visibility Score from 14 signals
  + recommends where/what/when to post, collaborators, podcasts to appear on, conferences, and awards; names the 3
  weakest signals.
- [x] Supabase migrations `0144`/`0145` (append-only).
- [x] `scripts/visibility-smoke.mts` (`pnpm visibility:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0079-visibility-engine.md`.

## Phase 3.82 — PR & Authority Engine ✅ complete
- [x] PR & Authority contracts (`packages/shared/src/contracts/pr-authority.ts`) + Pydantic mirror.
- [x] `PRAuthorityEngine` (`packages/core/src/pr-authority/engine.ts`): auto-detects PR opportunities from 6
  triggers (launch / partnership / funding / win / trend / innovation) → drafted pitch + target outlets + the
  authority asset stack; `markSent` throws unless approved — pitches never sent without approval. Complements the
  per-business PR Strategy Generator (ADR-0073).
- [x] Supabase migrations `0146`/`0147`.
- [x] `scripts/pr-authority-smoke.mts` (`pnpm prauthority:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0080-pr-authority.md`.

## Phase 3.83 — Audience Intelligence ✅ complete
- [x] Audience Intelligence contracts (`packages/shared/src/contracts/audience-intel.ts`) + Pydantic mirror.
- [x] `AudienceIntelEngine` (`packages/core/src/audience-intel/engine.ts`): distills an audience's fears / goals /
  language / objections / desires / misconceptions / favorite-content / best-offers from 9 signal kinds;
  re-analysis upserts (merges signals).
- [x] Supabase migrations `0148`/`0149`.
- [x] `scripts/audience-intel-smoke.mts` (`pnpm audience:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0081-audience-intelligence.md`.

## Phase 3.84 — Personal Freedom Engine ✅ complete
- [x] Personal Freedom contracts (`packages/shared/src/contracts/personal-freedom.ts`) + Pydantic mirror.
- [x] `PersonalFreedomEngine` (`packages/core/src/personal-freedom/engine.ts`): tracks work vs life hours,
  computes a freedom score, recommends automation / delegation / agent-creation / workflow-improvement / batch;
  every recommendation carries `preserves_performance: true`. Maximize life, not work.
- [x] Supabase migrations `0150`/`0151` (append-only).
- [x] `scripts/personal-freedom-smoke.mts` (`pnpm freedom:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0082-personal-freedom.md`.

## Phase 3.85 — Legacy Engine ✅ complete
- [x] Legacy contracts (`packages/shared/src/contracts/legacy.ts`) + Pydantic mirror.
- [x] `LegacyEngine` (`packages/core/src/legacy/engine.ts`): turns repeatable knowledge in 10 kinds into enduring
  legacy forms (SOP / FounderOS feature / course / podcast / keynote / book chapter / licensing / consulting
  framework) with a legacy score; build IP that compounds over decades.
- [x] Supabase migrations `0152`/`0153` (append-only).
- [x] `scripts/legacy-smoke.mts` (`pnpm legacy:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0083-legacy-engine.md`.

## Phase 3.86 — Compounding Engine ✅ complete
- [x] Compounding contracts (`packages/shared/src/contracts/compounding.ts`) + Pydantic mirror.
- [x] `CompoundingEngine` (`packages/core/src/compounding/engine.ts`): evaluates every completed task for 21
  reusable forms, scores it on 8 compounding dimensions, recommends the reusable version, and maintains the Asset
  Lineage Graph (what created it / what it created / businesses / revenue / agents / workflows / version).
  Optimize for compounding, not output volume.
- [x] Supabase migrations `0154`/`0155` (evaluations, append-only) + `0156`/`0157` (asset_lineage, mutable).
- [x] `scripts/compounding-smoke.mts` (`pnpm compounding:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0084-compounding-engine.md`.

## Phase 3.87 — Multiplication Engine ✅ complete
- [x] Multiplication contracts (`packages/shared/src/contracts/multiplication.ts`) + Pydantic mirror.
- [x] `MultiplicationEngine` (`packages/core/src/multiplication/engine.ts`): never solve once — evaluates whether
  a solution helps 9 targets, recommends 8 shared forms, scores Multiplication as future uses per 100. 1 solution
  → 100 uses → 1000 hours saved.
- [x] Supabase migrations `0158`/`0159` (append-only).
- [x] `scripts/multiplication-smoke.mts` (`pnpm multiplication:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0085-multiplication-engine.md`.

## Phase 3.88 — Leverage Engine ✅ complete
- [x] Leverage contracts (`packages/shared/src/contracts/leverage.ts`) + Pydantic mirror.
- [x] `LeverageEngine` (`packages/core/src/leverage/engine.ts`): scores every recommendation on 14 inputs into a
  tier (low / medium / high / compounding / generational); `compare()` recommends the highest-leverage path, not
  the fastest. `score()` is pure; `compare()` persists its comparisons.
- [x] Supabase migrations `0160`/`0161` (comparisons, append-only).
- [x] `scripts/leverage-smoke.mts` (`pnpm leverage:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0086-leverage-engine.md`.

## Phase 3.89 — The Five Immutable Laws ✅ complete
- [x] Immutable Laws contracts (`packages/shared/src/contracts/immutable-laws.ts`) + Pydantic mirror.
- [x] `ImmutableLaws` (`packages/core/src/immutable-laws/laws.ts`): Protect the Human, Compound Everything,
  Allocate Capital Intelligently, Prefer Systems Over Heroics, Increase Founder Freedom — every feature / agent /
  workflow / recommendation must satisfy them; Law 1 and Law 4 are hard gates; every major recommendation explains
  how it satisfies the laws.
- [x] No migration (frozen catalog + checker).
- [x] `scripts/immutable-laws-smoke.mts` (`pnpm laws:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0087-immutable-laws.md`.

## Phase 3.90 — Executive Capital Allocator ✅ complete
- [x] Capital Allocator contracts (`packages/shared/src/contracts/capital-allocator.ts`) + Pydantic mirror.
- [x] `CapitalAllocator` (`packages/core/src/capital-allocator/allocator.ts`): daily / weekly / quarterly
  highest-value allocation across 12 capital kinds (time / money / energy / attention / relationships /
  reputation / knowledge / technology / assets / employees / agents / automation); surfaces highest ROI / leverage
  / compounding / strategic / freedom, the trade-offs (what each pick depletes), and quarterly what to stop. Never
  optimize one resource while destroying another.
- [x] Supabase migrations `0162`/`0163` (append-only).
- [x] `scripts/capital-allocator-smoke.mts` (`pnpm capital:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0088-capital-allocator.md`.

## Phase 3.91 — Opportunity Cost Engine ✅ complete
- [x] Opportunity Cost contracts (`packages/shared/src/contracts/opportunity-cost.ts`) + Pydantic mirror.
- [x] `OpportunityCostEngine` (`packages/core/src/opportunity-cost/engine.ts`): compares 2–4 options on upside /
  downside / capital / time / stress / complexity / risk / confidence / leverage, computes each option's
  opportunity cost vs the best alternative, and names the best financial / strategic / long-term / low-risk /
  fastest / highest-leverage choice — always showing what is NOT chosen and why.
- [x] Supabase migrations `0164`/`0165` (append-only).
- [x] `scripts/opportunity-cost-smoke.mts` (`pnpm oppcost:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0089-opportunity-cost.md`.

## Phase 3.92 — Executive Decision Journal ✅ complete
- [x] Decision Journal contracts (`packages/shared/src/contracts/decision-journal.ts`) + Pydantic mirror.
- [x] `DecisionJournal` (`packages/core/src/decision-journal/journal.ts`): records decisions with alternatives /
  reasoning / data / assumptions / risks / expected outcome; schedules 30/90/365-day reviews to record actual
  outcome + lessons; surfaces recurring decision patterns (categories with ≥2 decisions) to improve future
  recommendations.
- [x] Supabase migrations `0166`/`0167`.
- [x] `scripts/decision-journal-smoke.mts` (`pnpm journal:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0090-decision-journal.md`.

## Phase 3.93 — Enterprise Memory Timeline ✅ complete
- [x] Memory Timeline contracts (`packages/shared/src/contracts/memory-timeline.ts`) + Pydantic mirror.
- [x] `MemoryTimeline` (`packages/core/src/memory-timeline/timeline.ts`): a chronological history of 13 event
  kinds, each linking related assets / agents / people / businesses / lessons; answers `firstMention` ("when did
  we first discuss this?") and `after` ("what happened after that decision?").
- [x] Supabase migrations `0168`/`0169` (append-only).
- [x] `scripts/memory-timeline-smoke.mts` (`pnpm timeline:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0091-memory-timeline.md`.

## Phase 3.94 — Executive Review Board ✅ complete
- [x] Review Board contracts (`packages/shared/src/contracts/review-board.ts`) + Pydantic mirror.
- [x] `ReviewBoard` (`packages/core/src/review-board/board.ts`): a virtual board of 10 roles (CEO / CFO / COO /
  CTO / CMO / CLO / CRO / CSO / CPO / CCO), each independently evaluating benefits / risks / blind-spots /
  dependencies / costs / operational-impact through its lens; synthesizes a final recommendation and highlights
  disagreements rather than forcing consensus.
- [x] Supabase migrations `0170`/`0171` (append-only).
- [x] `scripts/review-board-smoke.mts` (`pnpm board:smoke`). See `docs/LEVERAGE_AND_MEDIA.md`, `docs/adr/ADR-0092-review-board.md`.

## Phase 3.95 — Cognitive Offloading Engine ✅ complete
- [x] Cognitive Offload contracts (`packages/shared/src/contracts/cognitive-offload.ts`) + Pydantic mirror.
- [x] `CognitiveOffloadingEngine` (`packages/core/src/cognitive-offload/engine.ts`): the L0 front door —
  `process()` runs any of 8 input kinds through the 5-stage pipeline (Understand → Connect → Build → Delegate →
  Executive Report), answering "can Alyssa forget this?" per item and reporting `cognitive_load_removed`.
- [x] Supabase migration `0172` (append-only).
- [x] `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0093-cognitive-offload.md`.

## Phase 3.96 — Life Logistics Engine ✅ complete
- [x] Life Logistics contracts (`packages/shared/src/contracts/life-logistics.ts`) + Pydantic mirror.
- [x] `LifeLogisticsEngine` (`packages/core/src/life-logistics/engine.ts`): a detected event → checklists (19
  categories), calendar blocks, a night-before / two-hours-before / after-event reminder cadence, and follow-ups.
- [x] Supabase migration `0173` (append-only).
- [x] `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0094-life-logistics.md`.

## Phase 3.97 — Anti-Fragility Engine ✅ complete
- [x] Anti-Fragility contracts (`packages/shared/src/contracts/anti-fragility.ts`) + Pydantic mirror.
- [x] `AntiFragilityEngine` (`packages/core/src/anti-fragility/engine.ts`): `analyze()` turns each of 9 failure
  types into root cause, reusable lesson, and a new safeguard / automation / agent / SOP / redesign, with recovery
  speed, learning gained, and future risk reduction; composes the Failure Database (ADR-0068).
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0095-anti-fragility.md`.

## Phase 3.98 — Brain/Hands Separation ✅ complete
- [x] Brain/Hands contracts (`packages/shared/src/contracts/brain-hands.ts`) + Pydantic mirror.
- [x] `BrainHandsRegistry` (`packages/core/src/brain-hands/registry.ts`): four layers (Brain recommends / Policy
  governs / Orchestrator coordinates / Hands execute); `guard()` blocks any execution that bypasses policy /
  approval / audit as a `bypass_attempt`; composes the Control/Execution Planes (ADR-0046).
- [x] No migration (static catalog). `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0096-brain-hands.md`.

## Phase 3.99 — Confidence-Weighted Agent Council ✅ complete
- [x] Agent Council contracts (`packages/shared/src/contracts/agent-council.ts`) + Pydantic mirror.
- [x] `ConfidenceWeightedAgentCouncil` (`packages/core/src/agent-council/council.ts`): `convene()` runs 10 roles
  independently with confidence scores → agreement, confidence_gap, unresolved_risks, needs_more_data; complements
  the Review Board (ADR-0092).
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0097-agent-council.md`.

## Phase 3.100 — Billion-Dollar Operator Mode ✅ complete
- [x] Operator Mode contracts (`packages/shared/src/contracts/operator-mode.ts`) + Pydantic mirror.
- [x] `BillionDollarOperatorMode` (`packages/core/src/operator-mode/engine.ts`): `review()` holds every major
  recommendation to a "$100M+?" lens (`hundred_m_fit`) and returns the cleaner, scalable version when fit is low.
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0098-operator-mode.md`.

## Phase 3.101 — Capital Allocation Board ✅ complete
- [x] Capital Board contracts (`packages/shared/src/contracts/capital-board.ts`) + Pydantic mirror.
- [x] `CapitalAllocationBoard` (`packages/core/src/capital-board/board.ts`): `allocate()` scores each option on
  payback / liquidity / leverage / compounding / opportunity cost and issues one of 8 dispositions; complements the
  Executive Capital Allocator (ADR-0088).
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0099-capital-board.md`.

## Phase 3.102 — Million-Dollar Sprint Engine ✅ complete
- [x] Million Sprint contracts (`packages/shared/src/contracts/million-sprint.ts`) + Pydantic mirror.
- [x] `MillionDollarSprintEngine` (`packages/core/src/million-sprint/engine.ts`): `build()` ranks cash paths to $1M
  on speed / size / probability / effort / risk / leverage / readiness / energy with 7/30/90-day plans; no fantasy
  math — every path shows assumptions, risks, and required actions.
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0100-million-sprint.md`.

## Phase 3.103 — Revenue Truth System ✅ complete
- [x] Revenue Truth contracts (`packages/shared/src/contracts/revenue-truth.ts`) + Pydantic mirror.
- [x] `RevenueTruthSystem` (`packages/core/src/revenue-truth/engine.ts`): `report()` places deals on a 9-rung
  honest ladder, prioritizing cash collected over signed over invoiced over qualified over booked; activity is
  never revenue; idle deals flagged as stalled.
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0101-revenue-truth.md`.

## Phase 3.104 — Executive Delegation System ✅ complete
- [x] Delegation contracts (`packages/shared/src/contracts/delegation.ts`) + Pydantic mirror.
- [x] `ExecutiveDelegationSystem` (`packages/core/src/delegation/engine.ts`): `classify()` assigns each task one of
  9 owners, reserving `alyssa_only` for work that genuinely needs her vision / relationships / creativity /
  approval.
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0102-delegation.md`.

## Phase 3.105 — Enterprise Risk Register ✅ complete
- [x] Risk Register contracts (`packages/shared/src/contracts/risk-register.ts`) + Pydantic mirror.
- [x] `EnterpriseRiskRegister` (`packages/core/src/risk-register/engine.ts`): risks across 13 categories with
  computed exposure; mutable (`add` / `update`); `top(10)` drives the weekly review.
- [x] No migration (mutable store). `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0103-risk-register.md`.

## Phase 3.106 — Board Packet Generator ✅ complete
- [x] Board Packet contracts (`packages/shared/src/contracts/board-packet.ts`) + Pydantic mirror.
- [x] `BoardPacketGenerator` (`packages/core/src/board-packet/generator.ts`): `generate()` produces board-level
  monthly reporting as a read model before a board exists.
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0104-board-packet.md`.

## Phase 3.107 — Strategic Exit & Asset Value Engine ✅ complete
- [x] Strategic Exit contracts (`packages/shared/src/contracts/strategic-exit.ts`) + Pydantic mirror.
- [x] `StrategicExitEngine` (`packages/core/src/strategic-exit/engine.ts`): `assess()` values every asset against 8
  exit paths with valuation logic and the steps to make it sellable; `recommendedPaths()` ranks the routes.
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0105-strategic-exit.md`.

## Phase 3.108 — Founder Nervous System Protection ✅ complete
- [x] Nervous System contracts (`packages/shared/src/contracts/nervous-system.ts`) + Pydantic mirror.
- [x] `FounderNervousSystemProtection` (`packages/core/src/nervous-system/engine.ts`): `assess()` tracks founder
  load (ok / elevated / high / critical) and recommends relief (delegate / delay / batch / automate / cancel /
  simplify / escalate / convert-to-checklist) that preserves execution speed — burnout as enterprise risk.
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0106-nervous-system.md`.

## Phase 3.109 — Relaxation Outcome + True Progress ✅ complete
- [x] Outcome contracts (`packages/shared/src/contracts/outcome-engines.ts`) + Pydantic mirror.
- [x] `RelaxationOutcomeEngine` (`packages/core/src/outcome/relaxation.ts`) + `TrueProgressEngine`
  (`packages/core/src/outcome/true-progress.ts`): optimize for money / risk control / delegation / systems /
  freedom / peace of mind; True Progress never confuses intensity with progress.
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0107-outcome-engines.md`.

## Phase 3.110 — Capital Engine ✅ complete
- [x] Capital Engine contracts (`packages/shared/src/contracts/capital-engine.ts`) + Pydantic mirror.
- [x] `CapitalEngine` (`packages/core/src/capital-engine/engine.ts`): `report()` scores recommendations across 10
  capital types with compounding, payoff horizon, and conversion paths; optimizes for lifetime accumulation.
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0108-capital-engine.md`.

## Phase 3.111 — Consequence Horizon Engine ✅ complete
- [x] Consequence Horizon contracts (`packages/shared/src/contracts/consequence-horizon.ts`) + Pydantic mirror.
- [x] `ConsequenceHorizonEngine` (`packages/core/src/consequence-horizon/engine.ts`): `project()` estimates second-
  and third-order consequences across immediate / 30-day / 90-day / 1-year / 5-year horizons.
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0109-consequence-horizon.md`.

## Phase 3.112 — The Alfy² Pyramid ✅ complete
- [x] Pyramid contracts (`packages/shared/src/contracts/pyramid.ts`) + Pydantic mirror.
- [x] `PyramidEngine` (`packages/core/src/pyramid/engine.ts`): `classify()` places a feature/output on the 8-level
  pyramid (Capture → Organize → Understand → Recommend → Execute → Compound → Multiply → Freedom) and recommends
  the next level up.
- [x] No migration. `pnpm capstone:smoke`. See `docs/COGNITIVE_OFFLOADING_OS.md`, `docs/adr/ADR-0110-pyramid.md`.

## Phase 3.113 — Capstone overview + doctrine fold-in ✅ complete
- [x] `docs/COGNITIVE_OFFLOADING_OS.md`: narrative overview tying all 19 engines under the L0 directive, the
  Executive Decision Filter, and Brain/Policy/Orchestrator/Hands separation.
- [x] Mission/principles folded into the Constitution (ADR-0051) and the Five Immutable Laws (ADR-0087) rather than
  re-built — one source of truth.
- [x] One consolidated smoke `packages/core/smoke/capstone-l0.smoke.ts` (`pnpm capstone:smoke`) runs all 19 engines
  with a frozen clock + deterministic ids, each parsing its output through its Zod schema.

## Phase 3.114 — Operating System Meta-Layer ✅ complete
- [x] Meta-layer contracts (`packages/shared/src/contracts/{rnd,acquisition,flight-deck,freedom-index,life-roi,
  never-again,self-improvement,operating-rhythm,exec-operating-manual,infinite-loop,ultimate-design-rule}.ts`) +
  Pydantic mirrors.
- [x] **R&D Department** (`packages/core/src/rnd/engine.ts`): `evaluate()` → disposition + confidence; `report()`
  the Innovation Report; only high-confidence discoveries surface. Migration `0186` (`rnd_discoveries`, append-only).
- [x] **Acquisition Engine** (`packages/core/src/acquisition/engine.ts`): `evaluate()` → 8 dispositions
  (build / buy / partner / license / white_label / acquire / invest / ignore) by capital-allocator scoring. Migration
  `0187`.
- [x] **Executive Flight Deck** (`packages/core/src/flight-deck/engine.ts`): `assemble()` returns only
  decision-changing sections; replaces the dashboard. No migration (read model).
- [x] **Founder Freedom Index** (`packages/core/src/freedom-index/engine.ts`): `compute()` → 0–100 with
  trend / bottleneck / recommendation. Migration `0188` (append-only).
- [x] **Life ROI Engine** (`packages/core/src/life-roi/engine.ts`): `evaluate()` scores financial ROI **and** life
  returned (`workdays_returned`). Migration `0189` (append-only).
- [x] **Never Again Engine** (`packages/core/src/never-again/engine.ts`): `capture()` turns a frustration into
  permanent infrastructure. Migration `0190` (append-only).
- [x] **Enterprise Self-Improvement Engine** (`packages/core/src/self-improvement/engine.ts`): `selfEvaluate()` runs
  a monthly OS self-eval (refactor + tech-debt); simpler not bigger. Migration `0191` (append-only).
- [x] **Enterprise Operating Rhythm** (`packages/core/src/operating-rhythm/engine.ts`): `agenda()` returns
  daily / weekly / monthly / quarterly / annual agendas. No migration (read model).
- [x] **Executive Operating Manual** (`packages/core/src/exec-operating-manual/engine.ts`): `assemble()` composes the
  Operating Manual Generator (ADR-0055) over the OS + flags staleness. No migration (read model).
- [x] **The Infinite Loop** (`packages/core/src/infinite-loop/engine.ts`): `stageOf()` maps each module to a loop
  stage; `describe()` returns the loop. No migration (read model).
- [x] **The Ultimate Design Rule** (`packages/core/src/ultimate-design-rule/engine.ts`): `admit()` admits a feature
  only if it satisfies ≥1 of 6 criteria; the admission gate above the README + Constitution. No migration (read model).
- [x] One consolidated smoke `scripts/meta-smoke.mts` (`pnpm meta:smoke`) runs all 11 engines with a frozen clock +
  deterministic ids. See `docs/OPERATING_SYSTEM_META_LAYER.md`, `docs/adr/ADR-0111-rnd.md` …
  `docs/adr/ADR-0121-ultimate-design-rule.md`.

## Phase 3.115 — Identity, Conversation & Voice ✅ complete
- [x] Identity/Conversation/Voice contracts (`packages/shared/src/contracts/{identity-os,philosophy-library,
  conversation,vision-builder,voice-interface}.ts`) + Pydantic mirrors.
- [x] **Identity OS** (`packages/core/src/identity-os/engine.ts`): `setAnchor()` / `check()`; identity OVERRIDES
  optimization on conflict; mutable. Migration `0192` (`identity_anchors`, mutable).
- [x] **Philosophy Library** (`packages/core/src/philosophy-library/engine.ts`): `add()` / `revise()` / `pin()`;
  `todaysReminder()` deterministic daily; mutable. Migration `0193` (`philosophies`, mutable).
- [x] **Conversation Engine** (`packages/core/src/conversation/engine.ts`): `converse()` thinking partner →
  tasks / assets / agents / businesses / workflows / knowledge / capital; nothing executes without approval; distinct
  from the Conversion Engine (ADR-0032). Migration `0194` (`conversation_extractions`, append-only).
- [x] **Vision Builder** (`packages/core/src/vision-builder/engine.ts`): "I have an idea…" → collaborative thinking,
  generates plans, composes the Idea Builder (ADR-0008); `awaiting_approval` always true. Migration `0195`
  (`vision_sessions`, append-only).
- [x] **Voice Interface** (`packages/core/src/voice-interface/engine.ts`): `interpret()` maps utterance →
  `VoiceCommand`; sensitive actions confirm first; calm companion; read model (speech I/O is runtime). No migration.
- [x] One consolidated smoke `scripts/identity-voice-smoke.mts` (`pnpm identity:smoke`) runs all 5 engines with a
  frozen clock + deterministic ids. See `docs/IDENTITY_CONVERSATION_VOICE.md`, `docs/adr/ADR-0122-identity-os.md` …
  `docs/adr/ADR-0126-voice-interface.md`.

## Phase 4 — First real module
- [ ] Pick highest-leverage domain; implement one capability with approval gating.
- [ ] Validate the "add a module in <30 min" and "add an agent via one contract" criteria.

## Phase 5 — FounderOS / Founder Intelligence System readiness
- [x] Multi-tenant separation made explicit: tenancy contracts, billing/permissions/knowledge tables
  (`0008`/`0009`), `PermissionChecker`. Proven additive — nine engines unchanged. See `docs/FOUNDER_INTELLIGENCE_SYSTEM.md`.
- [ ] Wire `BillingAccount` to a payment processor (PayPal-first) + meter usage.
- [ ] Tenant sign-up / provisioning flow.
- [ ] Web shell.

---

## Open questions (resolve before Phase 4)
1. First domain module to implement (finance? projects? health?).
2. Queue technology for Phase-2+ async dispatch (Postgres job table vs broker).
3. Default model tier per capability (cost vs quality table).
4. Approval UX surface (where the operator approves: API, chat, future web).

---

## Working rules
- One phase per branch; descriptive commits; preserve rollback.
- Update [`CHANGELOG.md`](./CHANGELOG.md) every phase.
- No feature work lands without its contract defined in `packages/shared` first.
