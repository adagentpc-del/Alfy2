import { z } from "zod";

/**
 * Market Intelligence — listen to the real market, find the gaps, and score AI-search /
 * public-reputation visibility (AEO: Answer / AI-Engine Optimization).
 *
 * Three jobs, one engine:
 *   1. Voice-of-Customer (VoC) intelligence — capture real market pain in the customer's own words
 *      from every channel (reviews, DMs, support tickets, lost deals, …) and what it should improve.
 *   2. Market Gap detection — name an unmet need, who feels it, the opportunity, and a speed-to-market plan.
 *   3. AI-Search / reputation visibility scoring — weighted signal groups → three 0–100 scores
 *      (ai_visibility, search_visibility, reputation) plus the missing entity/authority/proof signals.
 *
 * This is AEO-specific scoring + VoC + gaps. It deliberately does NOT duplicate the generic
 * `visibility` engine (that one is channel/posting-cadence focused).
 *
 * Every exported schema + type is uniquely prefixed (Voc* / MarketGap* / AiVisibility* / Market*)
 * to avoid barrel export-name collisions. This contract is mirrored 1:1 by Pydantic models in
 * workers/alfy_workers/contracts.
 */

// ---------------------------------------------------------------------------
// Enums (uniquely prefixed)
// ---------------------------------------------------------------------------

/** Where a Voice-of-Customer signal came from. */
export const VocSourceKindSchema = z.enum([
  "email",
  "comment",
  "dm",
  "review",
  "sales_call",
  "support_ticket",
  "forum",
  "competitor_review",
  "social_post",
  "survey",
  "interview",
  "lost_deal",
]);
export type VocSourceKind = z.infer<typeof VocSourceKindSchema>;

// ---------------------------------------------------------------------------
// Voice-of-Customer insight (append-only)
// ---------------------------------------------------------------------------

export const VoiceOfCustomerInsightSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** Which business this insight belongs to (stable business key, not a uuid). */
  business_key: z.string().min(1),
  source: VocSourceKindSchema,
  pain_points: z.array(z.string()).default([]),
  /** The exact words/phrases customers use (for mirrored copy). */
  customer_language: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
  desires: z.array(z.string()).default([]),
  trust_barriers: z.array(z.string()).default([]),
  feature_requests: z.array(z.string()).default([]),
  pricing_friction: z.array(z.string()).default([]),
  emotional_triggers: z.array(z.string()).default([]),
  competitor_complaints: z.array(z.string()).default([]),
  /** What this insight should improve: copy/offers/onboarding/social/product/faqs/follow-ups/sales-scripts. */
  improves: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type VoiceOfCustomerInsight = z.infer<typeof VoiceOfCustomerInsightSchema>;

/** Input to record a VoC insight (engine fills id/tenant/created_at). */
export const RecordVocInputSchema = z.object({
  business_key: z.string().min(1),
  source: VocSourceKindSchema,
  pain_points: z.array(z.string()).default([]),
  customer_language: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
  desires: z.array(z.string()).default([]),
  trust_barriers: z.array(z.string()).default([]),
  feature_requests: z.array(z.string()).default([]),
  pricing_friction: z.array(z.string()).default([]),
  emotional_triggers: z.array(z.string()).default([]),
  competitor_complaints: z.array(z.string()).default([]),
  /** Optional explicit improvement targets; when omitted the engine derives them from the signals. */
  improves: z.array(z.string()).optional(),
});
export type RecordVocInput = z.infer<typeof RecordVocInputSchema>;

// ---------------------------------------------------------------------------
// Market Gap (append-only)
// ---------------------------------------------------------------------------

export const MarketGapSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  market: z.string().min(1),
  gap: z.string().min(1),
  why_exists: z.string().default(""),
  who_feels_it: z.string().default(""),
  opportunity: z.string().default(""),
  mvp_solution: z.string().default(""),
  revenue_model: z.string().default(""),
  speed_to_market_plan: z.string().default(""),
  created_at: z.string().datetime(),
});
export type MarketGap = z.infer<typeof MarketGapSchema>;

/** Input to detect/record a market gap (engine fills id/tenant/created_at). */
export const DetectMarketGapInputSchema = z.object({
  market: z.string().min(1),
  gap: z.string().min(1),
  why_exists: z.string().default(""),
  who_feels_it: z.string().default(""),
  opportunity: z.string().default(""),
  mvp_solution: z.string().default(""),
  revenue_model: z.string().default(""),
  speed_to_market_plan: z.string().default(""),
});
export type DetectMarketGapInput = z.infer<typeof DetectMarketGapInputSchema>;

// ---------------------------------------------------------------------------
// AI-Search / reputation visibility signals (0–1 each)
// ---------------------------------------------------------------------------

const unit = () => z.number().min(0).max(1);

export const AiVisibilitySignalsSchema = z.object({
  website_clarity: unit(),
  entity_consistency: unit(),
  name_consistency: unit(),
  category_clarity: unit(),
  schema_markup: unit(),
  faq_quality: unit(),
  comparison_content: unit(),
  authority_content: unit(),
  citations: unit(),
  reviews: unit(),
  social_proof: unit(),
  press: unit(),
  gbp: unit(),
  linkedin: unit(),
  contact_clarity: unit(),
  freshness: unit(),
});
export type AiVisibilitySignals = z.infer<typeof AiVisibilitySignalsSchema>;

// ---------------------------------------------------------------------------
// AI Visibility Score (append-only)
// ---------------------------------------------------------------------------

export const AiVisibilityScoreSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_key: z.string().min(1),
  signals: AiVisibilitySignalsSchema,
  /** Weighted entity/clarity/schema/faq/comparison/category group → 0–100. */
  ai_visibility_score: z.number().min(0).max(100),
  /** Weighted clarity/citations/links/freshness/gbp group → 0–100. */
  search_visibility_score: z.number().min(0).max(100),
  /** Weighted reviews/press/social_proof/authority group → 0–100. */
  reputation_score: z.number().min(0).max(100),
  missing_entity_signals: z.array(z.string()).default([]),
  missing_authority_signals: z.array(z.string()).default([]),
  missing_proof: z.array(z.string()).default([]),
  recommended_content: z.array(z.string()).default([]),
  recommended_citations: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type AiVisibilityScore = z.infer<typeof AiVisibilityScoreSchema>;

/** Input to score AI/search/reputation visibility. */
export const ScoreAiVisibilityInputSchema = z.object({
  business_key: z.string().min(1),
  signals: AiVisibilitySignalsSchema,
});
export type ScoreAiVisibilityInput = z.infer<typeof ScoreAiVisibilityInputSchema>;
