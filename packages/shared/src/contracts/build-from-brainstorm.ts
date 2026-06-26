import { z } from "zod";

/**
 * Build From Brainstorm — the bridge between raw founder thinking and Alfy²'s execution system.
 *
 * Pipeline: Brain Dump → Extract Decisions → Stratify Plan → Build Prompt Pack → Build Queue →
 * Approval Gate → Agent Execution → QA → Changelog.
 *
 * NON-NEGOTIABLE RULE: raw conversation is INPUT, never a command. Nothing executes until the
 * operator approves a structured build queue. The engine enforces this — tasks cannot reach
 * `running` until the thread's queue passes an explicit Approval Gate.
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 */

// ---------------------------------------------------------------------------
// Enums (locally named to avoid barrel collisions with other contracts)
// ---------------------------------------------------------------------------

/** How a brainstorm input arrived. */
export const BrainstormInputSourceSchema = z.enum([
  "voice",
  "text",
  "pasted_notes",
  "chatgpt_import",
  "claude_import",
  "doc_upload",
  "screenshot",
  "video_summary",
]);
export type BrainstormInputSource = z.infer<typeof BrainstormInputSourceSchema>;

/** Classification of a single statement in the thread. Conversation is classified, NOT executed. */
export const BrainstormInputKindSchema = z.enum([
  "final_decision",
  "possible_idea",
  "rejected_idea",
  "emotional_context",
  "clarification",
  "unresolved_question",
  "feature_request",
  "business_rule",
  "ui_ux_note",
  "technical_instruction",
  "compliance_risk_note",
  "prompt_logic",
  "algorithm_rule",
  "future_idea",
]);
export type BrainstormInputKind = z.infer<typeof BrainstormInputKindSchema>;

/** Lifecycle of a brainstorm thread as it moves through the pipeline. */
export const BrainstormThreadStatusSchema = z.enum([
  "open",
  "decisions_extracted",
  "strategy_mapped",
  "prompts_generated",
  "queued",
  "awaiting_approval",
  "building",
  "completed",
]);
export type BrainstormThreadStatus = z.infer<typeof BrainstormThreadStatusSchema>;

/** Category of an extracted decision. (Named with a Brainstorm prefix to avoid barrel collision
 * with decision.ts's DecisionCategorySchema.) */
export const BrainstormDecisionCategorySchema = z.enum([
  "confirmed_decision",
  "unresolved_decision",
  "rejected_idea",
  "assumption",
  "dependency",
  "open_question",
  "business_goal",
  "system_requirement",
  "feature_requirement",
  "workflow_change",
  "content_update",
  "prompt_update",
  "schema_change",
  "automation_change",
  "agent_instruction",
  "qa_requirement",
]);
export type BrainstormDecisionCategory = z.infer<typeof BrainstormDecisionCategorySchema>;

export const DecisionStatusSchema = z.enum(["confirmed", "needs_review", "rejected", "parked"]);
export type DecisionStatus = z.infer<typeof DecisionStatusSchema>;

export const BrainstormRiskSchema = z.enum(["low", "medium", "high", "critical"]);
export type BrainstormRisk = z.infer<typeof BrainstormRiskSchema>;

/** The seven logic layers a strategy map separates (her A–G). */
export const StrategyLayerSchema = z.enum([
  "strategic",
  "product",
  "prompt",
  "workflow",
  "technical",
  "ui_ux",
  "compliance_risk",
]);
export type StrategyLayer = z.infer<typeof StrategyLayerSchema>;

/** The ten prompt categories in a Build Prompt Pack. */
export const PromptCategorySchema = z.enum([
  "product",
  "ui_ux",
  "frontend",
  "backend",
  "database_schema",
  "prompt_engineering",
  "automation",
  "qa_testing",
  "documentation",
  "compliance_review",
]);
export type PromptCategory = z.infer<typeof PromptCategorySchema>;

/** Agent a build task is routed to. */
export const BuildAgentKindSchema = z.enum([
  "design_ui",
  "frontend",
  "backend",
  "schema",
  "prompt",
  "automation",
  "qa",
  "documentation",
  "compliance",
]);
export type BuildAgentKind = z.infer<typeof BuildAgentKindSchema>;

/** The full build-task status set (her 12 statuses). */
export const BuildTaskStatusSchema = z.enum([
  "draft",
  "needs_review",
  "approved",
  "queued",
  "running",
  "blocked",
  "failed",
  "needs_human_input",
  "completed",
  "qa_passed",
  "deployed",
  "rolled_back",
]);
export type BuildTaskStatus = z.infer<typeof BuildTaskStatusSchema>;

export const BuildTaskPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export type BuildTaskPriority = z.infer<typeof BuildTaskPrioritySchema>;

export const TaskComplexitySchema = z.enum(["trivial", "small", "medium", "large", "xl"]);
export type TaskComplexity = z.infer<typeof TaskComplexitySchema>;

export const QaVerdictSchema = z.enum(["passed", "failed", "needs_review", "partial_pass"]);
export type QaVerdict = z.infer<typeof QaVerdictSchema>;

/** Action taken on the Approval Gate screen. */
export const ApprovalActionSchema = z.enum([
  "approve_all",
  "approve_selected",
  "revise_before_running",
  "cancel",
]);
export type ApprovalAction = z.infer<typeof ApprovalActionSchema>;

/** Build-queue controls the operator can invoke. */
export const QueueControlSchema = z.enum([
  "approve_all",
  "approve_selected",
  "reject_selected",
  "revise_task",
  "move_to_parking_lot",
  "run_approved",
  "pause_queue",
  "retry_failed",
  "rollback_task",
]);
export type QueueControl = z.infer<typeof QueueControlSchema>;

// ---------------------------------------------------------------------------
// Stage 1 — Brainstorm Thread + classified inputs
// ---------------------------------------------------------------------------

export const BrainstormThreadSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid().nullable().default(null),
  title: z.string().min(1),
  status: BrainstormThreadStatusSchema.default("open"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type BrainstormThread = z.infer<typeof BrainstormThreadSchema>;

export const BrainstormInputSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  source: BrainstormInputSourceSchema,
  raw_text: z.string().min(1),
  kind: BrainstormInputKindSchema,
  /** Whether this input is actionable (vs emotional/clarification/parking-lot). */
  actionable: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.5),
  created_at: z.string().datetime(),
});
export type BrainstormInput = z.infer<typeof BrainstormInputSchema>;

export const IngestBrainstormInputSchema = z.object({
  thread_id: z.string().uuid(),
  source: BrainstormInputSourceSchema.default("text"),
  raw_text: z.string().min(1),
  /** Optional explicit classification; when omitted the engine classifies heuristically. */
  kind: BrainstormInputKindSchema.optional(),
});
export type IngestBrainstormInput = z.infer<typeof IngestBrainstormInputSchema>;

// ---------------------------------------------------------------------------
// Stage 2 — Extracted Decisions (Decision Cards)
// ---------------------------------------------------------------------------

export const DecisionCardSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  title: z.string().min(1),
  category: BrainstormDecisionCategorySchema,
  source_input_ids: z.array(z.string().uuid()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  status: DecisionStatusSchema.default("needs_review"),
  why_it_matters: z.string().default(""),
  related_task_ids: z.array(z.string().uuid()).default([]),
  risk_level: BrainstormRiskSchema.default("low"),
  approval_required: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type DecisionCard = z.infer<typeof DecisionCardSchema>;

// ---------------------------------------------------------------------------
// Stage 3 — Strategy / Logic Map
// ---------------------------------------------------------------------------

export const StrategyLayerEntrySchema = z.object({
  layer: StrategyLayerSchema,
  what_user_wants: z.array(z.string()).default([]),
  why_it_matters: z.array(z.string()).default([]),
  product_changes: z.array(z.string()).default([]),
  agents_needed: z.array(BuildAgentKindSchema).default([]),
  files_systems_affected: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  needs_approval: z.boolean().default(false),
  do_not_build_yet: z.boolean().default(false),
});
export type StrategyLayerEntry = z.infer<typeof StrategyLayerEntrySchema>;

export const StrategyMapSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  layers: z.array(StrategyLayerEntrySchema).default([]),
  /** Decisions explicitly held back from this build. */
  parked_decision_ids: z.array(z.string().uuid()).default([]),
  created_at: z.string().datetime(),
});
export type StrategyMap = z.infer<typeof StrategyMapSchema>;

// ---------------------------------------------------------------------------
// Stage 4 — Build Prompt Pack
// ---------------------------------------------------------------------------

export const BuildPromptCardSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  category: PromptCategorySchema,
  task_title: z.string().min(1),
  objective: z.string().default(""),
  context: z.string().default(""),
  requirements: z.array(z.string()).default([]),
  affected_area: z.string().default(""),
  acceptance_criteria: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  test_steps: z.array(z.string()).default([]),
  rollback_notes: z.string().default(""),
  recommended_agent: BuildAgentKindSchema,
  decision_ids: z.array(z.string().uuid()).default([]),
  created_at: z.string().datetime(),
});
export type BuildPromptCard = z.infer<typeof BuildPromptCardSchema>;

export const BuildPromptPackSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  prompt_ids: z.array(z.string().uuid()).default([]),
  created_at: z.string().datetime(),
});
export type BuildPromptPack = z.infer<typeof BuildPromptPackSchema>;

// ---------------------------------------------------------------------------
// Stage 5 — Build Queue (tasks)
// ---------------------------------------------------------------------------

export const BuildTaskSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  prompt_id: z.string().uuid().nullable().default(null),
  name: z.string().min(1),
  status: BuildTaskStatusSchema.default("draft"),
  priority: BuildTaskPrioritySchema.default("medium"),
  assigned_agent: BuildAgentKindSchema,
  estimated_complexity: TaskComplexitySchema.default("medium"),
  dependencies: z.array(z.string().uuid()).default([]),
  approved: z.boolean().default(false),
  approved_at: z.string().datetime().nullable().default(null),
  execution_log: z.array(z.string()).default([]),
  result: z.string().default(""),
  qa_state: QaVerdictSchema.nullable().default(null),
  rollback_available: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type BuildTask = z.infer<typeof BuildTaskSchema>;

// ---------------------------------------------------------------------------
// Stage 6 — Approval Gate
// ---------------------------------------------------------------------------

export const ApprovalSummarySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  task_ids: z.array(z.string().uuid()).default([]),
  affected_files_modules: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  includes_database_changes: z.boolean().default(false),
  includes_ui_changes: z.boolean().default(false),
  includes_production_deploy: z.boolean().default(false),
  highest_risk: BrainstormRiskSchema.default("low"),
  created_at: z.string().datetime(),
});
export type ApprovalSummary = z.infer<typeof ApprovalSummarySchema>;

export const ApproveQueueInputSchema = z.object({
  thread_id: z.string().uuid(),
  action: ApprovalActionSchema,
  /** Required when action = approve_selected. */
  task_ids: z.array(z.string().uuid()).default([]),
});
export type ApproveQueueInput = z.infer<typeof ApproveQueueInputSchema>;

// ---------------------------------------------------------------------------
// Stage 7 — Agent Execution (run logs)
// ---------------------------------------------------------------------------

export const AgentRunLogSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  task_id: z.string().uuid(),
  agent: BuildAgentKindSchema,
  started_at: z.string().datetime(),
  finished_at: z.string().datetime().nullable().default(null),
  files_touched: z.array(z.string()).default([]),
  changes_made: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  completion_result: z.enum(["completed", "failed", "needs_human_input", "blocked"]),
  qa_result: QaVerdictSchema.nullable().default(null),
  changelog_entry_id: z.string().uuid().nullable().default(null),
});
export type AgentRunLog = z.infer<typeof AgentRunLogSchema>;

// ---------------------------------------------------------------------------
// Stage 8 — QA / Validation
// ---------------------------------------------------------------------------

export const QaCheckSchema = z.object({
  name: z.string().min(1),
  passed: z.boolean(),
  detail: z.string().default(""),
});
export type QaCheck = z.infer<typeof QaCheckSchema>;

export const QaResultSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  task_id: z.string().uuid(),
  verdict: QaVerdictSchema,
  checks: z.array(QaCheckSchema).default([]),
  failure_reason: z.string().nullable().default(null),
  recommended_fix: z.string().nullable().default(null),
  retry_prompt: z.string().nullable().default(null),
  human_review_required: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type QaResult = z.infer<typeof QaResultSchema>;

// ---------------------------------------------------------------------------
// Stage 9 — Changelog
// ---------------------------------------------------------------------------

export const BrainstormChangelogEntrySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  created_at: z.string().datetime(),
  brainstorm_source: z.string().default(""),
  decisions_extracted: z.number().int().nonnegative().default(0),
  tasks_completed: z.array(z.string()).default([]),
  tasks_failed: z.array(z.string()).default([]),
  files_modules_changed: z.array(z.string()).default([]),
  qa_results_summary: z.string().default(""),
  deployment_status: z.enum(["none", "staged", "deployed", "rolled_back"]).default("none"),
  rollback_notes: z.string().default(""),
  next_recommended_actions: z.array(z.string()).default([]),
});
export type BrainstormChangelogEntry = z.infer<typeof BrainstormChangelogEntrySchema>;
