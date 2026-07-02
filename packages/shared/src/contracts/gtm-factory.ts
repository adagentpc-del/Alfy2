import { z } from "zod";

/**
 * GTM Factory contracts. One offer in, one complete approval-gated launch plan out: ICP summary,
 * positioning, per-channel plans, asset checklist, phased launch calendar, execution packets (each
 * carrying its approval action class so nothing external moves without a token), and a measurement
 * plan. The factory composes Campaign Intelligence / Sales Asset Generator / Content Factory — it
 * plans the launch, it does not re-implement them. See docs/GTM_FACTORY_SPEC.md. Mirrored.
 */

export const GtmChannelSchema = z.enum(["email", "social", "podcast", "partners", "paid", "community"]);
export type GtmChannel = z.infer<typeof GtmChannelSchema>;

/** Approval action classes a launch step can carry (subset of migration 0239's classes). */
export const GtmApprovalClassSchema = z.enum([
  "send_message", "publish_public", "change_pricing", "internal_action",
]);
export type GtmApprovalClass = z.infer<typeof GtmApprovalClassSchema>;

export const GtmLaunchPhaseSchema = z.enum(["warm_up", "launch", "follow_through"]);
export type GtmLaunchPhase = z.infer<typeof GtmLaunchPhaseSchema>;

export const GtmOfferSchema = z.object({
  name: z.string().min(1),
  promise: z.string().min(1),
  price_point: z.string().default(""),
  /** Portfolio roster key, e.g. "move_mi" (docs/PORTFOLIO_COMPANY_OS.md). */
  business_key: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
});
export type GtmOffer = z.infer<typeof GtmOfferSchema>;

export const PlanLaunchInputSchema = z.object({
  offer: GtmOfferSchema,
  /** Known facts about the ideal customer; the plan falls back to structured prompts when empty. */
  icp_hints: z.array(z.string()).default([]),
  channels: z.array(GtmChannelSchema).min(1),
  launch_window_days: z.number().int().min(3).max(365).default(30),
  revenue_target: z.string().default(""),
});
export type PlanLaunchInput = z.infer<typeof PlanLaunchInputSchema>;

export const GtmPositioningSchema = z.object({
  promise: z.string().min(1),
  differentiation: z.string().min(1),
  proof: z.string().min(1),
  primary_objection: z.string().min(1),
  objection_answer: z.string().min(1),
});
export type GtmPositioning = z.infer<typeof GtmPositioningSchema>;

export const GtmChannelPlanSchema = z.object({
  channel: GtmChannelSchema,
  motion: z.string().min(1),
  cadence: z.string().min(1),
  /** Agent title from docs/AGENT_TITLE_REGISTRY.md that owns this channel. */
  owner_title: z.string().min(1),
  required_assets: z.array(z.string()).min(1),
});
export type GtmChannelPlan = z.infer<typeof GtmChannelPlanSchema>;

export const GtmAssetItemSchema = z.object({
  asset: z.string().min(1),
  /** False until the Asset Library reports it; gaps route to the producing engine. */
  exists: z.boolean().default(false),
  produced_by: z.string().min(1),
});
export type GtmAssetItem = z.infer<typeof GtmAssetItemSchema>;

export const GtmCalendarEntrySchema = z.object({
  day_offset: z.number().int().nonnegative(),
  phase: GtmLaunchPhaseSchema,
  channel: GtmChannelSchema,
  action: z.string().min(1),
  requires_approval: z.boolean(),
  approval_class: GtmApprovalClassSchema,
});
export type GtmCalendarEntry = z.infer<typeof GtmCalendarEntrySchema>;

export const GtmExecutionPacketSchema = z.object({
  id: z.string().uuid(),
  channel: GtmChannelSchema,
  objective: z.string().min(1),
  owner_title: z.string().min(1),
  steps: z.array(z.string()).min(1),
  requires_approval: z.boolean(),
  approval_class: GtmApprovalClassSchema,
  status: z.enum(["draft", "delegated", "in_progress", "reported"]).default("draft"),
});
export type GtmExecutionPacket = z.infer<typeof GtmExecutionPacketSchema>;

export const GtmMeasurementSchema = z.object({
  channel: GtmChannelSchema,
  kpis: z.array(z.string()).min(1),
});
export type GtmMeasurement = z.infer<typeof GtmMeasurementSchema>;

/** A complete launch plan — safe to hand to agents as-is: every external step carries its gate. */
export const GtmLaunchPlanSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  offer: GtmOfferSchema,
  icp_summary: z.array(z.string()).min(1),
  positioning: GtmPositioningSchema,
  channel_plans: z.array(GtmChannelPlanSchema).min(1),
  asset_checklist: z.array(GtmAssetItemSchema).min(1),
  calendar: z.array(GtmCalendarEntrySchema).min(1),
  execution_packets: z.array(GtmExecutionPacketSchema).min(1),
  measurement: z.array(GtmMeasurementSchema).min(1),
  revenue_target: z.string().default(""),
  launch_window_days: z.number().int().positive(),
  created_at: z.string().datetime(),
});
export type GtmLaunchPlan = z.infer<typeof GtmLaunchPlanSchema>;
