/**
 * @alfy2/core — the kernel. Depends only on @alfy2/shared and @alfy2/config.
 * Knows nothing about any specific module or agent; operates entirely through contracts and ports.
 */

// Registries
export { ModuleRegistry } from "./registry/module-registry.js";
export { AgentRegistry } from "./registry/agent-registry.js";

// Logging
export { createLogger, type Logger, type LogLevel, type LogContext } from "./logging/logger.js";
export {
  InMemoryEventLog,
  InMemoryDecisionLog,
  type EventLog,
  type DecisionLog,
  type EventRecord,
  type DecisionRecord,
} from "./logging/event-log.js";

// Orchestration
export {
  ApprovalGate,
  InMemoryApprovalStore,
  type ApprovalStore,
  type ApprovalRequest,
  type ApprovalStatus,
  type GatePolicy,
  type GateDecision,
} from "./orchestration/approval-gate.js";
export {
  Dispatcher,
  HttpAgentTransport,
  type AgentTransport,
} from "./orchestration/dispatcher.js";
export { assembleSignals } from "./orchestration/assembler.js";
export type { Planner, Plan, OperatorIntent } from "./orchestration/planner.js";

// AI gateway
export {
  AiGateway,
  AiDisabledError,
  AiBudgetError,
  type ModelPort,
  type CachePort,
  type UsagePort,
  type ModelRequest,
  type ModelResult,
  type AiRunArgs,
  type AiRunResult,
} from "./ai/gateway.js";

// Memory Engine
export {
  MemoryEngine,
  type MemoryEngineOptions,
  type RecallResult,
  type MemoryPatch,
  type PruneOptions,
  type PruneSummary,
} from "./memory/engine.js";
export { InMemoryMemoryRepository } from "./memory/in-memory-repository.js";
export type { MemoryRepository, RepoFilter } from "./memory/repository.js";
export {
  retrievalScore,
  pruneScore,
  relevance,
  recency,
  tokenize,
  DEFAULT_RETRIEVAL_WEIGHTS,
  type RetrievalWeights,
} from "./memory/scoring.js";

// Decision Engine
export { DecisionEngine, type DecisionEngineOptions } from "./decision/engine.js";
export { RuleClassifier, type DecisionClassifier } from "./decision/classifier.js";
export {
  DEFAULT_PRIORITY_WEIGHTS,
  priority as decisionPriority,
  type PriorityWeights,
} from "./decision/scoring.js";

// Chief of Staff (executive layer — coordinates, never executes)
export { ChiefOfStaff, type ChiefOfStaffOptions } from "./chief-of-staff/chief-of-staff.js";
export type { BriefInput, MeetingInput, MemoryReader } from "./chief-of-staff/types.js";
export { renderDashboardMarkdown } from "./chief-of-staff/render.js";

// Agent Factory (self-extension — recommend, approve, generate, register)
export {
  AgentFactory,
  AgentApprovalError,
  type AgentFactoryOptions,
  type GenerateTargets,
  type FileWriter,
  type AgentRegistrar,
} from "./agent-factory/factory.js";
export { detectRecurring, type DetectOptions } from "./agent-factory/detector.js";
export { familyFromKey } from "./agent-factory/templates.js";

// Business Template (every business inherits the same framework; data stays isolated)
export { BusinessFactory, type BusinessFactoryOptions } from "./business/factory.js";
export {
  BUSINESS_TEMPLATE,
  BUSINESS_TEMPLATE_VERSION,
  DEPARTMENT_KINDS,
  getBusinessTemplate,
} from "./business/template.js";

// Personal OS (life layer — reuse, ask once, remember forever, auto-prepare)
export { PersonalOS, type PersonalMemory, type PersonalEntityRef } from "./personal-os/personal-os.js";
export { PERSONAL_CATALOG, findSpec, catalogModules } from "./personal-os/catalog.js";

// Idea Builder ("I have an idea." → full workup; never builds until approved)
export {
  IdeaBuilder,
  IdeaApprovalError,
  IDEA_BUILDER_TRIGGER,
  type IdeaBuilderOptions,
  type IdeaMemory,
  type HandoffPlan,
} from "./idea-builder/builder.js";

// Pattern Engine (self-awareness — observe, find bottlenecks, recommend; advisory only)
export { PatternEngine, type PatternEngineOptions } from "./pattern-engine/engine.js";

// Pattern Engine v2 insights (strengths / repeating mistakes / successful habits / schedule recs)
export {
  detectStrengths,
  detectRepeatingMistakes,
  detectSuccessfulHabits,
  scheduleRecommendations,
} from "./pattern-engine/insights.js";

// Agent Observability (provenance log of every agent action + dashboards)
export {
  AgentObservability,
  AgentObservabilityError,
  type AgentObservabilityOptions,
} from "./agent-observability/observer.js";

// Simulation Engine (best/likely/worst before launching major workflows)
export {
  SimulationEngine,
  type SimulationEngineOptions,
} from "./simulation/engine.js";
export { runModel, type SimModelOutput, type CaseData } from "./simulation/models.js";

// AI Center of Excellence (internal standards layer; compliance gate for new agents/workflows/connectors)
export { AiCenterOfExcellence, type AiCoeOptions } from "./ai-coe/engine.js";
export {
  DEFAULT_STANDARDS,
  APPROVED_MODELS,
  DEFAULT_COST_CEILING_USD,
  RULES as COE_RULES,
} from "./ai-coe/standards.js";

// Workflow ROI Tracking (value vs cost per automation; rank + scale/pause/improve/delete)
export { WorkflowRoiTracker, type WorkflowRoiOptions } from "./workflow-roi/engine.js";

// Domain Operating Models (redesign full domains: goals/workflows/agents/KPIs/assets/approvals/dashboards/escalation)
export {
  DomainOperatingModelFactory,
  DOMAIN_TEMPLATES,
  DOMAIN_TEMPLATE_VERSION,
  type DomainFactoryOptions,
} from "./domain-model/factory.js";

// Agent Identity & Zero Trust (unique scoped revocable identities; deny-by-default; per-request eval)
export {
  AgentIdentityRegistry,
  AgentIdentityError,
  type AgentIdentityRegistryOptions,
} from "./agent-identity/registry.js";

// Source-of-Truth Management (kind/source/confidence/freshness/owner/last-verified/update-trigger)
export {
  SourceOfTruthRegistry,
  SourceOfTruthError,
  VERIFY_TTL_DAYS,
  type SourceOfTruthOptions,
} from "./source-of-truth/registry.js";

// Executive Control Tower (the operator dashboard — assembles one snapshot of everything)
export { ControlTower, type ControlTowerOptions } from "./control-tower/engine.js";

// Enterprise Playbook Generator (per business/domain → SOPs/scripts/checklists/scorecards/... as IP)
export { PlaybookGenerator, type PlaybookGeneratorOptions } from "./playbook/generator.js";

// Strategic Portfolio Optimizer (rank all businesses; focus/delegate/automate/pause/kill/package)
export {
  PortfolioOptimizer,
  compositeScore,
  upsideScore,
  recommendFor,
  type PortfolioOptimizerOptions,
} from "./portfolio/optimizer.js";

// Knowledge Ingestion Engine (process any upload → summary/frameworks/tactics/.../asset + links)
export {
  KnowledgeIngestionEngine,
  type KnowledgeIngestionOptions,
} from "./knowledge-ingestion/engine.js";

// Knowledge-to-Action Converter (idea → action with reusable operating manual; use/save/ignore/campaign)
export {
  KnowledgeToActionConverter,
  decideDisposition,
  type KnowledgeToActionOptions,
} from "./knowledge-to-action/converter.js";

// Conversion Engine (track/improve 11 surfaces; winners decided by revenue per unit, not vanity)
export { ConversionEngine, ConversionEngineError, type ConversionEngineOptions } from "./conversion/engine.js";

// Follow-Up Execution Engine (sequences/reminders/approval; keeps going until response/goal/done/risk/pause)
export {
  FollowUpExecutionEngine,
  FollowUpEngineError,
  DEFAULT_CADENCE_DAYS,
  type FollowUpEngineOptions,
} from "./follow-up/engine.js";

// Revenue Command System (per business → fastest path to cash / easiest offer / best lead / next money action)
export { RevenueCommandSystem, type RevenueCommandOptions } from "./revenue/command.js";

// Sales Asset Generator (12 sales assets per business → saved to the Asset Library)
export { SalesAssetGenerator, type SalesAssetGeneratorOptions } from "./sales-asset/generator.js";

// Execution Queue (8 buckets; priority order; always knows what to do next)
export { ExecutionQueue, CATEGORY_RANK, type ExecutionQueueOptions } from "./execution-queue/queue.js";

// Don't Drop the Ball System (detect dropped items past staleness; surface daily; assign to close)
export {
  DontDropBallSystem,
  DontDropBallError,
  STALENESS_DAYS,
  type DontDropBallOptions,
} from "./dont-drop-ball/engine.js";

// Business Asset Checklist (25 assets per business; show missing; recommend fastest next)
export {
  BusinessAssetChecklist,
  ALL_ASSETS,
  ASSET_PRIORITY,
  type AssetChecklistOptions,
} from "./asset-checklist/engine.js";

// Money-First Operating Mode (prioritize cash-moving work; deprioritize polish/research-without-action)
export { MoneyFirstMode, type MoneyFirstOptions } from "./money-first/mode.js";

// Knowledge Vault (drops → extracted intelligence → execution chain: asset→campaign→…→cash)
export {
  KnowledgeVault,
  type KnowledgeVaultOptions,
  type VaultAssetSink,
} from "./knowledge-vault/vault.js";

// Revenue Factory (per-business money cockpit; "what do we do today to make money?")
export { RevenueFactory } from "./revenue-factory/factory.js";

// Conversion War Room (full-funnel A/B across 9 surfaces; winner by revenue, never vanity)
export { ConversionWarRoom, WarRoomError, MIN_SENDS_FOR_WINNER, type WarRoomOptions } from "./war-room/engine.js";

// Deal Desk (per-opportunity record; rank + next money move + blocked + dying deals)
export { DealDesk, DealDeskError, type DealDeskOptions } from "./deal-desk/desk.js";

// Agent Evaluation Lab (test agents before trust; 5 scores; 6 stages; no broad perms until passing)
export { AgentEvaluationLab, AgentEvalError, type AgentEvalOptions } from "./agent-eval/lab.js";

// Control / Execution Plane registry (no agent may bypass the Control Plane)
export { PlaneRegistry, PLANE_CATALOG } from "./planes/registry.js";

// Cost & Token CFO (per-workflow cost decomposition, per-unit costs, ROI, break-even, recommendations)
export { CostCfo } from "./cost-cfo/cfo.js";

// Business Simulation Engine (A-vs-B decision comparator with revenue/risk/time/stress)
export { BusinessSimulationEngine } from "./business-simulation/engine.js";

// FounderOS Commercialization Layer (classify features for future SaaS; preparation only)
export { CommercializationRegistry } from "./commercialization/registry.js";

// Founder Operating Principle (idea → disposition; every business's 5 next actions; optimization order)
export { FounderPrinciple, OPTIMIZATION_ORDER } from "./founder-principle/principle.js";

// Constitution of Alfy² (the highest authority — 10 principles every agent references)
export { Constitution, PRINCIPLES } from "./constitution/constitution.js";

// Enterprise Hierarchy (Enterprise→…→Agent; inheritance + overrides; portfolio/shared resources)
export { EnterpriseHierarchy, HierarchyError } from "./hierarchy/registry.js";

// Reflection Engine (weekly/monthly/quarterly/yearly review → lessons/improvements/priorities)
export { ReflectionEngine } from "./reflection/engine.js";

// Enterprise Knowledge Graph (typed nodes + relationships; search + graph recommendations)
export { EnterpriseKnowledgeGraph, KnowledgeGraphError } from "./knowledge-graph/graph.js";

// Operating Manual Generator (stable workflow → SOP/checklist/playbook/… as reusable IP)
export { OperatingManualGenerator, OperatingManualError, type ManualAssetSink } from "./operating-manual/generator.js";

// Digital Twin (continuously-updated enterprise model + what-if simulations)
export { DigitalTwin } from "./digital-twin/twin.js";

// Institutional Memory (decision rationale + experiments + lessons; "what did we know and why")
export { InstitutionalMemory, InstitutionalMemoryError } from "./institutional-memory/ledger.js";

// Executive Mission Control (the primary one-screen dashboard; composes Tower + CFO + Observability)
export { MissionControl } from "./mission-control/engine.js";

// Continuous Improvement Engine (evaluate workflows; recommend simplify/automate/remove/merge/split/delegate)
export { ContinuousImprovementEngine } from "./continuous-improvement/engine.js";

// Builder Mode ("I want to build..." → complete 18-stage venture operating system)
export { BuilderMode, BuilderModeError } from "./builder-mode/builder.js";

// Finance Command Center (personal+business finance view; never moves money without approval)
export { FinanceCommandCenter } from "./finance-command/center.js";

// Legal Tax Strategy Analyzer (legal optimization only; CPA/attorney review; never advice)
export { LegalTaxStrategyAnalyzer, TAX_DISCLAIMER } from "./tax-strategy/analyzer.js";

// Entity Structure Optimizer (LLC / S Corp / C Corp / holding / subsidiary; for professional review)
export { EntityStructureOptimizer } from "./entity-structure/optimizer.js";

// Wealth Architecture Dump Box (finance-specific drop → classify/score/advisor-questions/vault)
export { WealthArchitectureDumpBox, type WealthAssetSink, type WealthDumpBoxOptions } from "./wealth-dump-box/box.js";

// Elite Money Game Engine (legal tax/asset-protection/wealth strategy catalog + analysis)
export { EliteMoneyGameEngine } from "./money-game/engine.js";

// Algorithm Overlay System (15 transparent rules-based scoring algorithms above everything)
export { AlgorithmOverlaySystem } from "./algorithm-overlay/overlay.js";

// Executive Intelligence Network (article scoring + classification + living briefings)
export { ExecutiveIntelligenceNetwork } from "./intelligence-network/ein.js";

// Failure Database (permanent institutional knowledge of major failures)
export { FailureDatabase } from "./failure-database/database.js";

// Future Trends Lab (6mo–10yr trends with readiness scores)
export { FutureTrendsLab } from "./future-trends/lab.js";

// Intelligence lenses (translate information into decisions; pressure-test with the opposing view)
export { WhyThisMattersEngine } from "./intel-lenses/why-this-matters.js";
export { ContrarianViewEngine } from "./intel-lenses/contrarian.js";

// Briefing Engine (morning / lunch / evening / weekly executive briefings)
export { BriefingEngine } from "./briefings/engine.js";

// Podcast Studio OS ("Decoded with Alyssa DelTorre" — idea → episode → monetization)
export { PodcastStudioOS, PodcastStudioError, type PodcastStudioOptions } from "./podcast-studio/studio.js";

// Podcast Guest Booking Agent (guest pipeline + getting Alyssa booked on other shows; approval-gated)
export { PodcastGuestBookingAgent, GuestBookingError, type PodcastGuestBookingOptions } from "./podcast-guests/agent.js";

// PR Strategy Generator (PR is now a standard 13th department for every business)
export { PrStrategyGenerator, PrStrategyError, type PrStrategyGeneratorOptions } from "./pr/generator.js";

// === Leverage & Media capstone ===
// Story Mining Engine (every experience → a story for the right channel; never lose a good story)
export { StoryMiningEngine } from "./story-mining/engine.js";
// Media Operating System (one raw moment → many brand-correct assets; give Alyssa her life back)
export { MediaOperatingSystem, type MediaAssetSink } from "./media-os/engine.js";
// Brand DNA Engine (9 brands' identities; the Media OS auto-detects which brand content belongs to)
export { BrandDnaEngine } from "./brand-dna/engine.js";
// Content Factory (one piece → a full linked package of 42; nothing created twice)
export { ContentFactory, type ContentAssetSink } from "./content-factory/factory.js";
// Production Studio (production assets + per-brand presets that run automatically after approval)
export { ProductionStudio } from "./production-studio/studio.js";
// Visibility Engine (per-business Visibility Score + where/what/when to post, collab, speak, apply)
export { VisibilityEngine } from "./visibility/engine.js";
// PR & Authority Engine (authority assets + auto-detected PR opportunities; pitches gated on approval)
export { PrAuthorityEngine, PrAuthorityError, type AuthorityAssetSink } from "./pr-authority/engine.js";
// Audience Intelligence (distill every audience's fears/goals/objections; improve messaging)
export { AudienceIntelligence } from "./audience-intel/engine.js";
// Personal Freedom Engine (maximize life; recommend automation/delegation that preserves performance)
export { PersonalFreedomEngine } from "./personal-freedom/engine.js";
// Legacy Engine (turn repeatable knowledge into enduring, compounding IP)
export { LegacyEngine } from "./legacy/engine.js";
// Compounding Engine (reusable-form evaluation + Asset Lineage Graph + Compounding Score)
export { CompoundingEngine } from "./compounding/engine.js";
// Multiplication Engine (never solve once; convert to shared forms; Multiplication Score)
export { MultiplicationEngine } from "./multiplication/engine.js";
// Leverage Engine (every recommendation scored for future value; highest-leverage path, not fastest)
export { LeverageEngine } from "./leverage/engine.js";
// The Five Immutable Laws (the laws every feature/recommendation must satisfy)
export { ImmutableLaws, LAWS } from "./immutable-laws/laws.js";
// Executive Capital Allocator (highest-value daily/weekly/quarterly allocation of all capital kinds)
export { ExecutiveCapitalAllocator } from "./capital-allocator/allocator.js";
// Opportunity Cost Engine (compare options; show what's NOT chosen and why)
export { OpportunityCostEngine } from "./opportunity-cost/engine.js";
// Executive Decision Journal (record decisions; review at 30/90/365 days; surface patterns)
export { ExecutiveDecisionJournal } from "./decision-journal/journal.js";
// Enterprise Memory Timeline (chronological history; "when did we first discuss this?")
export { EnterpriseMemoryTimeline } from "./memory-timeline/timeline.js";
// Executive Review Board (10-role virtual board; highlight disagreements, don't force consensus)
export { ExecutiveReviewBoard } from "./review-board/board.js";

// Tenancy / Founder Intelligence System (tenant-scoped permissions)
export {
  PermissionChecker,
  ROLE_PERMISSIONS,
  type PermissionQuery,
} from "./tenancy/permissions.js";

// Executive Inbox (the single entry point — identify, classify, route, link, save)
export {
  ExecutiveInbox,
  type ExecutiveInboxOptions,
  type InboxMemory,
  type InboxBusiness,
} from "./executive-inbox/inbox.js";
export {
  detectItemType,
  classifyCategory,
  memoryKindFor,
  REQUIRED_FIELDS_BY_TYPE,
} from "./executive-inbox/classify.js";
export { InMemoryInboxRepository } from "./executive-inbox/in-memory-repository.js";
export type {
  InboxRepository,
  StoredInboxItem,
  InboxItemStatus,
  InboxListFilter,
} from "./executive-inbox/repository.js";

// Model Router (provider-agnostic model selection by task type)
export { ModelRouter } from "./model-router/router.js";
export { DEFAULT_MODEL_CATALOG } from "./model-router/catalog.js";

// Connector Registry (modular integrations — not hard-coded; tenant-scoped)
export {
  ConnectorRegistry,
  type ConnectorRegistryOptions,
} from "./connector-registry/registry.js";
export { CONNECTOR_BLUEPRINTS, type ConnectorBlueprint } from "./connector-registry/blueprints.js";

// GitHub Intelligence (never trust a repo; never execute; SAFE/NEEDS REVIEW/DO NOT USE → Asset Library)
export {
  GitHubIntelligence,
  RepoApprovalError,
  type GitHubIntelligenceOptions,
  type ApproveOptions,
} from "./github-intelligence/engine.js";
export { AssetLibrary } from "./github-intelligence/asset-library.js";
export { scanForFindings } from "./github-intelligence/detectors.js";
export { type KnownBusiness } from "./github-intelligence/businesscase.js";

// Global Asset Library (every business's assets; globally searchable, permission-aware)
export {
  GlobalAssetLibrary,
  type GlobalAssetLibraryOptions,
} from "./assets/library.js";
export { canViewAsset, type RoleResolver } from "./assets/access.js";

// Enterprise Security (least privilege; six classes always need approval; audit everything)
export {
  SecurityGate,
  type SecurityGateOptions,
  type RoleResolver as SecurityRoleResolver,
  type PermissionResolver,
} from "./security/gate.js";
export {
  evaluate as evaluateSecurityPolicy,
  isSensitive,
  SENSITIVE_ACTION_CLASSES,
  MONEY_OWNER_THRESHOLD_USD,
  DEFAULT_POLICY_CONFIG,
  type PolicyConfig,
  type PolicyContext,
  type PolicyVerdict,
} from "./security/policy.js";
export { AuditLog, type AuditInput } from "./security/audit.js";
export { ApprovalQueue, ApprovalQueueError, type EnqueueInput } from "./security/approvals.js";
export { SecretVault, SecretVaultError, type RegisterSecretInput } from "./security/vault.js";
export { SessionManager } from "./security/sessions.js";
export {
  PermissionGroupRegistry,
  PermissionGroupError,
  type CreateGroupInput,
} from "./security/groups.js";

// Goal Engine (turns outcomes into continuously-pursued plans; recalculates on change)
export { GoalEngine, GoalEngineError, type GoalEngineOptions } from "./goal/engine.js";
export { analyzeGoal, pathFor } from "./goal/analyze.js";
export { buildPlan, type PlanContext } from "./goal/plan.js";

// Persistent Approval (approve a workflow once; standing grants the Security Gate honors)
export {
  PersistentApprovalRegistry,
  PersistentApprovalError,
} from "./persistent-approval/registry.js";
export { covers, isLive, matchesScope, withinLimits } from "./persistent-approval/scope.js";

// Campaign Intelligence (A/B campaigns; auto-report; monthly optimize; autopilot until a stop fires)
export { CampaignEngine, CampaignEngineError, type CampaignEngineOptions } from "./campaign/engine.js";
export { CAMPAIGN_TEMPLATES, defaultMetric } from "./campaign/templates.js";
export { buildReport, toResults, pickWinner, bestConversionRate } from "./campaign/report.js";

// Opportunity Intelligence (continuously relate entities; surface + rank opportunities)
export {
  OpportunityEngine,
  OpportunityEngineError,
  type OpportunityEngineOptions,
} from "./opportunity/engine.js";
export { match, type Candidate } from "./opportunity/matchers.js";
export { scoreCandidate } from "./opportunity/scoring.js";

// ============================================================================
// Cognitive Offloading & Executive Operator capstone (L0/L1)
// ============================================================================

// Cognitive Offloading Engine (L0 — Understand→Connect→Build→Delegate→Report; "can Alyssa forget this?")
export { CognitiveOffloadingEngine } from "./cognitive-offload/engine.js";

// Life Logistics Engine (event → auto checklists, calendar blocks, reminders, follow-ups)
export { LifeLogisticsEngine } from "./life-logistics/engine.js";

// Anti-Fragility Engine (improve because of failures; recovery + learning + risk-reduction metrics)
export { AntiFragilityEngine } from "./anti-fragility/engine.js";

// Brain/Hands Separation (Brain recommends, Policy governs, Orchestrator coordinates, Hands execute)
export { BrainHandsRegistry, LAYER_CATALOG } from "./brain-hands/registry.js";

// Confidence-Weighted Agent Council (10 roles evaluate independently; agreement/gap/needs-more-data)
export { ConfidenceWeightedAgentCouncil } from "./agent-council/council.js";

// Billion-Dollar Operator Mode ("would this make sense at $100M+?" → cleaner scalable version)
export { BillionDollarOperatorMode } from "./operator-mode/engine.js";

// Capital Allocation Board (per-option payback/liquidity → invest/test/delay/automate/delegate/kill/sell/package)
export { CapitalAllocationBoard } from "./capital-board/board.js";

// Million-Dollar Sprint Engine (ranked cash paths; 7/30/90-day plans; no fantasy math)
export { MillionDollarSprintEngine } from "./million-sprint/engine.js";

// Revenue Truth System (honest pipeline ladder; cash collected first; activity != revenue)
export { RevenueTruthSystem } from "./revenue-truth/engine.js";

// Executive Delegation System (what Alyssa should NOT do herself → owner per task)
export { ExecutiveDelegationSystem } from "./delegation/engine.js";

// Enterprise Risk Register (13 categories; severity×likelihood; top-10 weekly)
export { EnterpriseRiskRegister } from "./risk-register/engine.js";

// Board Packet Generator (monthly board-level reporting before the company is large)
export { BoardPacketGenerator } from "./board-packet/generator.js";

// Strategic Exit & Asset Value Engine (which assets could be sold/licensed/acquired; steps to sellable)
export { StrategicExitEngine } from "./strategic-exit/engine.js";

// Founder Nervous System Protection (load/stress → delegate/batch/automate; burnout is enterprise risk)
export { FounderNervousSystemProtection } from "./nervous-system/engine.js";

// Relaxation Outcome Engine ("what must be handled so Alyssa can relax?")
export { RelaxationOutcomeEngine } from "./outcome/relaxation.js";

// True Progress Engine (never confuse intensity with progress; real vs fake)
export { TrueProgressEngine } from "./outcome/true-progress.js";

// Capital Engine (10 capital types; growth report; conversion paths)
export { CapitalEngine } from "./capital-engine/engine.js";

// Consequence Horizon Engine (immediate/30d/90d/1yr/5yr second- and third-order impact)
export { ConsequenceHorizonEngine } from "./consequence-horizon/engine.js";

// The Alfy² Pyramid (Capture→Organize→Understand→Recommend→Execute→Compound→Multiply→Freedom)
export { PyramidEngine, PYRAMID_LEVELS } from "./pyramid/engine.js";

// ============================================================================
// Operating-System meta-layer (R&D, freedom, self-improvement, the Infinite Loop)
// ============================================================================

// Research & Development Department (evaluate discoveries → disposition + confidence; weekly Innovation Report)
export { ResearchAndDevelopmentDepartment } from "./rnd/department.js";

// Acquisition Engine (build/buy/partner/license/white-label/acquire/invest/ignore; capital-allocator thinking)
export { AcquisitionEngine } from "./acquisition/engine.js";

// Executive Flight Deck (replaces the dashboard; shows only decision-changing sections)
export { ExecutiveFlightDeck } from "./flight-deck/engine.js";

// Founder Freedom Index (0–100; is Alfy² succeeding?; trend + bottleneck + recommendation)
export { FounderFreedomIndex } from "./freedom-index/engine.js";

// Life ROI Engine (financial ROI AND life returned; workdays returned; Life ROI Score)
export { LifeRoiEngine } from "./life-roi/engine.js";

// Never Again Engine (frustration → permanent infrastructure; nothing annoys Alyssa twice)
export { NeverAgainEngine } from "./never-again/engine.js";

// Enterprise Self-Improvement Engine (monthly OS self-evaluation → refactor + tech-debt; simpler not bigger)
export { EnterpriseSelfImprovementEngine } from "./self-improvement/engine.js";

// Enterprise Operating Rhythm (daily/weekly/monthly/quarterly/annual cadences + their generated outputs)
export { EnterpriseOperatingRhythm, RHYTHM_AGENDAS } from "./operating-rhythm/engine.js";

// Executive Operating Manual (assemble the living manual + flag stale sections)
export { ExecutiveOperatingManual } from "./exec-operating-manual/engine.js";

// The Infinite Loop (Observe→…→Increase Freedom→Observe; classify each module's loop stage)
export { InfiniteLoop, LOOP_STAGES } from "./infinite-loop/engine.js";

// The Ultimate Design Rule (feature-admission gate above the README and Constitution)
export { UltimateDesignRule, DESIGN_RULE_CRITERIA } from "./ultimate-design-rule/engine.js";

// ============================================================================
// Identity, Conversation & Voice (thinking partner; protect who Alyssa is)
// ============================================================================

// Identity OS (store identity anchors; identity overrides optimization on conflict)
export { IdentityOS, IdentityOSError } from "./identity-os/engine.js";

// Philosophy Library (every principle/framework/equation; "Today's Reminder")
export { PhilosophyLibrary, PhilosophyLibraryError } from "./philosophy-library/library.js";

// Conversation Engine (thinking partner; natural speech → tasks/assets/agents/businesses/...)
export { ConversationEngine } from "./conversation/engine.js";

// Vision Builder ("I have an idea..." → collaborative thinking mode; plans await approval)
export { VisionBuilder } from "./vision-builder/engine.js";

// Voice Interface (utterance → command; sensitive actions confirm first; calm companion)
export { VoiceInterface, interpretMany } from "./voice-interface/engine.js";

// ============================================================================
// Build → Ship → Govern subsystem (Conversation-to-Code spine). Approval-gated.
// ============================================================================

// Build Packet Generator / Architect-to-Builder (idea/transcript → structured packet; approve before handoff)
export { BuildPacketGenerator } from "./build-packet/engine.js";

// Code Execution Handoff (approved packet → coding-agent plan; refuses unapproved; production needs approval)
export { CodeExecutionHandoff, HandoffApprovalError } from "./code-handoff/engine.js";

// Implementation Review Agent (post-build review across 8 dimensions → approve/needs_revision/reject)
export { ImplementationReviewAgent } from "./implementation-review/engine.js";

// Ship Gate (8 checks incl. Alyssa's approval → ready_to_ship/needs_review/do_not_ship)
export { ShipGate } from "./ship-gate/engine.js";

// Divini Standard (14-criterion quality gate → proceed/redesign/reject)
export { DiviniStandard } from "./divini-standard/engine.js";

// Conversation-to-Code Pipeline (12 stages conversation→compounding_asset; deployment needs approval)
export { ConversationToCodePipeline } from "./conversation-to-code/engine.js";

// Infrastructure Launch Engine (prepare 95% per provider; never blocks on a missing secret)
export { InfrastructureLaunchEngine } from "./infra-launch/engine.js";

// Press Live Mode (pre-launch checks → ready_to_launch/blocked_by_*/live; live needs Alyssa)
export { PressLiveMode } from "./press-live/engine.js";

// Human Touch Queue (batch the human-only 5%; never stop the build on a permission/secret/login)
export { HumanTouchQueue } from "./human-touch-queue/engine.js";

// Permission Memory & Reuse (remember approved access; reuse silently; escalate only if expired/risky)
export { PermissionMemory } from "./permission-memory/engine.js";

// Batch Once Engine (do repetitive setup once → SOP → reuse; never ask twice)
export { BatchOnceEngine } from "./batch-once/engine.js";

// ============================================================================
// Build subsystem Wave 3 — governance, monitoring, reuse.
// ============================================================================

// Future Me Engine (represents Alyssa 1/5/10 years out; regret risk → better path)
export { FutureMeEngine } from "./future-me/engine.js";

// Optionality Engine (preserve/create future choices; prefer greatest long-term optionality)
export { OptionalityEngine } from "./optionality/engine.js";

// Executive Thought Partner (challenge/support/compare/refine; never auto-agrees; always reasons)
export { ExecutiveThoughtPartner } from "./executive-thought-partner/engine.js";

// Capability Monitor (new model/tool capability → Capability Report + priority)
export { CapabilityMonitor } from "./capability-monitor/engine.js";

// Tech Stack Evaluator (upgrade/replace/wait/experiment/ignore; change only on measurable benefit)
export { TechStackEvaluator } from "./tech-stack-evaluator/engine.js";

// Build Once, Reuse Everywhere (package valuable builds as reusable component/workflow/agent/schema/prompt/playbook)
export { BuildOnceReuseEngine } from "./build-once-reuse/engine.js";

// ============================================================================
// Executive-team & life engines (the contract-complete placeholders made live).
// ============================================================================

// Companion Voice Persona (named British-female voice layer; never the brain)
export { CompanionVoicePersona } from "./voice-persona/engine.js";

// Personal Executive Model (learns how Alyssa operates; explainable; amplifies not imitates)
export { PersonalExecutiveModelEngine } from "./personal-executive-model/engine.js";

// Meeting Prep (pre-meeting dossier + post-meeting recap)
export { MeetingPrepEngine } from "./meeting-prep/engine.js";

// Relationship Capital (treat relationships as long-term capital; surface value-creating moves)
export { RelationshipCapitalEngine } from "./relationship-capital/engine.js";

// Venture Studio ("I have an idea" → 17-stage company build; inherits standards; launch needs approval)
export { VentureStudio } from "./venture-studio/engine.js";

// Alyssa Pattern Mirror (learn how Alyssa thinks; flag framework candidates → Teach My Framework)
export { AlyssaPatternMirror } from "./alyssa-pattern-mirror/engine.js";

// Teach My Framework (recurring problem-solving → named teachable framework + 10 reusable artifacts)
export { TeachMyFrameworkEngine } from "./teach-framework/engine.js";

// Life Dashboard (success beyond business; read-model; "businesses exist to support life")
export { LifeDashboardEngine } from "./life-dashboard/engine.js";

// Supabase Architecture Engine (per-module FounderOS-ready table plan; read-model/generator)
export { SupabaseArchitectureEngine } from "./supabase-architecture/engine.js";

// Developer Command Center (see what is being built without reading code; read-model)
export { DeveloperCommandCenterEngine } from "./developer-command-center/engine.js";

// ============================================================================
// Phase 2 — Connections layer (Set up & Connect: master / business / personal).
// ============================================================================

// Connections Hub (register platforms at runtime; scoped connections; business→master resolution)
export { ConnectionsHub, UnknownConnectorError } from "./connections/engine.js";

// Build From Brainstorm (brain dump → decisions → strategy → prompt pack → approval-gated build)
export {
  BuildFromBrainstormEngine,
  type BuildFromBrainstormOptions,
} from "./build-from-brainstorm/engine.js";

// People Operations + Hiring Lifecycle (role need → design → hire → onboard → manage → offboard)
export { PeopleOpsEngine, PeopleOpsEngineError } from "./people-ops/engine.js";

// Department OS + AI Employee KPI/scorecards (departments, operating loops, governance)
export {
  DepartmentOsEngine,
  AI_EMPLOYEE_KPI_NAMES,
  DEFAULT_DEPARTMENTS,
  type DepartmentOsEngineOptions,
  type CreateDepartmentInput,
  type CreateAiEmployeeInput,
  type RecordKpiInput,
} from "./department-os/engine.js";

// AI Organization / Chain of Command (78 role cards, delegation, reports, escalation, accountability)
export {
  AiOrgEngine,
  DEFAULT_ROLE_CARDS,
  type AiOrgEngineOptions,
  type AddRoleCardInput,
  type ListRoleCardsFilter,
  type IssueDelegationPacketInput,
  type SubmitReportInput,
  type RaiseEscalationInput,
  type RecordAccountabilityInput,
  type ReviewDecision,
} from "./ai-org/engine.js";

// CRO / Revenue Command (portfolio opportunity scoring, command center, business missions)
export { RevenueCommandEngine, type RevenueCommandEngineOptions } from "./revenue-command/engine.js";

// Swarm Lab — R&D department's bounded swarm (parallel exploration → approval-gated pipeline)
export { SwarmLabEngine, type SwarmLabOptions, type SwarmGenerator } from "./swarm-lab/engine.js";

// Business Operating Profiles + Context Stack (business-aware execution; no cross-business mixing)
export {
  BusinessProfileEngine,
  TIER1_PROFILES,
  CONTEXT_STACK_LAYER_ORDER,
  type BusinessProfileEngineOptions,
  type UpsertBusinessProfileInput,
  type ListProfilesFilter,
  type ContextLayerContent,
  type BuildContextStackInput,
} from "./business-profile/engine.js";

// Executive Review Cadence + Master Docs (monthly/quarterly/yearly business + portfolio reviews)
export {
  ReviewCadenceEngine,
  type ReviewCadenceEngineOptions,
  type OpenReviewInput,
  type SubmitDepartmentReportInput,
  type CaptureFeedbackInput,
  type ListReviewsFilter,
} from "./review-cadence/engine.js";

// Expert Knowledge Council + Framework Library (the greats; lens application + conflict resolution)
export {
  ExpertCouncilEngine,
  DEFAULT_FRAMEWORKS,
  type ExpertCouncilEngineOptions,
  type AddFrameworkInput,
  type ApplyLensesInput,
  type ConvertPrincipleInput,
  type RunAdvisoryBoardInput,
  type WhatWouldTheGreatsDoInput,
  type ListFrameworksFilter,
} from "./expert-council/engine.js";

// Org Health / CODO (wellness, communication audits, train-not-replace corrections, CEO coaching)
export {
  OrgHealthEngine,
  recommendWellness,
  WORKLOAD_HIGH,
  APPROVAL_DELAY_HIGH_MS,
  FAILURE_RATE_HIGH,
  FAILURE_RATE_PAUSE,
  WORKLOAD_UNDERUTILIZED,
  COMM_DIMENSION_THRESHOLD,
  COMM_AMBIGUITY_THRESHOLD,
  COMM_SCORE_LOW,
  type OrgHealthEngineOptions,
  type RecordWellnessInput,
  type AuditCommunicationInput,
  type RecordCorrectionInput,
  type CeoCoachingSeeds,
  type WeeklyOrgReview,
} from "./org-health/engine.js";

// Incentive Alignment + Referral Ecosystem + Value Exchange (protect business first; approve money)
export { IncentiveEcosystemEngine, type IncentiveEcosystemEngineOptions } from "./incentive-ecosystem/engine.js";

// Knowledge Ops (expert source library + Operator Digest + Adaptation Filter + governance + experiments)
export {
  KnowledgeOpsEngine,
  type KnowledgeOpsEngineOptions,
  type AddSourceInput,
  type ListSourcesFilter,
  type DigestItemInput,
  type GenerateDigestInput,
  type AdaptationFilterInput,
  type ClassifyInput,
  type SimulateScenariosInput,
  type DesignExperimentInput,
  type RecordExperimentResultInput,
} from "./knowledge-ops/engine.js";

// Lifecycle + Growth Architecture (8-stage lifecycle, growth loops, trust flywheel, white-glove)
export {
  LifecycleGrowthEngine,
  LifecycleGrowthEngineError,
  type LifecycleGrowthEngineOptions,
} from "./lifecycle-growth/engine.js";

// Market Intelligence (voice-of-customer, market gaps, AI-search/AEO visibility)
export {
  MarketIntelEngine,
  WEAK_SIGNAL_THRESHOLD,
  type MarketIntelEngineOptions,
} from "./market-intel/engine.js";

// Oversight (leadership blind-spot detector, recursive optimizer, billion-dollar standard checker)
export {
  OversightEngine,
  STANDARD_BLIND_SPOT_QUESTIONS,
  type OversightEngineOptions,
  type BlindSpotQuestion,
  type DetectBlindSpotsInput,
  type RunRecursiveDiagnosisInput,
  type RunBillionDollarCheckInput,
} from "./oversight/engine.js";
