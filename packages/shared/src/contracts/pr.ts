import { z } from "zod";

/**
 * PR contracts. PR is now a standard department for every business (added to the Business Template). For
 * every business the PR generator produces a PR strategy: media angles, target publications, podcast
 * targets, a founder story angle, credibility proof, a press-kit checklist, outreach templates, and
 * reputation risks. See docs/adr/ADR-0073-pr-department.md. Mirrored in workers (Pydantic).
 */

export const GeneratePrInputSchema = z.object({
  business_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  /** One-line description of what the business does (shapes the angles). */
  description: z.string().default(""),
  founder_name: z.string().default("Alyssa DelTorre"),
  industry: z.string().default(""),
});
export type GeneratePrInput = z.infer<typeof GeneratePrInputSchema>;

/** A business's PR strategy. */
export const PrStrategySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  media_angles: z.array(z.string()).default([]),
  target_publications: z.array(z.string()).default([]),
  podcast_targets: z.array(z.string()).default([]),
  founder_story_angle: z.string().min(1),
  credibility_proof: z.array(z.string()).default([]),
  press_kit_checklist: z.array(z.string()).default([]),
  outreach_templates: z.array(z.string()).default([]),
  reputation_risks: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type PrStrategy = z.infer<typeof PrStrategySchema>;
