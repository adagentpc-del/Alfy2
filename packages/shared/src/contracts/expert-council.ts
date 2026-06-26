import { z } from "zod";

/**
 * Expert Knowledge Council + Framework Library.
 *
 * A private advisory board of elite operators. It maintains a framework library (Hormozi, Leila
 * Hormozi, Gary Vee, Russell Brunson, Donald Miller / StoryBrand, Dan Kennedy, April Dunford, Naval,
 * Munger, Buffett, Dalio, Cialdini, Codie Sanchez, Kevin O'Leary, Chris Voss, ...) and APPLIES it:
 *   select lenses → apply each → resolve conflicts → convert principle to execution → test against
 *   real businesses.
 *
 * CORE RULE (enforced in code, never imitation): extract the principle → evaluate fit → simulate →
 * adapt to Alyssa's businesses → execute → measure. Money / investment recommendations always
 * require Alyssa approval (the engine sets approval_needed).
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 *
 * NOTE: every exported schema + type is uniquely prefixed (Expert / Lens / Framework / Principle /
 * AdvisoryBoard / BoardLens) to avoid barrel export-name collisions with other contracts — notably
 * teach-framework.ts (FrameworkArtifact / TaughtFramework) and intel-lenses.ts (WhyThisMatters /
 * Contrarian).
 */

// ---------------------------------------------------------------------------
// Enums (uniquely named to avoid barrel collisions)
// ---------------------------------------------------------------------------

/** The discipline a framework / lens operates in. */
export const ExpertLensKindSchema = z.enum([
  "offer_pricing",
  "marketing_attention",
  "sales_persuasion",
  "operations_scaling",
  "wealth_investing",
  "psychology_behavior",
  "product_growth",
  "leadership_culture",
  "negotiation_deals",
  "nonprofit_fundraising",
]);
export type ExpertLensKind = z.infer<typeof ExpertLensKindSchema>;

/** Lifecycle of a framework as it is tested against real businesses. */
export const FrameworkTestStatusSchema = z.enum([
  "untested",
  "testing",
  "validated",
  "adapted",
  "rejected",
  "archived",
]);
export type FrameworkTestStatus = z.infer<typeof FrameworkTestStatusSchema>;

// ---------------------------------------------------------------------------
// Expert Framework (mutable)
// ---------------------------------------------------------------------------

export const ExpertFrameworkSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** The operator the principle is extracted from (e.g. "Alex Hormozi"). */
  expert: z.string().min(1),
  discipline: ExpertLensKindSchema,
  /** Where the principle comes from (book, talk, framework name). */
  source: z.string().default(""),
  /** The extracted, de-personalized principle (what is true, not who said it). */
  principle: z.string().min(1),
  framework_name: z.string().min(1),
  best_use_case: z.string().default(""),
  bad_use_case: z.string().default(""),
  /** How this framework is dangerous if blindly imitated. */
  misuse_risk: z.string().default(""),
  /** How the principle is adapted to Alyssa's businesses (NOT imitation). */
  adapted_for_alyssa: z.string().default(""),
  /** Business keys this framework applies to (e.g. "move_mi", "black_flag"). */
  business_applications: z.array(z.string()).default([]),
  implementation_steps: z.array(z.string()).default([]),
  kpi: z.string().default(""),
  confidence: z.number().min(0).max(1).default(0.5),
  test_status: FrameworkTestStatusSchema.default("untested"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type ExpertFramework = z.infer<typeof ExpertFrameworkSchema>;

// ---------------------------------------------------------------------------
// Lens Application (append-only)
// ---------------------------------------------------------------------------

/** One lens's recommendation in a lens application. */
export const LensRecommendationSchema = z.object({
  lens: ExpertLensKindSchema,
  recommendation: z.string().min(1),
});
export type LensRecommendation = z.infer<typeof LensRecommendationSchema>;

export const LensApplicationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  objective: z.string().min(1),
  business_key: z.string().default(""),
  selected_lenses: z.array(ExpertLensKindSchema).default([]),
  recommendations: z.array(LensRecommendationSchema).default([]),
  conflicts: z.array(z.string()).default([]),
  chosen_strategy: z.string().default(""),
  execution_steps: z.array(z.string()).default([]),
  kpis: z.array(z.string()).default([]),
  /** True when money / investment is involved — requires Alyssa approval. */
  approval_needed: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type LensApplication = z.infer<typeof LensApplicationSchema>;

// ---------------------------------------------------------------------------
// Principle Conversion (append-only)
// ---------------------------------------------------------------------------

export const PrincipleConversionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  principle: z.string().min(1),
  businesses: z.array(z.string()).default([]),
  departments: z.array(z.string()).default([]),
  agents: z.array(z.string()).default([]),
  templates_needed: z.array(z.string()).default([]),
  sops_needed: z.array(z.string()).default([]),
  campaign_use: z.string().default(""),
  product_use: z.string().default(""),
  kpi: z.string().default(""),
  recommended_test: z.string().default(""),
  created_at: z.string().datetime(),
});
export type PrincipleConversion = z.infer<typeof PrincipleConversionSchema>;

// ---------------------------------------------------------------------------
// Advisory Board Review (append-only)
// ---------------------------------------------------------------------------

/** One lens's view in an advisory board review. */
export const BoardLensViewSchema = z.object({
  lens_name: z.string().min(1),
  recommendation: z.string().min(1),
});
export type BoardLensView = z.infer<typeof BoardLensViewSchema>;

export const AdvisoryBoardReviewSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  decision: z.string().min(1),
  lenses_run: z.array(BoardLensViewSchema).default([]),
  tradeoffs: z.array(z.string()).default([]),
  decision_required: z.string().default(""),
  fastest_safe_next_step: z.string().default(""),
  created_at: z.string().datetime(),
});
export type AdvisoryBoardReview = z.infer<typeof AdvisoryBoardReviewSchema>;
