import { z } from "zod";

/**
 * Opportunity Cost Engine contracts. Compares options A/B/C/D, computing for each the expected upside,
 * downside, capital required, time required, stress cost, complexity, risk, confidence, future leverage,
 * and opportunity cost — then recommends the best financial / strategic / long-term / low-risk / fastest /
 * highest-leverage choice, always showing what is NOT being chosen and why. See
 * docs/adr/ADR-0089-opportunity-cost.md. Mirrored in workers (Pydantic).
 */

/** One option under comparison. */
export const CostOptionSchema = z.object({
  label: z.string().min(1),
  expected_upside_usd: z.number().default(0),
  expected_downside_usd: z.number().default(0),
  capital_required_usd: z.number().nonnegative().default(0),
  time_required_days: z.number().nonnegative().default(0),
  stress_cost: z.number().min(0).max(1).default(0),
  complexity: z.number().min(0).max(1).default(0),
  risk: z.number().min(0).max(1).default(0),
  confidence: z.number().min(0).max(1).default(0.5),
  future_leverage: z.number().min(0).max(1).default(0),
});
export type CostOption = z.infer<typeof CostOptionSchema>;

export const CompareOptionsInputSchema = z.object({
  question: z.string().default(""),
  options: z.array(CostOptionSchema).min(2),
});
export type CompareOptionsInput = z.infer<typeof CompareOptionsInputSchema>;

/** An evaluated option with its computed opportunity cost. */
export const EvaluatedOptionSchema = z.object({
  label: z.string().min(1),
  expected_value_usd: z.number(),
  /** The value forgone vs the best alternative (the opportunity cost). */
  opportunity_cost_usd: z.number(),
  composite_score: z.number(),
});
export type EvaluatedOption = z.infer<typeof EvaluatedOptionSchema>;

/** The comparison result. */
export const OpportunityComparisonSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  question: z.string().default(""),
  evaluated: z.array(EvaluatedOptionSchema).default([]),
  best_financial: z.string().min(1),
  best_strategic: z.string().min(1),
  best_long_term: z.string().min(1),
  best_low_risk: z.string().min(1),
  fastest: z.string().min(1),
  highest_leverage: z.string().min(1),
  /** What is NOT being chosen, and why. */
  not_chosen: z.array(z.string()).default([]),
  recommendation: z.string().min(1),
  created_at: z.string().datetime(),
});
export type OpportunityComparison = z.infer<typeof OpportunityComparisonSchema>;
