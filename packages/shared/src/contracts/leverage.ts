import { z } from "zod";

/**
 * Leverage Engine contracts. Every recommendation receives a Leverage Score estimating how much future
 * value the decision will create, from fourteen inputs. When multiple options exist, Alfy² recommends the
 * highest-leverage path, not simply the fastest — thinking like an owner allocating capital and time (one
 * SOP that eliminates 500 future decisions outranks solving today's issue manually). See
 * docs/adr/ADR-0086-leverage-engine.md. Mirrored in workers (Pydantic).
 */

/** The fourteen leverage inputs, each 0..1. */
export const LeverageInputsSchema = z.object({
  revenue_impact: z.number().min(0).max(1).default(0),
  time_saved: z.number().min(0).max(1).default(0),
  stress_reduced: z.number().min(0).max(1).default(0),
  knowledge_created: z.number().min(0).max(1).default(0),
  automation_potential: z.number().min(0).max(1).default(0),
  businesses_helped: z.number().min(0).max(1).default(0),
  assets_created: z.number().min(0).max(1).default(0),
  people_helped: z.number().min(0).max(1).default(0),
  future_reuse: z.number().min(0).max(1).default(0),
  founderos_potential: z.number().min(0).max(1).default(0),
  brand_value: z.number().min(0).max(1).default(0),
  relationship_value: z.number().min(0).max(1).default(0),
  decision_quality: z.number().min(0).max(1).default(0),
  longevity: z.number().min(0).max(1).default(0),
});
export type LeverageInputs = z.infer<typeof LeverageInputsSchema>;

/** The leverage tier. */
export const LeverageTierSchema = z.enum(["low", "medium", "high", "compounding", "generational"]);
export type LeverageTier = z.infer<typeof LeverageTierSchema>;

export const ScoreLeverageInputSchema = z.object({
  option_label: z.string().min(1),
  inputs: LeverageInputsSchema,
});
export type ScoreLeverageInput = z.infer<typeof ScoreLeverageInputSchema>;

/** A leverage score for one option. */
export const LeverageScoreSchema = z.object({
  option_label: z.string().min(1),
  score: z.number().min(0).max(1),
  tier: LeverageTierSchema,
  /** The inputs that drove the score highest. */
  top_drivers: z.array(z.string()).default([]),
  why: z.string().min(1),
});
export type LeverageScore = z.infer<typeof LeverageScoreSchema>;

/** A ranked comparison across options — the highest-leverage path is recommended. */
export const LeverageComparisonSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  ranked: z.array(LeverageScoreSchema).default([]),
  recommended_option: z.string().min(1),
  /** When the fastest option differs from the highest-leverage one, this explains the trade. */
  note: z.string().default(""),
  created_at: z.string().datetime(),
});
export type LeverageComparison = z.infer<typeof LeverageComparisonSchema>;
