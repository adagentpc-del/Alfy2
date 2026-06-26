import { z } from "zod";

/**
 * Executive Decision Journal contracts. Records every major decision — the decision, alternatives,
 * reasoning, data available, assumptions, risks, and expected outcome — then schedules reviews at 30, 90,
 * and 365 days to record the actual outcome and lessons learned, improving future recommendations and
 * surfacing recurring decision patterns. See docs/adr/ADR-0090-decision-journal.md. Mirrored in workers.
 */

export const JournalReviewWindowSchema = z.enum(["30_day", "90_day", "1_year"]);
export type JournalReviewWindow = z.infer<typeof JournalReviewWindowSchema>;

export const RecordDecisionInputSchema = z.object({
  decision: z.string().min(1),
  alternatives: z.array(z.string()).default([]),
  reasoning: z.string().default(""),
  data_available: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  expected_outcome: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
  /** A tag for pattern detection (e.g. "hiring", "pricing"). */
  category: z.string().default(""),
});
export type RecordDecisionInput = z.infer<typeof RecordDecisionInputSchema>;

/** A journaled decision with its review schedule and (later) outcome. */
export const JournaledDecisionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  decision: z.string().min(1),
  alternatives: z.array(z.string()).default([]),
  reasoning: z.string().default(""),
  data_available: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  expected_outcome: z.string().default(""),
  category: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
  /** Filled in at review time. */
  actual_outcome: z.string().default(""),
  lessons_learned: z.array(z.string()).default([]),
  /** Review due-dates by window. */
  reviews_due: z.record(z.string(), z.string()).default({}),
  reviewed_windows: z.array(JournalReviewWindowSchema).default([]),
  decided_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type JournaledDecision = z.infer<typeof JournaledDecisionSchema>;

export const ReviewDecisionInputSchema = z.object({
  window: JournalReviewWindowSchema,
  actual_outcome: z.string().min(1),
  lessons_learned: z.array(z.string()).default([]),
});
export type ReviewDecisionInput = z.infer<typeof ReviewDecisionInputSchema>;
