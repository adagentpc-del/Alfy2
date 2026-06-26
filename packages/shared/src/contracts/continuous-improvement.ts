import { z } from "zod";

/**
 * Continuous Improvement Engine contracts. Every workflow is evaluated continuously on speed, quality,
 * cost, conversion, reliability, and user effort, and the engine recommends one of: simplify, automate,
 * remove, merge, split, or delegate — each recommendation carrying an expected impact and a confidence.
 * See docs/adr/ADR-0059-continuous-improvement.md. Mirrored in workers (Pydantic).
 */

/** The six improvement actions. */
export const ImprovementActionSchema = z.enum([
  "simplify",
  "automate",
  "remove",
  "merge",
  "split",
  "delegate",
]);
export type ImprovementAction = z.infer<typeof ImprovementActionSchema>;

/** The six measured dimensions, each 0..1 (higher is better). */
export const ImprovementMetricsSchema = z.object({
  speed: z.number().min(0).max(1).default(0.5),
  quality: z.number().min(0).max(1).default(0.5),
  cost_efficiency: z.number().min(0).max(1).default(0.5),
  conversion: z.number().min(0).max(1).default(0.5),
  reliability: z.number().min(0).max(1).default(0.5),
  /** Higher = LESS user effort (frictionless). */
  user_ease: z.number().min(0).max(1).default(0.5),
});
export type ImprovementMetrics = z.infer<typeof ImprovementMetricsSchema>;

export const EvaluateWorkflowInputSchema = z.object({
  workflow_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  metrics: ImprovementMetricsSchema,
  /** Manual steps that could be automated. */
  manual_steps: z.number().int().nonnegative().default(0),
  /** Whether it overlaps another workflow (merge candidate). */
  overlaps_another: z.boolean().default(false),
  /** Whether it bundles unrelated jobs (split candidate). */
  does_multiple_jobs: z.boolean().default(false),
  /** Whether it's low value (remove candidate). */
  low_value: z.boolean().default(false),
});
export type EvaluateWorkflowInput = z.infer<typeof EvaluateWorkflowInputSchema>;

/** One recommendation with its expected impact and confidence. */
export const ImprovementRecommendationSchema = z.object({
  action: ImprovementActionSchema,
  rationale: z.string().min(1),
  /** Expected improvement 0..1. */
  expected_impact: z.number().min(0).max(1),
  /** Confidence in the recommendation 0..1. */
  confidence: z.number().min(0).max(1),
});
export type ImprovementRecommendation = z.infer<typeof ImprovementRecommendationSchema>;

/** The evaluation of one workflow. */
export const WorkflowEvaluationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  workflow_name: z.string().min(1),
  metrics: ImprovementMetricsSchema,
  /** Mean of the six dimensions. */
  health_score: z.number().min(0).max(1),
  recommendations: z.array(ImprovementRecommendationSchema).default([]),
  created_at: z.string().datetime(),
});
export type WorkflowEvaluation = z.infer<typeof WorkflowEvaluationSchema>;
