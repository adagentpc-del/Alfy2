import { z } from "zod";

/**
 * The Alfy² Pyramid. Every feature must move up the value pyramid: Capture → Organize → Understand →
 * Recommend → Execute → Compound → Multiply → Freedom. The engine classifies where a feature/output sits
 * and recommends the next level up. See docs/adr/ADR-0110-pyramid.md. Mirrored in workers.
 */

/** The eight pyramid levels, lowest → highest. */
export const PyramidLevelSchema = z.enum([
  "capture", "organize", "understand", "recommend", "execute", "compound", "multiply", "freedom",
]);
export type PyramidLevel = z.infer<typeof PyramidLevelSchema>;

export const ClassifyPyramidInputSchema = z.object({
  feature: z.string().min(1),
  /** 0..1 capability signals — what the feature currently does. */
  captures: z.number().min(0).max(1).default(0),
  organizes: z.number().min(0).max(1).default(0),
  understands: z.number().min(0).max(1).default(0),
  recommends: z.number().min(0).max(1).default(0),
  executes: z.number().min(0).max(1).default(0),
  compounds: z.number().min(0).max(1).default(0),
  multiplies: z.number().min(0).max(1).default(0),
  creates_freedom: z.number().min(0).max(1).default(0),
});
export type ClassifyPyramidInput = z.infer<typeof ClassifyPyramidInputSchema>;

/** A pyramid placement. */
export const PyramidPlacementSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  feature: z.string().min(1),
  /** The highest level the feature currently reaches. */
  current_level: PyramidLevelSchema,
  /** The next level up to aim for (null at the top). */
  next_level: PyramidLevelSchema.nullable().default(null),
  /** How to move it up a level. */
  how_to_advance: z.string().min(1),
  created_at: z.string().datetime(),
});
export type PyramidPlacement = z.infer<typeof PyramidPlacementSchema>;
