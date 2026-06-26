import { z } from "zod";

/**
 * Incentive Alignment + Referral Ecosystem + Value Exchange.
 *
 * Every incentive, referral, partnership, and rev-share is evaluated through incentive alignment +
 * value exchange so the business is protected FIRST while participant value increases.
 *
 * CORE RULE (enforced in code, not just documented): do NOT design extractive systems. Design
 * compounding ecosystems where value flows clearly, incentives are transparent, referrals are
 * rewarded, and everyone has a reason to keep engaging. Anything involving money / rev-share /
 * discounts / payouts / pricing / contracts requires Alyssa approval before it advances.
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 *
 * NOTE: every exported schema + type is uniquely prefixed (Ecosystem / Incentive / Referral /
 * RevShare / ValueExchange / WinWinWin) to avoid barrel export-name collisions with other contracts.
 */

// ---------------------------------------------------------------------------
// Enums (uniquely prefixed to avoid barrel collisions)
// ---------------------------------------------------------------------------

/** Who is participating in the ecosystem / value exchange. */
export const EcosystemParticipantKindSchema = z.enum([
  "vendor",
  "venue",
  "developer",
  "investor",
  "sponsor",
  "donor",
  "customer",
  "partner",
  "employee",
  "contractor",
  "platform_user",
  "referral_source",
]);
export type EcosystemParticipantKind = z.infer<typeof EcosystemParticipantKindSchema>;

/** The kind of incentive / reward being offered or evaluated. */
export const IncentiveTypeSchema = z.enum([
  "revenue_share",
  "referral_reward",
  "visibility",
  "preferred_placement",
  "early_access",
  "status_tier",
  "exclusive_resource",
  "discount",
  "done_for_you",
  "faster_response",
  "reporting_insights",
  "networking_intro",
  "content_feature",
  "case_study",
]);
export type IncentiveType = z.infer<typeof IncentiveTypeSchema>;

/** Verdict for an incentive / win-win-win review. */
export const IncentiveVerdictSchema = z.enum(["recommend", "revise", "reject"]);
export type IncentiveVerdict = z.infer<typeof IncentiveVerdictSchema>;

/** Lifecycle of a rev-share payout (advancing past pending is approval-gated). */
export const RevSharePayoutStatusSchema = z.enum(["pending", "approved", "paid", "disputed"]);
export type RevSharePayoutStatus = z.infer<typeof RevSharePayoutStatusSchema>;

/** Operating status of a referral program. */
export const ReferralProgramStatusSchema = z.enum(["active", "paused"]);
export type ReferralProgramStatus = z.infer<typeof ReferralProgramStatusSchema>;

// ---------------------------------------------------------------------------
// IncentiveEvaluation (append-only)
// ---------------------------------------------------------------------------

export const IncentiveEvaluationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_key: z.string().min(1),
  participant_kind: EcosystemParticipantKindSchema,
  incentive_type: IncentiveTypeSchema,
  what_they_want: z.string().default(""),
  what_they_give: z.string().default(""),
  what_they_receive: z.string().default(""),
  business_upside: z.number().min(0).max(1).default(0),
  participant_upside: z.number().min(0).max(1).default(0),
  cost_to_deliver: z.number().min(0).max(1).default(0),
  /** Higher = worse (more margin erosion). */
  margin_impact: z.number().min(0).max(1).default(0),
  retention_impact: z.number().min(0).max(1).default(0),
  referral_likelihood: z.number().min(0).max(1).default(0),
  reputation_impact: z.number().min(0).max(1).default(0),
  abuse_risk: z.number().min(0).max(1).default(0),
  /** Computed value-exchange score (0-100). */
  value_exchange_score: z.number().min(0).max(100).default(0),
  approval_required: z.boolean().default(false),
  verdict: IncentiveVerdictSchema.default("revise"),
  notes: z.string().default(""),
  created_at: z.string().datetime(),
});
export type IncentiveEvaluation = z.infer<typeof IncentiveEvaluationSchema>;

export const EvaluateIncentiveInputSchema = z.object({
  business_key: z.string().min(1),
  participant_kind: EcosystemParticipantKindSchema,
  incentive_type: IncentiveTypeSchema,
  what_they_want: z.string().default(""),
  what_they_give: z.string().default(""),
  what_they_receive: z.string().default(""),
  business_upside: z.number().min(0).max(1).default(0),
  participant_upside: z.number().min(0).max(1).default(0),
  cost_to_deliver: z.number().min(0).max(1).default(0),
  margin_impact: z.number().min(0).max(1).default(0),
  retention_impact: z.number().min(0).max(1).default(0),
  referral_likelihood: z.number().min(0).max(1).default(0),
  reputation_impact: z.number().min(0).max(1).default(0),
  abuse_risk: z.number().min(0).max(1).default(0),
  /** Optional explicit signal that this involves money / pricing / contracts. */
  involves_money: z.boolean().default(false),
  notes: z.string().default(""),
});
/** Pre-parse input shape: defaulted fields are optional for callers. */
export type EvaluateIncentiveInput = z.input<typeof EvaluateIncentiveInputSchema>;

// ---------------------------------------------------------------------------
// ReferralProgram (mutable)
// ---------------------------------------------------------------------------

export const ReferralProgramSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_key: z.string().min(1),
  who_can_refer: z.string().default(""),
  who_they_refer: z.string().default(""),
  reward: z.string().default(""),
  tracking_method: z.string().default(""),
  payout_logic: z.string().default(""),
  eligibility: z.string().default(""),
  fraud_prevention: z.string().default(""),
  relationship_protection: z.string().default(""),
  follow_up_sequence: z.array(z.string()).default([]),
  status: ReferralProgramStatusSchema.default("active"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type ReferralProgram = z.infer<typeof ReferralProgramSchema>;

export const CreateReferralProgramInputSchema = z.object({
  business_key: z.string().min(1),
  who_can_refer: z.string().default(""),
  who_they_refer: z.string().default(""),
  reward: z.string().default(""),
  tracking_method: z.string().default(""),
  payout_logic: z.string().default(""),
  eligibility: z.string().default(""),
  fraud_prevention: z.string().default(""),
  relationship_protection: z.string().default(""),
  follow_up_sequence: z.array(z.string()).default([]),
  status: ReferralProgramStatusSchema.default("active"),
});
/** Pre-parse input shape: defaulted fields are optional for callers. */
export type CreateReferralProgramInput = z.input<typeof CreateReferralProgramInputSchema>;

// ---------------------------------------------------------------------------
// RevShareRecord (append-only)
// ---------------------------------------------------------------------------

export const RevShareRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_key: z.string().min(1),
  source_partner: z.string().default(""),
  referred_party: z.string().default(""),
  transaction_ref: z.string().default(""),
  fee_pct: z.number().default(0),
  payout_pct: z.number().default(0),
  payout_trigger: z.string().default(""),
  payout_status: RevSharePayoutStatusSchema.default("pending"),
  agreement_status: z.string().default(""),
  created_at: z.string().datetime(),
});
export type RevShareRecord = z.infer<typeof RevShareRecordSchema>;

export const RecordRevShareInputSchema = z.object({
  business_key: z.string().min(1),
  source_partner: z.string().default(""),
  referred_party: z.string().default(""),
  transaction_ref: z.string().default(""),
  fee_pct: z.number().default(0),
  payout_pct: z.number().default(0),
  payout_trigger: z.string().default(""),
  agreement_status: z.string().default(""),
});
/** Pre-parse input shape: defaulted fields are optional for callers. */
export type RecordRevShareInput = z.input<typeof RecordRevShareInputSchema>;

// ---------------------------------------------------------------------------
// EcosystemHealthScore (append-only)
// ---------------------------------------------------------------------------

export const EcosystemHealthScoreSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_key: z.string().min(1),
  value_created: z.number().min(0).max(1).default(0),
  incentive_fairness: z.number().min(0).max(1).default(0),
  referral_activity: z.number().min(0).max(1).default(0),
  repeat_participation: z.number().min(0).max(1).default(0),
  trust_signals: z.number().min(0).max(1).default(0),
  disputes: z.number().int().nonnegative().default(0),
  payout_timeliness: z.number().min(0).max(1).default(0),
  retention: z.number().min(0).max(1).default(0),
  satisfaction: z.number().min(0).max(1).default(0),
  /** Computed ecosystem-health score (0-100). */
  score: z.number().min(0).max(100).default(0),
  created_at: z.string().datetime(),
});
export type EcosystemHealthScore = z.infer<typeof EcosystemHealthScoreSchema>;

export const ScoreEcosystemHealthInputSchema = z.object({
  value_created: z.number().min(0).max(1).default(0),
  incentive_fairness: z.number().min(0).max(1).default(0),
  referral_activity: z.number().min(0).max(1).default(0),
  repeat_participation: z.number().min(0).max(1).default(0),
  trust_signals: z.number().min(0).max(1).default(0),
  disputes: z.number().int().nonnegative().default(0),
  payout_timeliness: z.number().min(0).max(1).default(0),
  retention: z.number().min(0).max(1).default(0),
  satisfaction: z.number().min(0).max(1).default(0),
});
/** Pre-parse input shape: defaulted fields are optional for callers. */
export type ScoreEcosystemHealthInput = z.input<typeof ScoreEcosystemHealthInputSchema>;

// ---------------------------------------------------------------------------
// WinWinWinReview (append-only)
// ---------------------------------------------------------------------------

export const WinWinWinReviewSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_key: z.string().min(1),
  proposal: z.string().default(""),
  alyssa_wins: z.boolean().default(false),
  participant_wins: z.boolean().default(false),
  end_customer_wins: z.boolean().default(false),
  builds_trust: z.boolean().default(false),
  encourages_repeat: z.boolean().default(false),
  creates_referrals: z.boolean().default(false),
  verdict: IncentiveVerdictSchema.default("revise"),
  created_at: z.string().datetime(),
});
export type WinWinWinReview = z.infer<typeof WinWinWinReviewSchema>;

export const WinWinWinReviewInputSchema = z.object({
  business_key: z.string().min(1),
  proposal: z.string().default(""),
  alyssa_wins: z.boolean().default(false),
  participant_wins: z.boolean().default(false),
  end_customer_wins: z.boolean().default(false),
  builds_trust: z.boolean().default(false),
  encourages_repeat: z.boolean().default(false),
  creates_referrals: z.boolean().default(false),
});
/** Pre-parse input shape: defaulted fields are optional for callers. */
export type WinWinWinReviewInput = z.input<typeof WinWinWinReviewInputSchema>;
