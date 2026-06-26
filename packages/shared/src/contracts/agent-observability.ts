import { z } from "zod";

/**
 * Agent Observability contracts. Alfy² records every agent action with full provenance so it can
 * always answer: what did this agent do, why did it do that, what data did it use, and what changed
 * afterward. Action records are append-only. Dashboards aggregate performance, failures, cost, ROI,
 * risky actions, approval bottlenecks, and repeated failures. See docs/adr/ADR-0020-agent-observability.md.
 * Mirrored in workers (Pydantic).
 */

/** The approval state of a recorded action. */
export const ActionApprovalStatusSchema = z.enum([
  "not_required",
  "auto_approved",
  "approved",
  "pending",
  "rejected",
]);
export type ActionApprovalStatus = z.infer<typeof ActionApprovalStatusSchema>;

/** How an action turned out. */
export const ActionOutcomeSchema = z.enum(["success", "partial", "failure", "skipped", "blocked"]);
export type ActionOutcome = z.infer<typeof ActionOutcomeSchema>;

export const ActionRiskLevelSchema = z.enum(["low", "medium", "high"]);
export type ActionRiskLevel = z.infer<typeof ActionRiskLevelSchema>;

/** One immutable record of an agent action, with full provenance. */
export const AgentActionRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  agent_name: z.string().min(1),
  task: z.string().min(1),
  /** What the agent was given. */
  input: z.string().default(""),
  /** Tools the agent invoked. */
  tools_used: z.array(z.string()).default([]),
  /** Memory ids/refs the agent read or wrote. */
  memory_used: z.array(z.string()).default([]),
  /** The decision the agent made — the "why". */
  decision: z.string().default(""),
  /** Free rationale supporting the decision. */
  rationale: z.string().default(""),
  approval_status: ActionApprovalStatusSchema.default("not_required"),
  cost_usd: z.number().nonnegative().default(0),
  runtime_ms: z.number().int().nonnegative().default(0),
  outcome: ActionOutcomeSchema,
  /** Errors raised during the action. */
  errors: z.array(z.string()).default([]),
  /** What changed as a result — the "what changed afterward". */
  downstream_effects: z.array(z.string()).default([]),
  /** Revenue/value attributed to the action, for ROI. */
  value_usd: z.number().default(0),
  risk_level: ActionRiskLevelSchema.default("low"),
  at: z.string().datetime(),
});
export type AgentActionRecord = z.infer<typeof AgentActionRecordSchema>;

/** Input to log an action (ids/timestamps are filled by the engine). */
export const LogAgentActionInputSchema = z.object({
  agent_name: z.string().min(1),
  task: z.string().min(1),
  input: z.string().default(""),
  tools_used: z.array(z.string()).default([]),
  memory_used: z.array(z.string()).default([]),
  decision: z.string().default(""),
  rationale: z.string().default(""),
  approval_status: ActionApprovalStatusSchema.default("not_required"),
  cost_usd: z.number().nonnegative().default(0),
  runtime_ms: z.number().int().nonnegative().default(0),
  outcome: ActionOutcomeSchema,
  errors: z.array(z.string()).default([]),
  downstream_effects: z.array(z.string()).default([]),
  value_usd: z.number().default(0),
  risk_level: ActionRiskLevelSchema.default("low"),
});
export type LogAgentActionInput = z.infer<typeof LogAgentActionInputSchema>;

/** Per-agent performance roll-up. */
export const AgentPerformanceSchema = z.object({
  agent_name: z.string().min(1),
  actions: z.number().int().nonnegative(),
  successes: z.number().int().nonnegative(),
  failures: z.number().int().nonnegative(),
  success_rate: z.number().min(0).max(1),
  avg_runtime_ms: z.number().nonnegative(),
  total_cost_usd: z.number().nonnegative(),
  total_value_usd: z.number(),
  /** (value - cost) / cost, or null when cost is 0. */
  roi: z.number().nullable().default(null),
});
export type AgentPerformance = z.infer<typeof AgentPerformanceSchema>;

/** A recurring failure signature. */
export const RepeatedFailureSchema = z.object({
  agent_name: z.string().min(1),
  task: z.string().min(1),
  count: z.number().int().positive(),
  last_error: z.string().default(""),
});
export type RepeatedFailure = z.infer<typeof RepeatedFailureSchema>;

/** An agent waiting on approvals (an approval bottleneck). */
export const ApprovalBottleneckSchema = z.object({
  agent_name: z.string().min(1),
  pending_actions: z.number().int().nonnegative(),
  rejected_actions: z.number().int().nonnegative(),
});
export type ApprovalBottleneck = z.infer<typeof ApprovalBottleneckSchema>;

/** The aggregate dashboard view. */
export const ObservabilityDashboardSchema = z.object({
  generated_at: z.string().datetime(),
  performance: z.array(AgentPerformanceSchema).default([]),
  failed_actions: z.array(AgentActionRecordSchema).default([]),
  cost_by_agent: z.array(z.object({ agent_name: z.string(), cost_usd: z.number().nonnegative() })).default([]),
  roi_by_agent: z.array(z.object({ agent_name: z.string(), roi: z.number().nullable() })).default([]),
  risky_actions: z.array(AgentActionRecordSchema).default([]),
  approval_bottlenecks: z.array(ApprovalBottleneckSchema).default([]),
  repeated_failures: z.array(RepeatedFailureSchema).default([]),
});
export type ObservabilityDashboard = z.infer<typeof ObservabilityDashboardSchema>;

/** The structured answer to the four provenance questions about a single action. */
export const ActionExplanationSchema = z.object({
  action_id: z.string().uuid(),
  what_it_did: z.string().min(1),
  why_it_did_that: z.string().min(1),
  what_data_it_used: z.string().min(1),
  what_changed_afterward: z.string().min(1),
});
export type ActionExplanation = z.infer<typeof ActionExplanationSchema>;
