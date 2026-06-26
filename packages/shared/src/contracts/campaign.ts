import { z } from "zod";
import { LevelSchema } from "./goal.js";

/**
 * Campaign Intelligence contracts. Runs marketing campaigns across email, social, landing pages,
 * funnels, outreach, and lead nurturing. Every campaign ships an A/B variant pair with success
 * metrics, produces automatic reports with improvement recommendations, and optimizes monthly. After
 * approval a campaign runs on autopilot until the goal is reached, performance drops, risk increases,
 * the approval expires, or Alyssa pauses it. See docs/adr/ADR-0018-campaign-intelligence.md.
 * Mirrored in workers (Pydantic).
 */

/** The six supported campaign types. */
export const CampaignTypeSchema = z.enum([
  "email",
  "social",
  "landing_page",
  "funnel",
  "outreach",
  "lead_nurturing",
]);
export type CampaignType = z.infer<typeof CampaignTypeSchema>;

/** Lifecycle. `stopped` is an automatic halt (see StopReason); `completed` is goal-reached success. */
export const CampaignStatusSchema = z.enum(["draft", "active", "paused", "completed", "stopped"]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

/** Why a campaign left autopilot. */
export const StopReasonSchema = z.enum([
  "goal_reached",
  "performance_drop",
  "risk_increase",
  "approval_expired",
  "paused",
  "manual",
]);
export type StopReason = z.infer<typeof StopReasonSchema>;

export const VariantKeySchema = z.enum(["A", "B"]);
export type VariantKey = z.infer<typeof VariantKeySchema>;

export const MetricDirectionSchema = z.enum(["higher_better", "lower_better"]);
export type MetricDirection = z.infer<typeof MetricDirectionSchema>;

/** One A/B variant. */
export const VariantSchema = z.object({
  key: VariantKeySchema,
  name: z.string().min(1),
  hypothesis: z.string().min(1),
  content: z.string().default(""),
  /** Share of traffic routed to this variant (0..1). */
  traffic_weight: z.number().min(0).max(1).default(0.5),
});
export type Variant = z.infer<typeof VariantSchema>;

/** A success metric the campaign is judged against. */
export const CampaignSuccessMetricSchema = z.object({
  name: z.string().min(1),
  target: z.number(),
  unit: z.string().default(""),
  direction: MetricDirectionSchema.default("higher_better"),
  primary: z.boolean().default(false),
});
export type CampaignSuccessMetric = z.infer<typeof CampaignSuccessMetricSchema>;

/** Observed performance for one variant. */
export const VariantResultSchema = z.object({
  variant_key: VariantKeySchema,
  impressions: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  conversion_rate: z.number().min(0).max(1),
  cost_usd: z.number().nonnegative().default(0),
  revenue_usd: z.number().nonnegative().default(0),
});
export type VariantResult = z.infer<typeof VariantResultSchema>;

/** An improvement recommendation. */
export const CampaignRecommendationSchema = z.object({
  description: z.string().min(1),
  rationale: z.string().min(1),
  expected_impact: LevelSchema.default("medium"),
});
export type CampaignRecommendation = z.infer<typeof CampaignRecommendationSchema>;

/** A generated report: per-variant results, the winner, the lift, a summary, and recommendations. */
export const CampaignReportSchema = z.object({
  generated_at: z.string().datetime(),
  period_label: z.string().default(""),
  variant_results: z.array(VariantResultSchema).default([]),
  /** The winning variant, or null when there is no significant difference. */
  winner: VariantKeySchema.nullable().default(null),
  /** Relative improvement of the winner over the other variant (0..1+), null if no winner. */
  lift: z.number().nullable().default(null),
  summary: z.string().min(1),
  recommendations: z.array(CampaignRecommendationSchema).default([]),
});
export type CampaignReport = z.infer<typeof CampaignReportSchema>;

/** The thresholds that take a campaign off autopilot. */
export const StopConditionsSchema = z.object({
  /** Performance floor: best-variant conversion rate at/below this stops the campaign. */
  min_conversion_rate: z.number().min(0).max(1).default(0),
  /** Risk ceiling: risk at/above this level stops the campaign. */
  max_risk: LevelSchema.default("high"),
  /** When set, the campaign completes when this goal is reached. */
  goal_id: z.string().uuid().nullable().default(null),
  /** When set, the campaign stops when this standing approval is no longer active. */
  approval_id: z.string().uuid().nullable().default(null),
});
export type StopConditions = z.infer<typeof StopConditionsSchema>;

export const OptimizationCadenceSchema = z.enum(["monthly", "none"]);
export type OptimizationCadence = z.infer<typeof OptimizationCadenceSchema>;

/** A campaign. */
export const CampaignSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  type: CampaignTypeSchema,
  name: z.string().min(1),
  objective: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
  goal_id: z.string().uuid().nullable().default(null),
  approval_id: z.string().uuid().nullable().default(null),
  status: CampaignStatusSchema.default("draft"),
  stop_reason: StopReasonSchema.nullable().default(null),
  /** Exactly the A/B pair. */
  variants: z.array(VariantSchema).min(2),
  success_metrics: z.array(CampaignSuccessMetricSchema).min(1),
  stop_conditions: StopConditionsSchema,
  optimization_cadence: OptimizationCadenceSchema.default("monthly"),
  latest_report: CampaignReportSchema.nullable().default(null),
  version: z.number().int().positive().default(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  last_optimized_at: z.string().datetime().nullable().default(null),
});
export type Campaign = z.infer<typeof CampaignSchema>;

/** A variant draft supplied at creation (optional; the engine fills A/B defaults otherwise). */
export const VariantDraftSchema = z.object({
  name: z.string().min(1),
  hypothesis: z.string().min(1),
  content: z.string().default(""),
});
export type VariantDraft = z.infer<typeof VariantDraftSchema>;

/** Input to create a campaign. */
export const CreateCampaignInputSchema = z.object({
  type: CampaignTypeSchema,
  name: z.string().min(1),
  objective: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
  goal_id: z.string().uuid().nullable().default(null),
  approval_id: z.string().uuid().nullable().default(null),
  variant_a: VariantDraftSchema.nullable().default(null),
  variant_b: VariantDraftSchema.nullable().default(null),
  success_metrics: z.array(CampaignSuccessMetricSchema).default([]),
  /** Performance floor for autopilot (defaults to 0 = never stops on performance). */
  min_conversion_rate: z.number().min(0).max(1).default(0),
  max_risk: LevelSchema.default("high"),
});
export type CreateCampaignInput = z.infer<typeof CreateCampaignInputSchema>;

/** Raw observed metrics fed in for reporting / assessment / optimization. */
export const VariantObservationSchema = z.object({
  variant_key: VariantKeySchema,
  impressions: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  cost_usd: z.number().nonnegative().default(0),
  revenue_usd: z.number().nonnegative().default(0),
});
export type VariantObservation = z.infer<typeof VariantObservationSchema>;

export const CampaignMetricsInputSchema = z.object({
  period_label: z.string().default(""),
  results: z.array(VariantObservationSchema).min(1),
});
export type CampaignMetricsInput = z.infer<typeof CampaignMetricsInputSchema>;

/** Signals the autopilot uses to decide whether a campaign keeps running. */
export const AssessSignalsSchema = z.object({
  goal_reached: z.boolean().default(false),
  risk_level: LevelSchema.default("low"),
  approval_active: z.boolean().default(true),
  metrics: CampaignMetricsInputSchema.nullable().default(null),
});
export type AssessSignals = z.infer<typeof AssessSignalsSchema>;
