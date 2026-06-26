import { z } from "zod";

/**
 * Institutional Memory contracts. Prevents loss of knowledge by capturing why decisions were made,
 * rejected ideas, failed and successful experiments, negotiation outcomes, lessons learned, vendor
 * experiences, client preferences, and implementation history. Every decision answers: "What did we know
 * at the time, and why did we choose this?" Append-only. See docs/adr/ADR-0057-institutional-memory.md.
 * Mirrored in workers (Pydantic).
 */

/** The nine kinds of institutional record. */
export const InstitutionalRecordKindSchema = z.enum([
  "decision_rationale",
  "rejected_idea",
  "failed_experiment",
  "successful_experiment",
  "negotiation_outcome",
  "lesson_learned",
  "vendor_experience",
  "client_preference",
  "implementation_history",
]);
export type InstitutionalRecordKind = z.infer<typeof InstitutionalRecordKindSchema>;

/** An append-only institutional record. */
export const InstitutionalRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: InstitutionalRecordKindSchema,
  title: z.string().min(1),
  /** The narrative — what happened / what was preferred / what was learned. */
  detail: z.string().default(""),
  /** For decisions: what was known at the time (the basis). */
  what_we_knew: z.string().default(""),
  /** For decisions: why this choice was made. */
  why_chosen: z.string().default(""),
  /** Alternatives considered and rejected. */
  alternatives_rejected: z.array(z.string()).default([]),
  business_id: z.string().uuid().nullable().default(null),
  tags: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type InstitutionalRecord = z.infer<typeof InstitutionalRecordSchema>;

export const CaptureRecordInputSchema = z.object({
  kind: InstitutionalRecordKindSchema,
  title: z.string().min(1),
  detail: z.string().default(""),
  what_we_knew: z.string().default(""),
  why_chosen: z.string().default(""),
  alternatives_rejected: z.array(z.string()).default([]),
  business_id: z.string().uuid().nullable().default(null),
  tags: z.array(z.string()).default([]),
});
export type CaptureRecordInput = z.infer<typeof CaptureRecordInputSchema>;
