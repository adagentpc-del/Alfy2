import { z } from "zod";

/**
 * Life Dashboard. Measures success beyond business — Founder Freedom Index, Life ROI, time with family,
 * travel, learning, books finished, health trends, exercise, sleep, creative work, relationships, stress,
 * revenue, assets, capital, and personal vs business goals. Its standing message: the businesses exist to
 * support life, not replace it. A pure read-model that composes Freedom Index (ADR-0111) and Life ROI
 * (ADR-0113); it computes a glanceable snapshot and is NOT persisted (no table), like the Flight Deck.
 * See docs/adr/ADR-0134-life-dashboard.md. Mirrored in workers.
 */

/** One displayed life metric with an optional trend. */
export const LifeMetricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  trend: z.enum(["up", "down", "flat", "unknown"]).default("unknown"),
  /** True when this metric is a life metric (vs a business metric) — life is shown first. */
  is_life: z.boolean().default(true),
});
export type LifeMetric = z.infer<typeof LifeMetricSchema>;

export const BuildLifeDashboardInputSchema = z.object({
  /** 0..100 founder freedom index. */
  freedom_index: z.number().min(0).max(100).default(0),
  /** Life ROI score (engine-defined scale). */
  life_roi: z.number().default(0),
  family_hours: z.number().min(0).default(0),
  travel_days: z.number().min(0).default(0),
  learning_hours: z.number().min(0).default(0),
  books_finished: z.number().int().min(0).default(0),
  exercise_sessions: z.number().int().min(0).default(0),
  sleep_quality: z.number().min(0).max(1).default(0.5),
  creative_hours: z.number().min(0).default(0),
  relationships_strong: z.number().int().min(0).default(0),
  stress: z.number().min(0).max(1).default(0.5),
  revenue_usd: z.number().min(0).default(0),
  assets_usd: z.number().min(0).default(0),
  capital_usd: z.number().min(0).default(0),
  personal_goals_on_track: z.number().int().min(0).default(0),
  business_goals_on_track: z.number().int().min(0).default(0),
});
export type BuildLifeDashboardInput = z.infer<typeof BuildLifeDashboardInputSchema>;

/** The computed life snapshot. Read-model — not persisted. */
export const LifeDashboardSchema = z.object({
  /** Life metrics shown first, business metrics after. */
  metrics: z.array(LifeMetricSchema).default([]),
  /** The standing reminder this dashboard exists to deliver. */
  message: z.literal("The businesses exist to support life, not replace it.")
    .default("The businesses exist to support life, not replace it."),
  /** Plain-language read of how life is going right now. */
  summary: z.string().min(1),
});
export type LifeDashboard = z.infer<typeof LifeDashboardSchema>;
