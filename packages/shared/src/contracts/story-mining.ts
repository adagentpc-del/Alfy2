import { z } from "zod";

/**
 * Story Mining Engine contracts (merges Story Mining + Story Intelligence). Monitors business activity,
 * intelligence updates, failures, wins, client stories, meetings, travel, technology, and personal lessons,
 * and turns every experience into a story for podcast episodes, PR angles, social posts, newsletters, sales
 * narratives, investor updates, talks, and case studies — so a good story never disappears. For every story
 * it identifies the hook, conflict, lesson, emotion, transformation, why it matters, audience, business
 * tie-in, CTA, proof needed, best channel, and urgency. See docs/adr/ADR-0074-story-mining.md. Mirrored.
 */

/** Where the raw experience came from. */
export const StorySourceSchema = z.enum([
  "business_activity", "intelligence_update", "failure", "win", "client_story",
  "meeting", "travel", "technology", "personal_lesson", "relationship", "news", "book",
]);
export type StorySource = z.infer<typeof StorySourceSchema>;

/** The channels a story can serve. */
export const StoryChannelSchema = z.enum([
  "podcast", "pr", "social", "newsletter", "sales", "investor_update", "talk", "case_study",
]);
export type StoryChannel = z.infer<typeof StoryChannelSchema>;

export const StoryUrgencySchema = z.enum(["evergreen", "this_month", "this_week", "now"]);
export type StoryUrgency = z.infer<typeof StoryUrgencySchema>;

export const MineStoryInputSchema = z.object({
  source: StorySourceSchema,
  raw: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  businesses: z.array(z.string()).default([]),
  /** Optional steer: which channel(s) this is most likely for. */
  channels: z.array(StoryChannelSchema).default([]),
});
export type MineStoryInput = z.infer<typeof MineStoryInputSchema>;

/** A mined story. */
export const StorySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  source: StorySourceSchema,
  hook: z.string().min(1),
  conflict: z.string().default(""),
  lesson: z.string().default(""),
  emotion: z.string().default(""),
  transformation: z.string().default(""),
  why_it_matters: z.string().min(1),
  audience: z.string().default(""),
  business_tie_in: z.string().default(""),
  cta: z.string().default(""),
  proof_needed: z.array(z.string()).default([]),
  best_channels: z.array(StoryChannelSchema).default([]),
  urgency: StoryUrgencySchema.default("evergreen"),
  business_id: z.string().uuid().nullable().default(null),
  created_at: z.string().datetime(),
});
export type Story = z.infer<typeof StorySchema>;
