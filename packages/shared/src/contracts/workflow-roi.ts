import { z } from "zod";

/**
 * Workflow ROI Tracking contracts. For every automation Alfy² tracks the value it creates (time saved,
 * revenue generated, cost/error/risk reduced, conversion lift) against what it costs (operating cost,
 * model/tool cost, human time), computes an ROI, ranks workflows, and recommends scale / pause /
 * improve / delete. See docs/adr/ADR-0023-workflow-roi-tracking.md. Mirrored in workers (Pydantic).
 */

/** The metrics tracked for an automation over a period. */
export const WorkflowMetricsSchema = z.object({
  time_saved_hours: z.number().nonnegative().default(0),
  revenue_generated_usd: z.number().nonnegative().default(0),
  cost_reduced_usd: z.number().nonnegative().default(0),
  errors_reduced: z.number().int().nonnegative().default(0),
  /** Risk reduction, 0..1. */
  risk_reduced: z.number().min(0).max(1).default(0),
  /** Conversion improvement, 0..1. */
  conversion_improvement: z.number().min(0).max(1).default(0),
  operating_cost_usd: z.number().nonnegative().default(0),
  model_tool_cost_usd: z.number().nonnegative().default(0),
  human_time_required_hours: z.number().nonnegative().default(0),
});
export type WorkflowMetrics = z.infer<typeof WorkflowMetricsSchema>;

/** The recommended action for a workflow. */
export const RoiRecommendationSchema = z.enum(["scale", "pause", "improve", "delete"]);
export type RoiRecommendation = z.infer<typeof RoiRecommendationSchema>;

/** A computed ROI record for one workflow. */
export const WorkflowRoiRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  workflow_name: z.string().min(1),
  metrics: WorkflowMetricsSchema,
  /** Total value created (revenue + cost reduced + valued time saved). */
  value_usd: z.number(),
  /** Total cost (operating + model/tool + valued human time). */
  total_cost_usd: z.number().nonnegative(),
  /** value − cost. */
  net_value_usd: z.number(),
  /** net_value / total_cost, or null when total cost is 0. */
  roi_score: z.number().nullable().default(null),
  recommendation: RoiRecommendationSchema,
  rationale: z.string().min(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type WorkflowRoiRecord = z.infer<typeof WorkflowRoiRecordSchema>;

/** Input to track/compute a workflow's ROI. */
export const TrackWorkflowInputSchema = z.object({
  workflow_name: z.string().min(1),
  metrics: WorkflowMetricsSchema,
  /** Dollar value of one hour of human time, used to value time saved and human time required. */
  human_hourly_rate: z.number().positive().default(75),
});
export type TrackWorkflowInput = z.infer<typeof TrackWorkflowInputSchema>;
