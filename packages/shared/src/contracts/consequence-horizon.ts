import { z } from "zod";

/**
 * Consequence Horizon Engine. Estimates the second- and third-order consequences of a decision across
 * immediate, 30-day, 90-day, 1-year, and 5-year horizons — asking "if Alyssa makes this decision today,
 * what doors open later?" — so Alfy² optimizes for long-term leverage, not just immediate results. See
 * docs/adr/ADR-0109-consequence-horizon.md. Mirrored in workers.
 */

export const HorizonSchema = z.enum(["immediate", "30_day", "90_day", "1_year", "5_year"]);
export type Horizon = z.infer<typeof HorizonSchema>;

export const ProjectConsequencesInputSchema = z.object({
  decision: z.string().min(1),
  /** 0..1 — direct, near-term benefit. */
  immediate_value: z.number().min(0).max(1).default(0.5),
  /** 0..1 — how much this compounds / opens future doors. */
  compounding: z.number().min(0).max(1).default(0.5),
  /** Free-text downstream doors this could open (relationships, deals, ventures). */
  doors: z.array(z.string()).default([]),
});
export type ProjectConsequencesInput = z.infer<typeof ProjectConsequencesInputSchema>;

export const HorizonImpactSchema = z.object({
  horizon: HorizonSchema,
  /** 0..1 — projected value at this horizon. */
  value: z.number().min(0).max(1),
  note: z.string().default(""),
});
export type HorizonImpact = z.infer<typeof HorizonImpactSchema>;

/** A consequence projection. */
export const ConsequenceProjectionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  decision: z.string().min(1),
  horizons: z.array(HorizonImpactSchema).default([]),
  doors_opened: z.array(z.string()).default([]),
  /** 0..1 — long-term leverage (weights later horizons heavier). */
  long_term_leverage: z.number().min(0).max(1),
  recommendation: z.string().min(1),
  created_at: z.string().datetime(),
});
export type ConsequenceProjection = z.infer<typeof ConsequenceProjectionSchema>;
