import { z } from "zod";

/**
 * Audience Intelligence contracts. Understands every audience by tracking questions, comments, DMs, emails,
 * sales calls, customer feedback, podcast feedback, website searches, and support tickets, and for each
 * audience identifies its biggest fears, biggest goals, the language it uses, objections, desires,
 * misconceptions, favorite content, and best offers — used to continuously improve messaging. See
 * docs/adr/ADR-0081-audience-intelligence.md. Mirrored in workers (Pydantic).
 */

/** The signal channels audience input arrives on. */
export const AudienceSignalKindSchema = z.enum([
  "question", "comment", "dm", "email", "sales_call", "customer_feedback",
  "podcast_feedback", "website_search", "support_ticket",
]);
export type AudienceSignalKind = z.infer<typeof AudienceSignalKindSchema>;

/** One raw audience signal. */
export const AudienceSignalSchema = z.object({
  kind: AudienceSignalKindSchema,
  text: z.string().min(1),
});
export type AudienceSignal = z.infer<typeof AudienceSignalSchema>;

export const AnalyzeAudienceInputSchema = z.object({
  audience_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  signals: z.array(AudienceSignalSchema).default([]),
});
export type AnalyzeAudienceInput = z.infer<typeof AnalyzeAudienceInputSchema>;

/** An audience profile distilled from the signals. */
export const AudienceProfileSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  audience_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  biggest_fears: z.array(z.string()).default([]),
  biggest_goals: z.array(z.string()).default([]),
  language_used: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
  desires: z.array(z.string()).default([]),
  misconceptions: z.array(z.string()).default([]),
  favorite_content: z.array(z.string()).default([]),
  best_offers: z.array(z.string()).default([]),
  /** The single highest-impact messaging change. */
  messaging_recommendation: z.string().min(1),
  signal_count: z.number().int().nonnegative().default(0),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});
export type AudienceProfile = z.infer<typeof AudienceProfileSchema>;
