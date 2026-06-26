import { z } from "zod";

/**
 * Personal Freedom Engine contracts. Mission: maximize Alyssa's life outside the computer. Tracks hours
 * worked / created / edited / approved and outdoor, exercise, family, friends, travel, learning, creative,
 * and rest time, and continuously recommends automation, delegation, agent creation, workflow improvement,
 * and batch processing. The objective is not maximum work — it's maximum life. Every recommendation answers:
 * "Does this create more freedom while maintaining or increasing business performance?" See
 * docs/adr/ADR-0082-personal-freedom.md. Mirrored in workers (Pydantic).
 */

/** A week's time allocation (hours). */
export const FreedomLogInputSchema = z.object({
  week_label: z.string().default(""),
  hours_working: z.number().nonnegative().default(0),
  hours_creating: z.number().nonnegative().default(0),
  hours_editing: z.number().nonnegative().default(0),
  hours_approving: z.number().nonnegative().default(0),
  hours_outdoors: z.number().nonnegative().default(0),
  hours_exercise: z.number().nonnegative().default(0),
  hours_family: z.number().nonnegative().default(0),
  hours_friends: z.number().nonnegative().default(0),
  hours_travel: z.number().nonnegative().default(0),
  hours_learning: z.number().nonnegative().default(0),
  hours_creative: z.number().nonnegative().default(0),
  hours_rest: z.number().nonnegative().default(0),
});
export type FreedomLogInput = z.infer<typeof FreedomLogInputSchema>;

export const FreedomActionKindSchema = z.enum(["automate", "delegate", "create_agent", "improve_workflow", "batch_process"]);
export type FreedomActionKind = z.infer<typeof FreedomActionKindSchema>;

/** A freedom recommendation — only made when it preserves or improves performance. */
export const FreedomRecommendationSchema = z.object({
  action: FreedomActionKindSchema,
  target: z.string().min(1),
  rationale: z.string().min(1),
  estimated_hours_returned: z.number().nonnegative().default(0),
  /** The mandatory test: does this create more freedom while maintaining/increasing performance? */
  preserves_performance: z.literal(true),
});
export type FreedomRecommendation = z.infer<typeof FreedomRecommendationSchema>;

/** A freedom report. */
export const FreedomReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  week_label: z.string().default(""),
  /** Hours of low-leverage machine work (editing + approving) that should be offloaded. */
  offloadable_hours: z.number().nonnegative(),
  /** Life hours (outdoors/exercise/family/friends/travel/creative/rest). */
  life_hours: z.number().nonnegative(),
  /** 0..1 — share of time spent living vs grinding. */
  freedom_score: z.number().min(0).max(1),
  recommendations: z.array(FreedomRecommendationSchema).default([]),
  created_at: z.string().datetime(),
});
export type FreedomReport = z.infer<typeof FreedomReportSchema>;
