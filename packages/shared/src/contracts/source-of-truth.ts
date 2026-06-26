import { z } from "zod";

/**
 * Source-of-Truth Management contracts. Alfy² distinguishes what kind of knowledge each memory is —
 * verified facts, assumptions, outdated information, user preferences, inferred patterns, external
 * research, documents, contacts, and financial data — and every important memory carries its source,
 * confidence, freshness, owner, last-verified date, and an update trigger. See
 * docs/adr/ADR-0026-source-of-truth-management.md. Mirrored in workers (Pydantic).
 */

/** The nine kinds of knowledge the engine distinguishes. */
export const FactKindSchema = z.enum([
  "verified_fact",
  "assumption",
  "outdated",
  "user_preference",
  "inferred_pattern",
  "external_research",
  "document",
  "contact",
  "financial_data",
]);
export type FactKind = z.infer<typeof FactKindSchema>;

/** How current a record is. */
export const FreshnessSchema = z.enum(["fresh", "aging", "stale", "expired"]);
export type Freshness = z.infer<typeof FreshnessSchema>;

/** A tracked piece of truth with full provenance. */
export const SourceRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: FactKindSchema,
  /** The claim/fact/value itself. */
  statement: z.string().min(1),
  /** Where it came from (a person, a document, a connector, a research source). */
  source: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.5),
  owner: z.string().min(1),
  last_verified_at: z.string().datetime().nullable().default(null),
  freshness: FreshnessSchema.default("fresh"),
  /** What should trigger re-verification (e.g. "quarterly", "on price change"). */
  update_trigger: z.string().default(""),
  /** Optional link to the Memory Engine record this annotates. */
  memory_id: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type SourceRecord = z.infer<typeof SourceRecordSchema>;

/** Input to record a piece of truth. */
export const RecordTruthInputSchema = z.object({
  kind: FactKindSchema,
  statement: z.string().min(1),
  source: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.5),
  owner: z.string().min(1),
  last_verified_at: z.string().datetime().nullable().default(null),
  update_trigger: z.string().default(""),
  memory_id: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
});
export type RecordTruthInput = z.infer<typeof RecordTruthInputSchema>;
