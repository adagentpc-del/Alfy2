import { z } from "zod";

/**
 * Executive Intelligence Network (EIN) contracts. Continuously monitors external information and converts
 * it into actionable executive intelligence — not summaries. Each article is scored across ten dimensions
 * and classified (ignore / interesting / monitor / research / immediate_action); each intelligence item
 * states why it matters, which businesses and goals it affects, immediate actions, future implications,
 * confidence, sources, related past briefings, and follow-ups. Developing stories become ONE living
 * briefing with a timeline — Alyssa never rereads the same story twice. See
 * docs/adr/ADR-0067-intelligence-network.md. Mirrored in workers (Pydantic).
 */

export const IntelClassificationSchema = z.enum([
  "ignore",
  "interesting",
  "monitor",
  "research",
  "immediate_action",
]);
export type IntelClassification = z.infer<typeof IntelClassificationSchema>;

/** The ten article scores, each 0..1 (reading time is minutes). */
export const ArticleScoresSchema = z.object({
  importance: z.number().min(0).max(1),
  urgency: z.number().min(0).max(1),
  opportunity: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),
  revenue_potential: z.number().min(0).max(1),
  innovation: z.number().min(0).max(1),
  implementation_difficulty: z.number().min(0).max(1),
  compliance_risk: z.number().min(0).max(1),
  strategic_value: z.number().min(0).max(1),
  long_term_impact: z.number().min(0).max(1),
  recommended_reading_minutes: z.number().nonnegative(),
});
export type ArticleScores = z.infer<typeof ArticleScoresSchema>;

/** Raw article input for scoring/assessment. */
export const ArticleInputSchema = z.object({
  title: z.string().min(1),
  body: z.string().default(""),
  source: z.string().default(""),
  url: z.string().default(""),
  /** Free-text business names this might affect (matched against the body). */
  businesses: z.array(z.string()).default([]),
  /** Pre-scored signals 0..1 (importance/urgency/opportunity/risk/...); the engine fills gaps. */
  signals: z.record(z.string(), z.number()).default({}),
  /** Story key — items sharing a key roll into one living briefing. */
  story_key: z.string().default(""),
});
export type ArticleInput = z.infer<typeof ArticleInputSchema>;

/** A full intelligence item. */
export const IntelligenceItemSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  title: z.string().min(1),
  executive_summary: z.string().min(1),
  deep_dive: z.string().default(""),
  why_it_matters: z.string().min(1),
  businesses_affected: z.array(z.string()).default([]),
  goals_affected: z.array(z.string()).default([]),
  agents_to_notify: z.array(z.string()).default([]),
  immediate_actions: z.array(z.string()).default([]),
  future_implications: z.array(z.string()).default([]),
  scores: ArticleScoresSchema,
  classification: IntelClassificationSchema,
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()).default([]),
  related_briefing_id: z.string().uuid().nullable().default(null),
  follow_up_recommendations: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type IntelligenceItem = z.infer<typeof IntelligenceItemSchema>;

/** One entry on a living briefing's timeline. */
export const BriefingTimelineEntrySchema = z.object({
  at: z.string().datetime(),
  headline: z.string().min(1),
  note: z.string().default(""),
});
export type BriefingTimelineEntry = z.infer<typeof BriefingTimelineEntrySchema>;

/** A living briefing — one evolving record for a developing story. */
export const LivingBriefingSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  story_key: z.string().min(1),
  title: z.string().min(1),
  current_state: z.string().min(1),
  timeline: z.array(BriefingTimelineEntrySchema).default([]),
  businesses_affected: z.array(z.string()).default([]),
  updated_at: z.string().datetime(),
  created_at: z.string().datetime(),
});
export type LivingBriefing = z.infer<typeof LivingBriefingSchema>;
