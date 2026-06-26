import { z } from "zod";

/**
 * Simulation Engine contracts. Before launching major workflows, Alfy² simulates the outcome and
 * returns a best / likely / worst case, the risks, a recommendation, and the decision the operator
 * needs to make. Covers campaign outcomes, revenue paths, hiring vs automation, pricing changes,
 * business priority shifts, cash-flow scenarios, implementation risks, and agent behavior under
 * failure. Deterministic. See docs/adr/ADR-0021-simulation-engine.md. Mirrored in workers (Pydantic).
 */

/** The kind of thing being simulated. */
export const SimulationKindSchema = z.enum([
  "campaign_outcome",
  "revenue_path",
  "hiring_vs_automation",
  "pricing_change",
  "priority_shift",
  "cash_flow",
  "implementation_risk",
  "agent_failure",
]);
export type SimulationKind = z.infer<typeof SimulationKindSchema>;

/** Which scenario a case represents. */
export const CaseLabelSchema = z.enum(["best", "likely", "worst"]);
export type CaseLabel = z.infer<typeof CaseLabelSchema>;

export const SimLevelSchema = z.enum(["low", "medium", "high"]);
export type SimLevel = z.infer<typeof SimLevelSchema>;

/** One projected scenario. */
export const ScenarioCaseSchema = z.object({
  label: CaseLabelSchema,
  /** The assumptions that define this case. */
  assumptions: z.array(z.string()).default([]),
  /** Named numeric projections, e.g. { revenue_usd: 50000, runway_months: 7 }. */
  projection: z.record(z.number()).default({}),
  narrative: z.string().min(1),
  /** Rough probability of this case, 0..1. */
  probability: z.number().min(0).max(1),
});
export type ScenarioCase = z.infer<typeof ScenarioCaseSchema>;

/** A risk surfaced by the simulation. */
export const SimRiskSchema = z.object({
  description: z.string().min(1),
  likelihood: SimLevelSchema,
  impact: SimLevelSchema,
  mitigation: z.string().min(1),
});
export type SimRisk = z.infer<typeof SimRiskSchema>;

/** Input to run a simulation. */
export const SimulationInputSchema = z.object({
  kind: SimulationKindSchema,
  name: z.string().min(1),
  /** Planning horizon in days (where relevant). */
  horizon_days: z.number().int().positive().default(90),
  /** Free numeric/labeled parameters specific to the kind (baseline, growth, price, cost, etc.). */
  parameters: z.record(z.unknown()).default({}),
});
export type SimulationInput = z.infer<typeof SimulationInputSchema>;

/** The simulation output: three cases, risks, a recommendation, and the decision needed. */
export const SimulationResultSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: SimulationKindSchema,
  name: z.string().min(1),
  horizon_days: z.number().int().positive(),
  best_case: ScenarioCaseSchema,
  likely_case: ScenarioCaseSchema,
  worst_case: ScenarioCaseSchema,
  /** Probability-weighted value of the headline metric across the three cases, when computable. */
  expected_value: z.number().nullable().default(null),
  risks: z.array(SimRiskSchema).default([]),
  recommendation: z.string().min(1),
  /** The decision the operator needs to make. */
  decision_needed: z.string().min(1),
  created_at: z.string().datetime(),
});
export type SimulationResult = z.infer<typeof SimulationResultSchema>;
