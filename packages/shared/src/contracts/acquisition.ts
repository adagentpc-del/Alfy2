import { z } from "zod";

/**
 * Acquisition Engine. For any opportunity, evaluates every path to capture it — build, buy, partner,
 * license, white-label, acquire, invest, or ignore — scoring each on time, cost, revenue, risk, leverage,
 * complexity, and strategic value, then recommends one. Teaches Alfy² to think like a capital allocator.
 * See docs/adr/ADR-0112-acquisition.md. Mirrored in workers.
 */

export const AcquisitionStrategySchema = z.enum([
  "build", "buy", "partner", "license", "white_label", "acquire", "invest", "ignore",
]);
export type AcquisitionStrategy = z.infer<typeof AcquisitionStrategySchema>;

/** Per-strategy signals (each 0..1; time/cost/complexity/risk are costs, the rest are benefits). */
export const StrategySignalsSchema = z.object({
  strategy: AcquisitionStrategySchema,
  time: z.number().min(0).max(1).default(0.5),
  cost: z.number().min(0).max(1).default(0.5),
  revenue: z.number().min(0).max(1).default(0.5),
  risk: z.number().min(0).max(1).default(0.5),
  leverage: z.number().min(0).max(1).default(0.5),
  complexity: z.number().min(0).max(1).default(0.5),
  strategic_value: z.number().min(0).max(1).default(0.5),
  feasible: z.boolean().default(true),
});
export type StrategySignals = z.infer<typeof StrategySignalsSchema>;

export const EvaluateAcquisitionInputSchema = z.object({
  opportunity: z.string().min(1),
  options: z.array(StrategySignalsSchema).min(1),
});
export type EvaluateAcquisitionInput = z.infer<typeof EvaluateAcquisitionInputSchema>;

export const StrategyVerdictSchema = z.object({
  strategy: AcquisitionStrategySchema,
  score: z.number(),
  note: z.string().min(1),
});
export type StrategyVerdict = z.infer<typeof StrategyVerdictSchema>;

/** The capital-allocator verdict across all paths. */
export const AcquisitionEvaluationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  opportunity: z.string().min(1),
  verdicts: z.array(StrategyVerdictSchema).default([]),
  recommendation: AcquisitionStrategySchema,
  reason: z.string().min(1),
  created_at: z.string().datetime(),
});
export type AcquisitionEvaluation = z.infer<typeof AcquisitionEvaluationSchema>;
