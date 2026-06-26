import { z } from "zod";
import { PriorityLevelSchema } from "./decision.js";
import { RoleSchema } from "./tenancy.js";

/**
 * Executive Control Tower contracts — the operator dashboard. It assembles one snapshot showing cash
 * position, revenue pipeline, goals, active campaigns, blocked deals, risks, agent performance,
 * approvals needed, the top three priorities, business health by company, opportunities surfaced,
 * workflows running, and the monthly/quarterly review queue. Section types are `Tower`-prefixed to
 * avoid collisions. See docs/adr/ADR-0027-executive-control-tower.md. Mirrored in workers (Pydantic).
 */

export const TowerSeveritySchema = z.enum(["low", "medium", "high"]);
export type TowerSeverity = z.infer<typeof TowerSeveritySchema>;

export const ReviewCadenceSchema = z.enum(["monthly", "quarterly"]);
export type ReviewCadence = z.infer<typeof ReviewCadenceSchema>;

export const TowerCashSchema = z.object({
  cash_on_hand_usd: z.number(),
  monthly_burn_usd: z.number().nonnegative(),
  monthly_inflow_usd: z.number().nonnegative(),
  /** Computed: months of runway, or null if cash-flow positive. */
  runway_months: z.number().nullable().default(null),
});
export type TowerCash = z.infer<typeof TowerCashSchema>;

export const TowerPipelineSchema = z.object({
  open_deals: z.number().int().nonnegative(),
  weighted_value_usd: z.number().nonnegative(),
  closing_30d_usd: z.number().nonnegative(),
});
export type TowerPipeline = z.infer<typeof TowerPipelineSchema>;

export const TowerGoalSchema = z.object({
  name: z.string().min(1),
  status: z.string().min(1),
  progress: z.number().min(0).max(1).default(0),
  priority_level: PriorityLevelSchema,
});
export type TowerGoal = z.infer<typeof TowerGoalSchema>;

export const TowerCampaignSchema = z.object({
  name: z.string().min(1),
  status: z.string().min(1),
  note: z.string().default(""),
});
export type TowerCampaign = z.infer<typeof TowerCampaignSchema>;

export const TowerBlockedDealSchema = z.object({
  name: z.string().min(1),
  reason: z.string().min(1),
  value_usd: z.number().nonnegative().default(0),
});
export type TowerBlockedDeal = z.infer<typeof TowerBlockedDealSchema>;

export const TowerRiskSchema = z.object({
  description: z.string().min(1),
  severity: TowerSeveritySchema,
});
export type TowerRisk = z.infer<typeof TowerRiskSchema>;

export const TowerAgentPerfSchema = z.object({
  agent_name: z.string().min(1),
  success_rate: z.number().min(0).max(1),
  roi: z.number().nullable().default(null),
  actions: z.number().int().nonnegative(),
});
export type TowerAgentPerf = z.infer<typeof TowerAgentPerfSchema>;

export const TowerApprovalSchema = z.object({
  action: z.string().min(1),
  requested_by: z.string().min(1),
  required_role: RoleSchema,
});
export type TowerApproval = z.infer<typeof TowerApprovalSchema>;

export const TowerBusinessHealthSchema = z.object({
  business_name: z.string().min(1),
  score: z.number().min(0).max(1),
  signal: z.string().default(""),
});
export type TowerBusinessHealth = z.infer<typeof TowerBusinessHealthSchema>;

export const TowerOpportunitySchema = z.object({
  title: z.string().min(1),
  composite: z.number().min(0).max(1),
});
export type TowerOpportunity = z.infer<typeof TowerOpportunitySchema>;

export const TowerWorkflowSchema = z.object({
  name: z.string().min(1),
  status: z.string().min(1),
});
export type TowerWorkflow = z.infer<typeof TowerWorkflowSchema>;

export const TowerReviewItemSchema = z.object({
  item: z.string().min(1),
  cadence: ReviewCadenceSchema,
  due: z.string().datetime().nullable().default(null),
});
export type TowerReviewItem = z.infer<typeof TowerReviewItemSchema>;

/** The assembled dashboard snapshot. */
export const ControlTowerSnapshotSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  generated_at: z.string().datetime(),
  cash_position: TowerCashSchema,
  revenue_pipeline: TowerPipelineSchema,
  goals: z.array(TowerGoalSchema).default([]),
  active_campaigns: z.array(TowerCampaignSchema).default([]),
  blocked_deals: z.array(TowerBlockedDealSchema).default([]),
  risks: z.array(TowerRiskSchema).default([]),
  agent_performance: z.array(TowerAgentPerfSchema).default([]),
  approvals_needed: z.array(TowerApprovalSchema).default([]),
  /** The three things that most need attention now. */
  top_priorities: z.array(z.string()).max(3).default([]),
  business_health: z.array(TowerBusinessHealthSchema).default([]),
  opportunities: z.array(TowerOpportunitySchema).default([]),
  workflows_running: z.array(TowerWorkflowSchema).default([]),
  review_queue: z.array(TowerReviewItemSchema).default([]),
});
export type ControlTowerSnapshot = z.infer<typeof ControlTowerSnapshotSchema>;

/** The inputs the Control Tower assembles into a snapshot (runway + top priorities are computed). */
export const ControlTowerInputSchema = z.object({
  cash: z.object({
    cash_on_hand_usd: z.number(),
    monthly_burn_usd: z.number().nonnegative(),
    monthly_inflow_usd: z.number().nonnegative(),
  }),
  pipeline: TowerPipelineSchema,
  goals: z.array(TowerGoalSchema).default([]),
  campaigns: z.array(TowerCampaignSchema).default([]),
  blocked_deals: z.array(TowerBlockedDealSchema).default([]),
  risks: z.array(TowerRiskSchema).default([]),
  agent_performance: z.array(TowerAgentPerfSchema).default([]),
  approvals_needed: z.array(TowerApprovalSchema).default([]),
  business_health: z.array(TowerBusinessHealthSchema).default([]),
  opportunities: z.array(TowerOpportunitySchema).default([]),
  workflows_running: z.array(TowerWorkflowSchema).default([]),
  review_queue: z.array(TowerReviewItemSchema).default([]),
});
export type ControlTowerInput = z.infer<typeof ControlTowerInputSchema>;
