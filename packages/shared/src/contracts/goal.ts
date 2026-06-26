import { z } from "zod";
import { PriorityLevelSchema } from "./decision.js";

/**
 * Goal Engine contracts. A goal turns a desired outcome into a continuously-pursued plan. For every
 * goal the engine determines current/desired state, the gap, constraints, resources, best
 * opportunities, and three candidate paths (fastest, lowest-resistance, highest-ROI), then generates a
 * weekly plan, daily priorities, recommended agents/automations, an expected completion, and a risk
 * analysis. Approved goals are pursued until they are completed, paused, cancelled, or flagged for
 * review; when a goal changes, the engine recalculates. See docs/adr/ADR-0016-goal-engine.md.
 * Mirrored in workers (Pydantic).
 */

/** The nine kinds of goal Alfy² pursues. */
export const GoalTypeSchema = z.enum([
  "personal",
  "financial",
  "business",
  "health",
  "learning",
  "relationships",
  "launches",
  "sales",
  "cash_flow",
]);
export type GoalType = z.infer<typeof GoalTypeSchema>;

/**
 * Lifecycle. A goal is `draft` until approved; an approved goal is `active` (being pursued) and stays
 * that way until it is `completed`, `paused`, `cancelled`, or `review_required`.
 */
export const GoalStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "cancelled",
  "completed",
  "review_required",
]);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

/** The three candidate paths the engine always produces. */
export const PathKindSchema = z.enum(["fastest", "lowest_resistance", "highest_roi"]);
export type PathKind = z.infer<typeof PathKindSchema>;

/** A low/medium/high rating used for severity, leverage, likelihood, and impact. */
export const LevelSchema = z.enum(["low", "medium", "high"]);
export type Level = z.infer<typeof LevelSchema>;

export const ResourceKindSchema = z.enum([
  "time",
  "money",
  "people",
  "tool",
  "knowledge",
  "relationship",
  "other",
]);
export type ResourceKind = z.infer<typeof ResourceKindSchema>;

export const ConstraintSchema = z.object({
  description: z.string().min(1),
  severity: LevelSchema.default("medium"),
});
export type Constraint = z.infer<typeof ConstraintSchema>;

export const ResourceSchema = z.object({
  description: z.string().min(1),
  kind: ResourceKindSchema.default("other"),
});
export type Resource = z.infer<typeof ResourceSchema>;

export const OpportunitySchema = z.object({
  description: z.string().min(1),
  /** How much leverage seizing this opportunity provides. */
  leverage: LevelSchema.default("medium"),
});
export type Opportunity = z.infer<typeof OpportunitySchema>;

/** A candidate path from current to desired state. */
export const GoalPathSchema = z.object({
  kind: PathKindSchema,
  summary: z.string().min(1),
  steps: z.array(z.string()).min(1),
  rationale: z.string().min(1),
  estimated_days: z.number().int().nonnegative(),
  risk_level: LevelSchema.default("medium"),
});
export type GoalPath = z.infer<typeof GoalPathSchema>;

/** One identified risk to achieving the goal. */
export const RiskItemSchema = z.object({
  description: z.string().min(1),
  likelihood: LevelSchema.default("medium"),
  impact: LevelSchema.default("medium"),
  mitigation: z.string().min(1),
});
export type RiskItem = z.infer<typeof RiskItemSchema>;

/** One week of the plan. */
export const WeeklyPlanItemSchema = z.object({
  week: z.number().int().positive(),
  focus: z.string().min(1),
  milestones: z.array(z.string()).default([]),
  outcome: z.string().default(""),
});
export type WeeklyPlanItem = z.infer<typeof WeeklyPlanItemSchema>;

/** The full situation analysis the engine produces for a goal. */
export const GoalAnalysisSchema = z.object({
  current_state: z.string().min(1),
  desired_state: z.string().min(1),
  gap: z.string().min(1),
  constraints: z.array(ConstraintSchema).default([]),
  resources: z.array(ResourceSchema).default([]),
  best_opportunities: z.array(OpportunitySchema).default([]),
  fastest_path: GoalPathSchema,
  lowest_resistance_path: GoalPathSchema,
  highest_roi_path: GoalPathSchema,
  recommended_path: PathKindSchema,
  explanation: z.string().min(1),
});
export type GoalAnalysis = z.infer<typeof GoalAnalysisSchema>;

/** The executable plan derived from the analysis. */
export const GoalPlanSchema = z.object({
  weekly_plan: z.array(WeeklyPlanItemSchema).default([]),
  daily_priorities: z.array(z.string()).default([]),
  recommended_agents: z.array(z.string()).default([]),
  recommended_automations: z.array(z.string()).default([]),
  expected_completion: z.string().datetime(),
  risk_analysis: z.array(RiskItemSchema).default([]),
  risk_summary: z.string().min(1),
});
export type GoalPlan = z.infer<typeof GoalPlanSchema>;

/** A pursued goal. `approved` gates pursuit; `version` bumps every recalculation. */
export const GoalSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  type: GoalTypeSchema,
  title: z.string().min(1),
  description: z.string().default(""),
  status: GoalStatusSchema.default("draft"),
  approved: z.boolean().default(false),
  business_id: z.string().uuid().nullable().default(null),
  /** Optional measurable target. */
  metric: z.string().nullable().default(null),
  unit: z.string().nullable().default(null),
  baseline_value: z.number().nullable().default(null),
  current_value: z.number().nullable().default(null),
  target_value: z.number().nullable().default(null),
  deadline: z.string().datetime().nullable().default(null),
  priority_level: PriorityLevelSchema,
  analysis: GoalAnalysisSchema,
  plan: GoalPlanSchema,
  version: z.number().int().positive().default(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_recalculated_at: z.string().datetime().nullable().default(null),
});
export type Goal = z.infer<typeof GoalSchema>;

/** Input to define a new goal. */
export const CreateGoalInputSchema = z.object({
  type: GoalTypeSchema,
  title: z.string().min(1),
  description: z.string().default(""),
  current_state: z.string().min(1),
  desired_state: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  metric: z.string().nullable().default(null),
  unit: z.string().nullable().default(null),
  baseline_value: z.number().nullable().default(null),
  current_value: z.number().nullable().default(null),
  target_value: z.number().nullable().default(null),
  deadline: z.string().datetime().nullable().default(null),
  constraints: z.array(z.string()).default([]),
  resources: z.array(z.string()).default([]),
});
export type CreateGoalInput = z.infer<typeof CreateGoalInputSchema>;

/** A change to a goal that triggers automatic recalculation. */
export const GoalChangeSchema = z.object({
  desired_state: z.string().nullable().default(null),
  target_value: z.number().nullable().default(null),
  current_value: z.number().nullable().default(null),
  deadline: z.string().datetime().nullable().default(null),
  add_constraints: z.array(z.string()).default([]),
  add_resources: z.array(z.string()).default([]),
});
export type GoalChange = z.infer<typeof GoalChangeSchema>;
