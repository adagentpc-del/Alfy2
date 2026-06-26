import { z } from "zod";

/**
 * Briefing Engine contracts. Four executive briefings assembled from already-summarized inputs:
 * - morning: today's priorities, revenue, follow-ups, blocked, calendar, news lanes, agent recs (5 min).
 * - lunch: a learning/intelligence update — top 3 worth reading, why, action, save/research/implement.
 * - evening: close the day — wins/losses/money, what didn't move, follow-ups, lessons, tomorrow; saves
 *   important reflections to Institutional Memory.
 * - weekly: a strategic intelligence report — opportunities, risks, updates, predictions, next-week focus.
 * See docs/adr/ADR-0070-briefing-engine.md. Mirrored in workers (Pydantic).
 */

export const BriefingKindSchema = z.enum(["morning", "lunch", "evening", "weekly"]);
export type BriefingKind = z.infer<typeof BriefingKindSchema>;

/** A briefing section: a heading and its lines. */
export const BriefingSectionSchema = z.object({
  heading: z.string().min(1),
  items: z.array(z.string()).default([]),
});
export type BriefingSection = z.infer<typeof BriefingSectionSchema>;

/** The inputs fed to a briefing (a flexible bag of labeled lists). */
export const BriefingInputSchema = z.object({
  kind: BriefingKindSchema,
  date_label: z.string().default(""),
  /** Labeled lists, e.g. {priorities: [...], revenue_opportunities: [...], reading: [...]}. */
  sections: z.record(z.string(), z.array(z.string())).default({}),
  /** Evening only: reflections to persist to Institutional Memory. */
  reflections: z.array(z.string()).default([]),
});
export type BriefingInput = z.infer<typeof BriefingInputSchema>;

/** An assembled briefing. */
export const BriefingSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: BriefingKindSchema,
  date_label: z.string().default(""),
  greeting: z.string().min(1),
  sections: z.array(BriefingSectionSchema).default([]),
  /** Evening only: questions to answer to close the day. */
  questions: z.array(z.string()).default([]),
  estimated_reading_minutes: z.number().nonnegative(),
  saved_reflection_count: z.number().int().nonnegative().default(0),
  created_at: z.string().datetime(),
});
export type Briefing = z.infer<typeof BriefingSchema>;
