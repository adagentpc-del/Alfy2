import { z } from "zod";

/**
 * Optionality Engine. Preserves and creates future choices. It evaluates each path by how many future
 * opportunities it creates versus eliminates, and prefers paths that increase flexibility, increase reusable
 * assets, increase strategic options, avoid unnecessary lock-in, and support multiple future directions. When
 * multiple paths have similar expected value, it prefers the one with the greatest long-term optionality.
 * Each assessment is APPEND-ONLY. See docs/adr/ADR-0149-optionality.md. Mirrored in workers.
 */

/** One path's optionality signals. */
export const OptionalityPathSchema = z.object({
  path: z.string().min(1),
  /** Roughly comparable expected value across paths (0..1), used for the tie-break rule. */
  expected_value: z.number().min(0).max(1).default(0.5),
  opportunities_created: z.number().int().min(0).default(0),
  opportunities_eliminated: z.number().int().min(0).default(0),
  flexibility: z.number().min(0).max(1).default(0.5),
  reusable_assets: z.number().min(0).max(1).default(0.5),
  strategic_options: z.number().min(0).max(1).default(0.5),
  /** 0..1 — how much it locks the system in (a cost). */
  lock_in: z.number().min(0).max(1).default(0.3),
});
export type OptionalityPath = z.infer<typeof OptionalityPathSchema>;

export const AssessOptionalityInputSchema = z.object({
  decision: z.string().min(1),
  paths: z.array(OptionalityPathSchema).min(1),
});
export type AssessOptionalityInput = z.infer<typeof AssessOptionalityInputSchema>;

/** One path's scored optionality. */
export const OptionalityVerdictSchema = z.object({
  path: z.string().min(1),
  /** 0..1 — long-term optionality (net opportunities + flexibility + reuse + options, minus lock-in). */
  optionality_score: z.number(),
  note: z.string().min(1),
});
export type OptionalityVerdict = z.infer<typeof OptionalityVerdictSchema>;

/** An optionality assessment across the candidate paths. Append-only. */
export const OptionalityAssessmentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  decision: z.string().min(1),
  verdicts: z.array(OptionalityVerdictSchema).default([]),
  /** The recommended path — highest optionality (and, on an EV tie, the one preserving the most choices). */
  recommended_path: z.string().min(1),
  reason: z.string().min(1),
  created_at: z.string().datetime(),
});
export type OptionalityAssessment = z.infer<typeof OptionalityAssessmentSchema>;
