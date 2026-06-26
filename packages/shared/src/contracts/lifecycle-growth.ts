import { z } from "zod";

/**
 * Lifecycle + Growth Architecture.
 *
 * Designs the full lifecycle, compounding growth loops, the trust flywheel, first-impression
 * audits, and white-glove journeys for every business + stakeholder. Complements the conversion
 * and relationship-capital engines: this contract owns the EXPLICIT funnel/lifecycle architecture
 * (8 ordered stages per stakeholder), growth loops, and trust assets — it does not duplicate them.
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 *
 * NOTE: every exported schema + type is uniquely prefixed (Lifecycle / GrowthLoop / TrustAsset /
 * FirstImpression / WhiteGlove / Stakeholder) to avoid barrel export-name collisions.
 */

// ---------------------------------------------------------------------------
// Enums (uniquely named to avoid barrel collisions)
// ---------------------------------------------------------------------------

/** The eight ordered lifecycle stages every stakeholder journey passes through. */
export const LifecycleStageSchema = z.enum([
  "attention",
  "interest",
  "trust",
  "conversion",
  "activation",
  "retention",
  "expansion",
  "advocacy",
]);
export type LifecycleStage = z.infer<typeof LifecycleStageSchema>;

/** The canonical, ordered list of lifecycle stages (used to scaffold + validate order). */
export const LIFECYCLE_STAGE_ORDER = [
  "attention",
  "interest",
  "trust",
  "conversion",
  "activation",
  "retention",
  "expansion",
  "advocacy",
] as const satisfies readonly LifecycleStage[];

/** Kinds of stakeholder a lifecycle / white-glove journey can be designed for. */
export const StakeholderKindSchema = z.enum([
  "customer",
  "referral_partner",
  "vendor",
  "developer",
  "investor",
  "venue",
  "sponsor",
  "clinic",
  "consumer",
  "buyer",
  "donor",
  "volunteer",
  "user",
  "employee",
  "contractor",
]);
export type StakeholderKind = z.infer<typeof StakeholderKindSchema>;

/** The kinds of compounding growth loop a business can run. */
export const GrowthLoopKindSchema = z.enum([
  "referral",
  "content",
  "marketplace",
  "review",
  "donor",
  "custom",
]);
export type GrowthLoopKind = z.infer<typeof GrowthLoopKindSchema>;

/** Touchpoints where a first impression is formed. */
export const FirstImpressionTouchpointSchema = z.enum([
  "job_post",
  "cold_email",
  "social_post",
  "landing_page",
  "website",
  "onboarding_email",
  "signup_flow",
  "proposal",
  "donation_page",
  "vendor_invite",
  "developer_invite",
  "dm_reply",
  "support_response",
]);
export type FirstImpressionTouchpoint = z.infer<typeof FirstImpressionTouchpointSchema>;

// ---------------------------------------------------------------------------
// Lifecycle Map (mutable)
// ---------------------------------------------------------------------------

/** A fully-specified design for a single lifecycle stage. */
export const LifecycleStageSpecSchema = z.object({
  stage: LifecycleStageSchema,
  audience_mindset: z.string().default(""),
  pain_point: z.string().default(""),
  message: z.string().default(""),
  asset: z.string().default(""),
  cta: z.string().default(""),
  channel: z.string().default(""),
  owner_agent: z.string().default(""),
  kpi: z.string().default(""),
  friction: z.string().default(""),
  follow_up: z.string().default(""),
  automation: z.string().default(""),
  failure_signal: z.string().default(""),
});
export type LifecycleStageSpec = z.infer<typeof LifecycleStageSpecSchema>;

export const LifecycleMapSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_key: z.string().min(1),
  stakeholder: StakeholderKindSchema,
  /** All eight stage specs, in lifecycle order. */
  stages: z.array(LifecycleStageSpecSchema).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type LifecycleMap = z.infer<typeof LifecycleMapSchema>;

export const DesignLifecycleInputSchema = z.object({
  business_key: z.string().min(1),
  stakeholder: StakeholderKindSchema,
  /** Optional pre-filled stage specs; when omitted the engine scaffolds all 8 empty stages. */
  stages: z.array(LifecycleStageSpecSchema).optional(),
});
export type DesignLifecycleInput = z.infer<typeof DesignLifecycleInputSchema>;

// ---------------------------------------------------------------------------
// Growth Loop (mutable)
// ---------------------------------------------------------------------------

export const GrowthLoopStepSchema = z.object({
  trigger: z.string().default(""),
  participant: z.string().default(""),
  action: z.string().default(""),
  reward_value: z.string().default(""),
  metric: z.string().default(""),
  friction: z.string().default(""),
  automation: z.string().default(""),
  failure_point: z.string().default(""),
});
export type GrowthLoopStep = z.infer<typeof GrowthLoopStepSchema>;

export const GrowthLoopSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_key: z.string().min(1),
  name: z.string().min(1),
  kind: GrowthLoopKindSchema,
  steps: z.array(GrowthLoopStepSchema).default([]),
  improvement_plan: z.string().default(""),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type GrowthLoop = z.infer<typeof GrowthLoopSchema>;

export const DesignGrowthLoopInputSchema = z.object({
  business_key: z.string().min(1),
  name: z.string().min(1),
  kind: GrowthLoopKindSchema,
  steps: z.array(GrowthLoopStepSchema).default([]),
  improvement_plan: z.string().default(""),
});
export type DesignGrowthLoopInput = z.infer<typeof DesignGrowthLoopInputSchema>;

export const GrowthLoopFilterSchema = z.object({
  business_key: z.string().optional(),
  kind: GrowthLoopKindSchema.optional(),
});
export type GrowthLoopFilter = z.infer<typeof GrowthLoopFilterSchema>;

// ---------------------------------------------------------------------------
// Trust Asset Audit (append-only)
// ---------------------------------------------------------------------------

export const TrustAssetAuditSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_key: z.string().min(1),
  existing_assets: z.array(z.string()).default([]),
  missing_assets: z.array(z.string()).default([]),
  easiest_to_create: z.string().default(""),
  highest_value_proof: z.string().default(""),
  trust_blockers: z.array(z.string()).default([]),
  reputation_risks: z.array(z.string()).default([]),
  next_action: z.string().default(""),
  created_at: z.string().datetime(),
});
export type TrustAssetAudit = z.infer<typeof TrustAssetAuditSchema>;

export const AuditTrustAssetsInputSchema = z.object({
  business_key: z.string().min(1),
  existing_assets: z.array(z.string()).default([]),
  missing_assets: z.array(z.string()).default([]),
  easiest_to_create: z.string().default(""),
  highest_value_proof: z.string().default(""),
  trust_blockers: z.array(z.string()).default([]),
  reputation_risks: z.array(z.string()).default([]),
  next_action: z.string().default(""),
});
export type AuditTrustAssetsInput = z.infer<typeof AuditTrustAssetsInputSchema>;

// ---------------------------------------------------------------------------
// First Impression Audit (append-only)
// ---------------------------------------------------------------------------

export const FirstImpressionAuditSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_key: z.string().min(1),
  touchpoint: FirstImpressionTouchpointSchema,
  sets_expectations: z.boolean().default(false),
  reduces_anxiety: z.boolean().default(false),
  explains_value: z.boolean().default(false),
  attracts_right: z.boolean().default(false),
  repels_wrong: z.boolean().default(false),
  credible: z.boolean().default(false),
  creates_next_action: z.boolean().default(false),
  matches_brand: z.boolean().default(false),
  /** Fraction (0–1) of the 8 boolean checks that pass. Computed by the engine. */
  score: z.number().min(0).max(1),
  recommendations: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type FirstImpressionAudit = z.infer<typeof FirstImpressionAuditSchema>;

export const AuditFirstImpressionInputSchema = z.object({
  business_key: z.string().min(1),
  touchpoint: FirstImpressionTouchpointSchema,
  sets_expectations: z.boolean().default(false),
  reduces_anxiety: z.boolean().default(false),
  explains_value: z.boolean().default(false),
  attracts_right: z.boolean().default(false),
  repels_wrong: z.boolean().default(false),
  credible: z.boolean().default(false),
  creates_next_action: z.boolean().default(false),
  matches_brand: z.boolean().default(false),
});
export type AuditFirstImpressionInput = z.infer<typeof AuditFirstImpressionInputSchema>;

// ---------------------------------------------------------------------------
// White-Glove Journey (mutable)
// ---------------------------------------------------------------------------

export const WhiteGloveStageSchema = z.object({
  stage_name: z.string().min(1),
  objective: z.string().default(""),
  pain_addressed: z.string().default(""),
  communication: z.string().default(""),
  asset: z.string().default(""),
  owner: z.string().default(""),
  kpi: z.string().default(""),
  failure_signal: z.string().default(""),
  improvement: z.string().default(""),
});
export type WhiteGloveStage = z.infer<typeof WhiteGloveStageSchema>;

export const WhiteGloveJourneySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_key: z.string().min(1),
  stakeholder: StakeholderKindSchema,
  stages: z.array(WhiteGloveStageSchema).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type WhiteGloveJourney = z.infer<typeof WhiteGloveJourneySchema>;

export const DesignWhiteGloveJourneyInputSchema = z.object({
  business_key: z.string().min(1),
  stakeholder: StakeholderKindSchema,
  stages: z.array(WhiteGloveStageSchema).default([]),
});
export type DesignWhiteGloveJourneyInput = z.infer<typeof DesignWhiteGloveJourneyInputSchema>;
