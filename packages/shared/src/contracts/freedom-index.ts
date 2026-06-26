import { z } from "zod";

/**
 * Founder Freedom Index. Measures whether Alfy² is succeeding — scoring how much time, decision load, and
 * stress it removes while preserving revenue and returning life. 0–100, with trend, biggest bottleneck, and
 * a recommendation; the goal is to increase freedom every month. See docs/adr/ADR-0114-freedom-index.md.
 */

export const FreedomTrendSchema = z.enum(["increasing", "flat", "decreasing"]);
export type FreedomTrend = z.infer<typeof FreedomTrendSchema>;

export const FreedomIndexInputSchema = z.object({
  period_label: z.string().min(1),
  hours_delegated: z.number().nonnegative().default(0),
  hours_automated: z.number().nonnegative().default(0),
  hours_saved: z.number().nonnegative().default(0),
  /** 0..1 — founder decision load (higher = worse). */
  decision_load: z.number().min(0).max(1).default(0.5),
  meetings_avoided: z.number().int().nonnegative().default(0),
  follow_ups_automated: z.number().int().nonnegative().default(0),
  content_automated: z.number().int().nonnegative().default(0),
  /** Revenue produced per founder hour (USD). */
  revenue_per_founder_hour: z.number().nonnegative().default(0),
  /** 0..1 — stress (higher = worse). */
  stress: z.number().min(0).max(1).default(0.5),
  /** 0..1 quality-of-life signals (higher = better). */
  recovery_time: z.number().min(0).max(1).default(0.5),
  family_time: z.number().min(0).max(1).default(0.5),
  creative_work: z.number().min(0).max(1).default(0.5),
  outdoor_time: z.number().min(0).max(1).default(0.5),
  /** Prior month's score for trend (null on first reading). */
  previous_score: z.number().min(0).max(100).nullable().default(null),
});
export type FreedomIndexInput = z.infer<typeof FreedomIndexInputSchema>;

/** A monthly freedom reading. */
export const FreedomIndexReadingSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  period_label: z.string().min(1),
  /** 0–100. */
  score: z.number().min(0).max(100),
  trend: FreedomTrendSchema,
  biggest_bottleneck: z.string().min(1),
  recommendation: z.string().min(1),
  created_at: z.string().datetime(),
});
export type FreedomIndexReading = z.infer<typeof FreedomIndexReadingSchema>;
