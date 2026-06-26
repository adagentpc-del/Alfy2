import { z } from "zod";

/**
 * Capital Engine. Measures and grows every form of capital available to Alyssa, optimizing for lifetime
 * capital accumulation rather than short-term activity. For every recommendation it reports how much of
 * each capital increases or decreases, the compounding effect, the payoff horizon, and how capital can
 * convert into other forms. See docs/adr/ADR-0108-capital-engine.md. Mirrored in workers.
 */

/** The ten forms of capital. */
export const CapitalTypeSchema = z.enum([
  "financial", "knowledge", "relationship", "reputation", "operational",
  "technology", "automation", "intellectual_property", "health_energy", "freedom",
]);
export type CapitalType = z.infer<typeof CapitalTypeSchema>;

/** Per-capital deltas, each -1..1 (negative = depletes). */
export const CapitalDeltasSchema = z.object({
  financial: z.number().min(-1).max(1).default(0),
  knowledge: z.number().min(-1).max(1).default(0),
  relationship: z.number().min(-1).max(1).default(0),
  reputation: z.number().min(-1).max(1).default(0),
  operational: z.number().min(-1).max(1).default(0),
  technology: z.number().min(-1).max(1).default(0),
  automation: z.number().min(-1).max(1).default(0),
  intellectual_property: z.number().min(-1).max(1).default(0),
  health_energy: z.number().min(-1).max(1).default(0),
  freedom: z.number().min(-1).max(1).default(0),
});
export type CapitalDeltas = z.infer<typeof CapitalDeltasSchema>;

export const CapitalReportInputSchema = z.object({
  recommendation: z.string().min(1),
  deltas: CapitalDeltasSchema,
  /** 0..1 — how strongly the gains compound. */
  compounding: z.number().min(0).max(1).default(0.5),
  payoff_months: z.number().nonnegative().default(0),
});
export type CapitalReportInput = z.infer<typeof CapitalReportInputSchema>;

/** A capital growth report. */
export const CapitalReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  recommendation: z.string().min(1),
  deltas: CapitalDeltasSchema,
  /** Capital types that grow / that deplete. */
  increases: z.array(CapitalTypeSchema).default([]),
  decreases: z.array(CapitalTypeSchema).default([]),
  /** Net capital change across all forms, -1..1. */
  net_capital: z.number().min(-1).max(1),
  compounding: z.number().min(0).max(1),
  payoff_months: z.number().nonnegative(),
  /** Plausible conversions, e.g. "reputation → relationships → clients → revenue → freedom". */
  conversion_paths: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type CapitalReport = z.infer<typeof CapitalReportSchema>;
