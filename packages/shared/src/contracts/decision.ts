import { z } from "zod";

/**
 * Decision Engine contracts (Alfy2's triage cortex). The engine classifies any input and scores it
 * across the dimensions an operator needs to decide what to do, returning a structured Decision.
 * Deterministic by default (see docs/adr/ADR-0003-decision-engine.md). Mirrored in workers (Pydantic)
 * and validated against shared fixtures.
 */

/** The category an input belongs to. Inputs may carry several (multi-label). */
export const DecisionCategorySchema = z.enum([
  "business",
  "personal",
  "health",
  "finance",
  "relationship",
  "idea",
  "learning",
  "risk",
  "opportunity",
]);
export type DecisionCategory = z.infer<typeof DecisionCategorySchema>;

export const CategoryScoreSchema = z.object({
  category: DecisionCategorySchema,
  confidence: z.number().min(0).max(1),
});
export type CategoryScore = z.infer<typeof CategoryScoreSchema>;

export const EffortBucketSchema = z.enum(["trivial", "small", "medium", "large", "xlarge"]);
export type EffortBucket = z.infer<typeof EffortBucketSchema>;

export const PriorityLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export type PriorityLevel = z.infer<typeof PriorityLevelSchema>;

/** Raw input to classify. `context` carries optional structured hints (amount_usd, deadline, etc.). */
export const DecisionInputSchema = z.object({
  text: z.string().min(1),
  source: z.string().min(1).default("operator"),
  context: z.record(z.unknown()).default({}),
});
export type DecisionInput = z.infer<typeof DecisionInputSchema>;

/** The structured decision the engine returns. */
export const DecisionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  input_text: z.string().min(1),
  source: z.string().min(1),

  // Classification (multi-label, plus the dominant one).
  categories: z.array(CategoryScoreSchema).min(1),
  primary_category: DecisionCategorySchema,

  // Scored dimensions, all 0..1.
  urgency: z.number().min(0).max(1),
  importance: z.number().min(0).max(1),
  difficulty: z.number().min(0).max(1),
  revenue_impact: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),

  // Effort.
  estimated_effort_minutes: z.number().int().nonnegative(),
  effort_bucket: EffortBucketSchema,

  // Composite priority.
  priority_score: z.number().min(0).max(1),
  priority_level: PriorityLevelSchema,

  // Routing & action.
  required_approvals: z.array(z.string()).default([]),
  recommended_agents: z.array(z.string()).default([]),
  recommended_deadline: z.string().datetime().nullable().default(null),
  automation_opportunities: z.array(z.string()).default([]),

  // Explainability — always present.
  reasons: z.array(z.string()).default([]),
  explanation: z.string().min(1),

  created_at: z.string().datetime(),
});
export type Decision = z.infer<typeof DecisionSchema>;
