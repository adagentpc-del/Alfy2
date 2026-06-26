import { z } from "zod";

/**
 * Business Simulation Engine contracts. Before a major decision, simulate the options head-to-head:
 * focus on one business vs another, campaign A vs B, hire vs automate, lower price vs premium offer,
 * warm leads vs cold leads, build a feature vs sell an existing offer. Each option is projected into a
 * best / likely / worst case with revenue impact, risk, time cost, and stress cost, and the engine
 * recommends one. See docs/adr/ADR-0048-business-simulation-engine.md. Mirrored in workers (Pydantic).
 *
 * Distinct from the scenario Simulation Engine (ADR-0021), which models a single scenario's three cases;
 * this engine is an A-vs-B decision comparator that recommends a winner.
 */

/** The six decision kinds. */
export const BizDecisionKindSchema = z.enum([
  "focus_choice",
  "campaign_choice",
  "hire_vs_automate",
  "pricing_choice",
  "lead_focus",
  "build_vs_sell",
]);
export type BizDecisionKind = z.infer<typeof BizDecisionKindSchema>;

/** One option being weighed. */
export const DecisionOptionSchema = z.object({
  label: z.string().min(1),
  projected_revenue_usd: z.number().nonnegative().default(0),
  probability: z.number().min(0).max(1).default(0.5),
  /** Days of founder/team time the option costs. */
  time_cost_days: z.number().nonnegative().default(0),
  /** Toll on the founder, 0..1. */
  stress_cost: z.number().min(0).max(1).default(0),
  /** Downside risk, 0..1. */
  risk: z.number().min(0).max(1).default(0),
});
export type DecisionOption = z.infer<typeof DecisionOptionSchema>;

/** An option's projected three-case outcome. */
export const OptionOutcomeSchema = z.object({
  label: z.string().min(1),
  best_case_usd: z.number(),
  likely_case_usd: z.number(),
  worst_case_usd: z.number(),
  expected_value_usd: z.number(),
  risk: z.number().min(0).max(1),
  time_cost_days: z.number().nonnegative(),
  stress_cost: z.number().min(0).max(1),
  /** Composite desirability (EV penalized by risk, stress, and time). */
  score: z.number(),
});
export type OptionOutcome = z.infer<typeof OptionOutcomeSchema>;

export const SimulateDecisionInputSchema = z.object({
  kind: BizDecisionKindSchema,
  question: z.string().default(""),
  option_a: DecisionOptionSchema,
  option_b: DecisionOptionSchema,
});
export type SimulateDecisionInput = z.infer<typeof SimulateDecisionInputSchema>;

/** The head-to-head simulation result. */
export const BusinessSimulationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: BizDecisionKindSchema,
  question: z.string().default(""),
  a: OptionOutcomeSchema,
  b: OptionOutcomeSchema,
  /** The recommended option's label. */
  recommendation: z.string().min(1),
  reason: z.string().min(1),
  created_at: z.string().datetime(),
});
export type BusinessSimulation = z.infer<typeof BusinessSimulationSchema>;
