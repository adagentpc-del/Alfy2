import { z } from "zod";

/**
 * Visibility Engine contracts. Increases trust, authority, and inbound opportunities. Tracks posting
 * frequency, reach, engagement, follower / podcast / email growth, website traffic, SEO, mentions,
 * backlinks, podcast & speaking invitations, media mentions, PR, and partnerships; computes a per-business
 * Visibility Score; and recommends where/what/when to post, who to collaborate with, which podcasts to
 * appear on, which conferences to speak at, and which awards to apply for. See
 * docs/adr/ADR-0079-visibility-engine.md. Mirrored in workers (Pydantic).
 */

/** The visibility signals fed in (raw counts / 0..1 growth rates). */
export const VisibilitySignalsSchema = z.object({
  posting_frequency_per_week: z.number().nonnegative().default(0),
  reach: z.number().nonnegative().default(0),
  engagement_rate: z.number().min(0).max(1).default(0),
  follower_growth: z.number().min(0).max(1).default(0),
  podcast_growth: z.number().min(0).max(1).default(0),
  email_growth: z.number().min(0).max(1).default(0),
  website_traffic: z.number().nonnegative().default(0),
  seo_score: z.number().min(0).max(1).default(0),
  mentions: z.number().int().nonnegative().default(0),
  backlinks: z.number().int().nonnegative().default(0),
  podcast_invitations: z.number().int().nonnegative().default(0),
  speaking_invitations: z.number().int().nonnegative().default(0),
  media_mentions: z.number().int().nonnegative().default(0),
  partnerships: z.number().int().nonnegative().default(0),
});
export type VisibilitySignals = z.infer<typeof VisibilitySignalsSchema>;

export const VisibilityInputSchema = z.object({
  business_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  signals: VisibilitySignalsSchema,
});
export type VisibilityInput = z.infer<typeof VisibilityInputSchema>;

/** A visibility report with score and recommendations. */
export const VisibilityReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_name: z.string().min(1),
  /** 0..1 composite visibility score. */
  visibility_score: z.number().min(0).max(1),
  where_to_post: z.array(z.string()).default([]),
  what_to_post: z.array(z.string()).default([]),
  when_to_post: z.string().default(""),
  collaborators: z.array(z.string()).default([]),
  podcasts_to_appear_on: z.array(z.string()).default([]),
  conferences_to_speak_at: z.array(z.string()).default([]),
  awards_to_apply_for: z.array(z.string()).default([]),
  weakest_signals: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type VisibilityReport = z.infer<typeof VisibilityReportSchema>;
