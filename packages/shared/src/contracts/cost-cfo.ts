import { z } from "zod";

/**
 * Cost & Token CFO contracts. Tracks model, API, automation, tool-subscription, compute, and storage
 * costs against human time saved and revenue created, and for every workflow computes cost per task /
 * lead / booked call / sale, ROI, and break-even — then recommends a cheaper model, a better workflow,
 * pausing an expensive agent, batch processing, local-model use, or upgrading when ROI supports it. See
 * docs/adr/ADR-0047-cost-token-cfo.md. Mirrored in workers (Pydantic).
 */

/** The six cost categories. */
export const CostCategorySchema = z.enum([
  "model",
  "api",
  "automation",
  "tool_subscription",
  "compute",
  "storage",
]);
export type CostCategory = z.infer<typeof CostCategorySchema>;

/** The recommendations the CFO can make. */
export const CfoRecommendationSchema = z.enum([
  "cheaper_model",
  "better_workflow",
  "pause_expensive_agent",
  "batch_processing",
  "local_model",
  "upgrade_when_roi_supports",
]);
export type CfoRecommendation = z.infer<typeof CfoRecommendationSchema>;

/** Per-category spend for a workflow. */
export const CostBreakdownSchema = z.object({
  model: z.number().nonnegative().default(0),
  api: z.number().nonnegative().default(0),
  automation: z.number().nonnegative().default(0),
  tool_subscription: z.number().nonnegative().default(0),
  compute: z.number().nonnegative().default(0),
  storage: z.number().nonnegative().default(0),
});
export type CostBreakdown = z.infer<typeof CostBreakdownSchema>;

/** Input: a workflow's costs and what it produced. */
export const WorkflowCostInputSchema = z.object({
  workflow_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  costs: CostBreakdownSchema,
  human_time_saved_hours: z.number().nonnegative().default(0),
  human_hourly_rate_usd: z.number().nonnegative().default(75),
  revenue_created_usd: z.number().nonnegative().default(0),
  tasks: z.number().int().nonnegative().default(0),
  leads: z.number().int().nonnegative().default(0),
  booked_calls: z.number().int().nonnegative().default(0),
  sales: z.number().int().nonnegative().default(0),
});
export type WorkflowCostInput = z.infer<typeof WorkflowCostInputSchema>;

/** The CFO report for a workflow. Per-unit costs are null when the denominator is zero. */
export const WorkflowCostReportSchema = z.object({
  workflow_name: z.string().min(1),
  total_cost_usd: z.number().nonnegative(),
  /** revenue + human time saved valued at the hourly rate. */
  value_usd: z.number().nonnegative(),
  cost_per_task: z.number().nonnegative().nullable().default(null),
  cost_per_lead: z.number().nonnegative().nullable().default(null),
  cost_per_booked_call: z.number().nonnegative().nullable().default(null),
  cost_per_sale: z.number().nonnegative().nullable().default(null),
  /** (value - cost) / cost; null when cost is zero. */
  roi: z.number().nullable().default(null),
  /** Revenue needed to cover total cost (= total cost). */
  break_even_revenue_usd: z.number().nonnegative(),
  /** The dominant cost category. */
  largest_cost_category: CostCategorySchema.nullable().default(null),
  recommendations: z.array(CfoRecommendationSchema).default([]),
  rationale: z.string().default(""),
  generated_at: z.string().datetime(),
});
export type WorkflowCostReport = z.infer<typeof WorkflowCostReportSchema>;
