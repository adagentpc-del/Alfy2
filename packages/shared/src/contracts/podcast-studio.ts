import { z } from "zod";

/**
 * Podcast Studio OS contracts. Manages the entire operation of "Decoded with Alyssa DelTorre" from idea
 * to published episode to monetization. For every episode idea it generates a title, hook, premise, why
 * now, target audience, key story, talking points, guest fit, business tie-in, monetization angle, clips,
 * CTA, related businesses, and assets needed. Inputs come from the Executive Intelligence Network, business
 * updates, the failure/trends databases, and more. See docs/adr/ADR-0071-podcast-studio.md. Mirrored in
 * workers (Pydantic).
 */

export const PODCAST_NAME = "Decoded with Alyssa DelTorre";

export const EpisodeStageSchema = z.enum([
  "idea",
  "researched",
  "scheduled",
  "recorded",
  "produced",
  "published",
]);
export type EpisodeStage = z.infer<typeof EpisodeStageSchema>;

export const EpisodeIdeaInputSchema = z.object({
  topic: z.string().min(1),
  /** Where the idea came from (e.g. "intelligence_network", "failure_database"). */
  source: z.string().default(""),
  angle: z.string().default(""),
  related_businesses: z.array(z.string()).default([]),
  guest_name: z.string().default(""),
});
export type EpisodeIdeaInput = z.infer<typeof EpisodeIdeaInputSchema>;

/** A fully fleshed episode plan. */
export const EpisodePlanSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  stage: EpisodeStageSchema.default("idea"),
  title: z.string().min(1),
  hook: z.string().min(1),
  premise: z.string().min(1),
  why_now: z.string().min(1),
  target_audience: z.string().default(""),
  key_story: z.string().default(""),
  talking_points: z.array(z.string()).default([]),
  guest_fit: z.string().default(""),
  business_tie_in: z.string().default(""),
  monetization_angle: z.string().default(""),
  clips_to_create: z.array(z.string()).default([]),
  cta: z.string().default(""),
  related_businesses: z.array(z.string()).default([]),
  assets_needed: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type EpisodePlan = z.infer<typeof EpisodePlanSchema>;
