import { z } from "zod";

/**
 * Future Me Engine. Represents the interests of Alyssa one, five, and ten years from now. Before major
 * decisions it asks: will Future Alyssa thank Present Alyssa for this; will it reduce future stress; increase
 * future opportunity; become technical debt; create reusable infrastructure; preserve optionality. If Future
 * Alyssa would likely regret the decision, it recommends a better path. Each assessment is APPEND-ONLY. See
 * docs/adr/ADR-0148-future-me.md. Mirrored in workers.
 */

/** The six future-facing signals (0..1). The first three and last two are benefits; tech_debt is a cost. */
export const FutureSignalsSchema = z.object({
  future_thanks: z.number().min(0).max(1).default(0.5),
  reduces_future_stress: z.number().min(0).max(1).default(0.5),
  increases_future_opportunity: z.number().min(0).max(1).default(0.5),
  creates_technical_debt: z.number().min(0).max(1).default(0.3),
  creates_reusable_infrastructure: z.number().min(0).max(1).default(0.5),
  preserves_optionality: z.number().min(0).max(1).default(0.5),
});
export type FutureSignals = z.infer<typeof FutureSignalsSchema>;

export const FutureMeVerdictSchema = z.enum(["future_alyssa_thanks_you", "mixed", "future_alyssa_regrets"]);
export type FutureMeVerdict = z.infer<typeof FutureMeVerdictSchema>;

export const AssessFutureInputSchema = z.object({
  decision: z.string().min(1),
  signals: FutureSignalsSchema,
});
export type AssessFutureInput = z.infer<typeof AssessFutureInputSchema>;

/** A Future Me assessment of one decision across the 1/5/10-year horizon. Append-only. */
export const FutureMeAssessmentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  decision: z.string().min(1),
  signals: FutureSignalsSchema,
  /** 0..1 — likelihood Future Alyssa regrets this (high tech debt, low optionality/opportunity). */
  regret_risk: z.number().min(0).max(1),
  verdict: FutureMeVerdictSchema,
  /** A better path when Future Alyssa would likely regret; null when the decision stands. */
  better_path: z.string().nullable().default(null),
  reason: z.string().min(1),
  created_at: z.string().datetime(),
});
export type FutureMeAssessment = z.infer<typeof FutureMeAssessmentSchema>;
