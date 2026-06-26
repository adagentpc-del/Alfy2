import { z } from "zod";

/**
 * Advisory Decision Engine — the structured decision record + reversibility gate of the
 * Decision Engine / Advisory Council (ALFIE2_OPERATIONS_ARCHITECTURE §35).
 *
 * High-impact decisions run through a deterministic set of principle-based LENSES selected by
 * decision type, producing a {@link DecisionRecord}: summary · risks · upside · downside ·
 * assumptions · reversibility · required data · per-lens analysis · recommendation · approval_required.
 * One-way-door (irreversible) decisions ALWAYS require Alyssa's approval; two-way-door low-risk
 * decisions may proceed within configured limits.
 *
 * Lenses convert publicly known business principles into evaluation criteria — no impersonation, no
 * fabricated quotes (Part I §12). All field names are uniquely `Decision*`-prefixed to avoid barrel
 * collisions with the existing `Decision` contract (decision.ts) and the core `DecisionRecord`
 * event-log type. This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 */

// ---------------------------------------------------------------------------
// Enums (uniquely prefixed to avoid barrel collisions)
// ---------------------------------------------------------------------------

/** The 13 principle-based lenses (§35.1) — criteria, not personas. */
export const DecisionLensSchema = z.enum([
  "capital_allocation",
  "inversion_risk",
  "customer_obsession",
  "offer_acquisition",
  "operations_people",
  "leverage_wealth",
  "principles_truth",
  "message_clarity",
  "attention_distribution",
  "funnels",
  "behavioral_economics",
  "cash_discipline",
  "investor_discipline",
]);
export type DecisionLens = z.infer<typeof DecisionLensSchema>;

/** The class of decision being evaluated — drives lens selection and the approval gate. */
export const DecisionTypeSchema = z.enum([
  "pricing",
  "hire",
  "spend",
  "launch",
  "partnership",
  "capital",
  "pivot",
  "legal",
]);
export type DecisionType = z.infer<typeof DecisionTypeSchema>;

/** Reversibility gate: a one-way door is irreversible and always requires approval. */
export const DecisionReversibilitySchema = z.enum(["one_way_door", "two_way_door"]);
export type DecisionReversibility = z.infer<typeof DecisionReversibilitySchema>;

/**
 * Lifecycle of a decision record. NOTE: exported as `DecisionRecordStatus` (not `DecisionStatus`)
 * because `DecisionStatusSchema`/`DecisionStatus` are already taken in the shared barrel by the
 * build-from-brainstorm contract. All other names here are already uniquely `Decision*`-prefixed.
 */
export const DecisionRecordStatusSchema = z.enum(["open", "approved", "rejected", "deferred"]);
export type DecisionRecordStatus = z.infer<typeof DecisionRecordStatusSchema>;

// ---------------------------------------------------------------------------
// Per-lens reading
// ---------------------------------------------------------------------------

/** One lens's structured reading of the decision: a reading, a 0..10 score, and a caution. */
export const DecisionLensReadingSchema = z.object({
  lens: DecisionLensSchema,
  reading: z.string(),
  score: z.number().int().min(0).max(10),
  caution: z.string().default(""),
});
export type DecisionLensReading = z.infer<typeof DecisionLensReadingSchema>;

// ---------------------------------------------------------------------------
// Decision record (the persisted §35.2 record)
// ---------------------------------------------------------------------------

export const DecisionRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid().nullable().default(null),
  title: z.string(),
  summary: z.string().default(""),
  decision_type: DecisionTypeSchema,
  risks: z.array(z.string()).default([]),
  upside: z.string().default(""),
  downside: z.string().default(""),
  assumptions: z.array(z.string()).default([]),
  reversibility: DecisionReversibilitySchema,
  required_data: z.array(z.string()).default([]),
  lens_analysis: z.array(DecisionLensReadingSchema).default([]),
  recommendation: z.string().default(""),
  approval_required: z.boolean().default(true),
  status: DecisionRecordStatusSchema.default("open"),
  created_at: z.string().datetime(),
  updated_at: z.string().nullable().default(null),
  decided_at: z.string().nullable().default(null),
});
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;
