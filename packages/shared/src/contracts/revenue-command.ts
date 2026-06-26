import { z } from "zod";

/**
 * CRO / Revenue Command — the Chief Revenue Officer brain for Alyssa's whole portfolio.
 *
 * This is an ORCHESTRATION / decision layer. It does NOT re-implement the deal desk or conversion
 * engines that already exist; it sits above them, detecting portfolio-wide revenue opportunities,
 * scoring them, building a daily command center, owning per-business revenue missions, and reviewing
 * offers/pricing before they go out.
 *
 * CORE RULE encoded here and in the engine: the CRO's default question is
 *   "What action is most likely to create or protect revenue FASTEST without creating chaos,
 *    scope creep, legal risk, or founder overload?"
 * It optimizes for cash flow, margin, leverage, repeatability, clean execution, and founder
 * protection. High-risk execution (legal / financial / clinical / partnership) requires approval.
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 *
 * NOTE: every exported schema + type is uniquely prefixed (Revenue / Cro / MoneyAction / Funnel /
 * OfferReview / BusinessRevenueMission) to avoid barrel export-name collisions with other contracts.
 */

// ---------------------------------------------------------------------------
// Enums (uniquely named to avoid barrel collisions)
// ---------------------------------------------------------------------------

/** Kind of revenue opportunity the CRO can detect across the portfolio. */
export const RevenueOpportunityKindSchema = z.enum([
  "fast_cash",
  "long_term",
  "stalled_deal",
  "unpaid_labor",
  "underpriced_offer",
  "weak_funnel",
  "missing_followup",
  "conversion_blocker",
  "partnership",
  "referral",
  "upsell",
]);
export type RevenueOpportunityKind = z.infer<typeof RevenueOpportunityKindSchema>;

/** Effort to capture an opportunity. */
export const RevenueEffortSchema = z.enum(["low", "medium", "high"]);
export type RevenueEffort = z.infer<typeof RevenueEffortSchema>;

/** Risk of pursuing an opportunity / money action. */
export const RevenueRiskSchema = z.enum(["low", "medium", "high", "critical"]);
export type RevenueRisk = z.infer<typeof RevenueRiskSchema>;

/** Strategic value of an opportunity. */
export const RevenueStrategicValueSchema = z.enum(["low", "medium", "high"]);
export type RevenueStrategicValue = z.infer<typeof RevenueStrategicValueSchema>;

/** How repeatable the revenue is. */
export const RevenueRepeatabilitySchema = z.enum(["one_time", "repeatable", "recurring"]);
export type RevenueRepeatability = z.infer<typeof RevenueRepeatabilitySchema>;

/** Margin profile of an opportunity. */
export const RevenueMarginSchema = z.enum(["low", "medium", "high"]);
export type RevenueMargin = z.infer<typeof RevenueMarginSchema>;

/** Recommended disposition of an opportunity after scoring. */
export const RevenueOpportunityStatusSchema = z.enum([
  "pursue_now",
  "nurture",
  "automate",
  "delegate",
  "reprice",
  "pause",
  "kill",
]);
export type RevenueOpportunityStatus = z.infer<typeof RevenueOpportunityStatusSchema>;

/** Lifecycle of a money action in the command center. */
export const MoneyActionStatusSchema = z.enum(["todo", "in_progress", "blocked", "done"]);
export type MoneyActionStatus = z.infer<typeof MoneyActionStatusSchema>;

/** Funnel stage owned per business. */
export const FunnelStageSchema = z.enum([
  "lead_capture",
  "nurture",
  "activation",
  "conversion",
  "upsell",
  "referral",
  "retention",
  "reactivation",
]);
export type FunnelStage = z.infer<typeof FunnelStageSchema>;

/** Health of a funnel stage. */
export const FunnelHealthSchema = z.enum(["healthy", "leaking", "broken"]);
export type FunnelHealth = z.infer<typeof FunnelHealthSchema>;

/** The six businesses in Alyssa's portfolio. */
export const BusinessRevenueKeySchema = z.enum([
  "move_mi",
  "divini_procure",
  "divini_partners",
  "stratalogic",
  "founder_os",
  "black_flag",
]);
export type BusinessRevenueKey = z.infer<typeof BusinessRevenueKeySchema>;

/** Status of a per-business revenue mission. */
export const BusinessRevenueMissionStatusSchema = z.enum(["active", "paused", "done"]);
export type BusinessRevenueMissionStatus = z.infer<typeof BusinessRevenueMissionStatusSchema>;

/** Verdict of an offer/pricing review. */
export const OfferReviewVerdictSchema = z.enum(["send", "revise", "hold"]);
export type OfferReviewVerdict = z.infer<typeof OfferReviewVerdictSchema>;

// ---------------------------------------------------------------------------
// RevenueOpportunity (mutable) — the unit the CRO scores + dispositions
// ---------------------------------------------------------------------------

export const RevenueOpportunitySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business: z.string().min(1),
  kind: RevenueOpportunityKindSchema,
  title: z.string().min(1),
  description: z.string().default(""),
  expected_revenue_usd: z.number().nonnegative().default(0),
  /** Days until cash lands (lower = faster = better). */
  speed_to_cash_days: z.number().nonnegative().default(0),
  effort: RevenueEffortSchema.default("medium"),
  risk: RevenueRiskSchema.default("low"),
  confidence: z.number().min(0).max(1).default(0.5),
  /** Founder hours required (lower = better; high = delegate). */
  founder_time_hours: z.number().nonnegative().default(0),
  strategic_value: RevenueStrategicValueSchema.default("medium"),
  repeatability: RevenueRepeatabilitySchema.default("one_time"),
  margin: RevenueMarginSchema.default("medium"),
  probability_of_close: z.number().min(0).max(1).default(0.5),
  /** Computed 0-100 score (see engine scoring formula). */
  score: z.number().min(0).max(100).default(0),
  /** Recommended disposition, derived from score + risk + kind. */
  status: RevenueOpportunityStatusSchema.default("nurture"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type RevenueOpportunity = z.infer<typeof RevenueOpportunitySchema>;

/** Input to addOpportunity — score + status are computed, created/updated are stamped. */
export const RevenueOpportunityInputSchema = z.object({
  business: z.string().min(1),
  kind: RevenueOpportunityKindSchema,
  title: z.string().min(1),
  description: z.string().default(""),
  expected_revenue_usd: z.number().nonnegative().default(0),
  speed_to_cash_days: z.number().nonnegative().default(0),
  effort: RevenueEffortSchema.default("medium"),
  risk: RevenueRiskSchema.default("low"),
  confidence: z.number().min(0).max(1).default(0.5),
  founder_time_hours: z.number().nonnegative().default(0),
  strategic_value: RevenueStrategicValueSchema.default("medium"),
  repeatability: RevenueRepeatabilitySchema.default("one_time"),
  margin: RevenueMarginSchema.default("medium"),
  probability_of_close: z.number().min(0).max(1).default(0.5),
});
export type RevenueOpportunityInput = z.input<typeof RevenueOpportunityInputSchema>;

/** Optional filter for listOpportunities. */
export const RevenueOpportunityFilterSchema = z.object({
  business: z.string().min(1).optional(),
  kind: RevenueOpportunityKindSchema.optional(),
  status: RevenueOpportunityStatusSchema.optional(),
});
export type RevenueOpportunityFilter = z.input<typeof RevenueOpportunityFilterSchema>;

// ---------------------------------------------------------------------------
// MoneyAction (mutable) — a top money action in the command center
// ---------------------------------------------------------------------------

export const MoneyActionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  opportunity_id: z.string().uuid().nullable().default(null),
  business: z.string().min(1),
  action: z.string().min(1),
  rationale: z.string().default(""),
  expected_revenue_usd: z.number().nonnegative().default(0),
  due: z.string().nullable().default(null),
  assigned_agent: z.string().nullable().default(null),
  approval_required: z.boolean().default(false),
  status: MoneyActionStatusSchema.default("todo"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type MoneyAction = z.infer<typeof MoneyActionSchema>;

/** Input to addMoneyAction. */
export const MoneyActionInputSchema = z.object({
  opportunity_id: z.string().uuid().nullable().default(null),
  business: z.string().min(1),
  action: z.string().min(1),
  rationale: z.string().default(""),
  expected_revenue_usd: z.number().nonnegative().default(0),
  due: z.string().nullable().default(null),
  assigned_agent: z.string().nullable().default(null),
  approval_required: z.boolean().default(false),
});
export type MoneyActionInput = z.input<typeof MoneyActionInputSchema>;

// ---------------------------------------------------------------------------
// FunnelStageRecord (append-only) — per-business funnel ownership snapshot
// ---------------------------------------------------------------------------

export const FunnelStageRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business: z.string().min(1),
  stage: FunnelStageSchema,
  health: FunnelHealthSchema.default("healthy"),
  notes: z.string().default(""),
  recommended_action: z.string().default(""),
  created_at: z.string().datetime(),
});
export type FunnelStageRecord = z.infer<typeof FunnelStageRecordSchema>;

/** Input to recordFunnelStage. */
export const FunnelStageRecordInputSchema = z.object({
  business: z.string().min(1),
  stage: FunnelStageSchema,
  health: FunnelHealthSchema.default("healthy"),
  notes: z.string().default(""),
  recommended_action: z.string().default(""),
});
export type FunnelStageRecordInput = z.input<typeof FunnelStageRecordInputSchema>;

// ---------------------------------------------------------------------------
// RevenueCommandCenter (append-only daily snapshot)
// ---------------------------------------------------------------------------

export const RevenueCommandCenterSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** Snapshot date (e.g. "2026-06-26"). */
  date: z.string().min(1),
  /** Money action ids derived for the day (top 5). */
  top_money_actions: z.array(z.string()).default([]),
  hottest_leads: z.array(z.string()).default([]),
  proposals_due: z.array(z.string()).default([]),
  followups_due: z.array(z.string()).default([]),
  payment_links_needed: z.array(z.string()).default([]),
  stalled_deals: z.array(z.string()).default([]),
  top_platform_users: z.array(z.string()).default([]),
  fastest_partnerships: z.array(z.string()).default([]),
  revenue_blockers: z.array(z.string()).default([]),
  cash_forecast_usd: z.number().nullable().default(null),
  created_at: z.string().datetime(),
});
export type RevenueCommandCenter = z.infer<typeof RevenueCommandCenterSchema>;

// ---------------------------------------------------------------------------
// BusinessRevenueMission (mutable) — per-business revenue plan
// ---------------------------------------------------------------------------

export const BusinessRevenueMissionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business: BusinessRevenueKeySchema,
  objectives: z.array(z.string()).default([]),
  tactics: z.array(z.string()).default([]),
  kpis: z.array(z.string()).default([]),
  status: BusinessRevenueMissionStatusSchema.default("active"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type BusinessRevenueMission = z.infer<typeof BusinessRevenueMissionSchema>;

/** Input to setBusinessMission. */
export const BusinessRevenueMissionInputSchema = z.object({
  business: BusinessRevenueKeySchema,
  objectives: z.array(z.string()).default([]),
  tactics: z.array(z.string()).default([]),
  kpis: z.array(z.string()).default([]),
  status: BusinessRevenueMissionStatusSchema.default("active"),
});
export type BusinessRevenueMissionInput = z.input<typeof BusinessRevenueMissionInputSchema>;

// ---------------------------------------------------------------------------
// OfferReview (append-only) — pre-send offer / pricing review
// ---------------------------------------------------------------------------

export const OfferReviewSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business: z.string().min(1),
  offer_name: z.string().min(1),
  price_usd: z.number().nonnegative().default(0),
  /** Auto-detected flags, e.g. underpricing, vague_scope, weak_cta, missing_deposit,
   * missing_payment_link, low_margin_custom_work, unpaid_consulting. */
  flags: z.array(z.string()).default([]),
  recommended_price_usd: z.number().nullable().default(null),
  verdict: OfferReviewVerdictSchema.default("send"),
  notes: z.string().default(""),
  created_at: z.string().datetime(),
});
export type OfferReview = z.infer<typeof OfferReviewSchema>;

/** Input to reviewOffer. The booleans drive auto-flag detection. */
export const OfferReviewInputSchema = z.object({
  business: z.string().min(1),
  offer_name: z.string().min(1),
  price_usd: z.number().nonnegative().default(0),
  /** Floor below which the offer is flagged as underpriced. */
  price_floor_usd: z.number().nonnegative().default(0),
  has_clear_scope: z.boolean().default(true),
  has_cta: z.boolean().default(true),
  has_deposit: z.boolean().default(true),
  has_payment_link: z.boolean().default(true),
  is_custom_work: z.boolean().default(false),
  is_consulting: z.boolean().default(false),
  is_paid: z.boolean().default(true),
  notes: z.string().default(""),
});
export type OfferReviewInput = z.input<typeof OfferReviewInputSchema>;

// ---------------------------------------------------------------------------
// RevenueKpiSnapshot — aggregated CRO KPIs
// ---------------------------------------------------------------------------

export const RevenueKpiSnapshotSchema = z.object({
  tenant_id: z.string().uuid(),
  leads: z.number().nonnegative().default(0),
  qualified_leads: z.number().nonnegative().default(0),
  booked_calls: z.number().nonnegative().default(0),
  proposals_sent: z.number().nonnegative().default(0),
  close_rate: z.number().min(0).max(1).default(0),
  avg_deal_size: z.number().nonnegative().default(0),
  revenue_generated: z.number().nonnegative().default(0),
  recurring_revenue: z.number().nonnegative().default(0),
  transaction_fees: z.number().nonnegative().default(0),
  referral_revenue: z.number().nonnegative().default(0),
  funding_raised: z.number().nonnegative().default(0),
  followups_completed: z.number().nonnegative().default(0),
  unpaid_labor_prevented: z.number().nonnegative().default(0),
  /** Average speed-to-cash (days) across pursue_now opportunities. */
  time_to_cash: z.number().nonnegative().default(0),
});
export type RevenueKpiSnapshot = z.infer<typeof RevenueKpiSnapshotSchema>;
