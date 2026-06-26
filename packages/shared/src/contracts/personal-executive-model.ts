import { z } from "zod";

/**
 * Personal Executive Model (PEM). Continuously learns how Alyssa operates so recommendations become
 * increasingly personalized WITHOUT replacing her judgment. It does not imitate Alyssa — it amplifies her
 * ability to make excellent decisions while preserving her agency. The model is EXPLAINABLE by construction:
 * for every major recommendation it can answer why Alyssa will likely prefer it, which observed patterns
 * informed it, how confident it is, and what evidence is missing. The model is MUTABLE — it evolves through
 * explicit feedback, observed outcomes, and recurring behavior. See docs/adr/ADR-0128-personal-executive-model.md.
 * Mirrored in workers.
 */

/** The dimensions of Alyssa's operating style the PEM learns. */
export const PemDimensionSchema = z.enum([
  "decision_patterns", "communication_style", "opportunity_recognition", "risk_tolerance",
  "energy_patterns", "preferred_workflows", "approval_habits", "strategic_priorities",
  "recurring_bottlenecks", "values", "long_term_mission",
]);
export type PemDimension = z.infer<typeof PemDimensionSchema>;

/** How a learned trait entered the model — feedback weighs most, then outcomes, then observed behavior. */
export const PemEvidenceSourceSchema = z.enum(["explicit_feedback", "observed_outcome", "recurring_behavior"]);
export type PemEvidenceSource = z.infer<typeof PemEvidenceSourceSchema>;

/** One learned trait along a dimension, with its confidence and how it was learned. */
export const PemTraitSchema = z.object({
  dimension: PemDimensionSchema,
  statement: z.string().min(1),
  /** 0..1 — confidence in this trait. */
  confidence: z.number().min(0).max(1),
  source: PemEvidenceSourceSchema,
  /** Pointers to the decisions / outcomes / observations that support it. */
  evidence_refs: z.array(z.string()).default([]),
});
export type PemTrait = z.infer<typeof PemTraitSchema>;

export const ObservePemInputSchema = z.object({
  dimension: PemDimensionSchema,
  statement: z.string().min(1),
  source: PemEvidenceSourceSchema,
  confidence: z.number().min(0).max(1).default(0.5),
  evidence_refs: z.array(z.string()).default([]),
});
export type ObservePemInput = z.infer<typeof ObservePemInputSchema>;

/**
 * The mandatory explanation attached to every major personalized recommendation. Without it, the
 * recommendation is not allowed to claim personalization — agency is preserved by transparency.
 */
export const PemExplanationSchema = z.object({
  /** Why I think Alyssa will prefer this. */
  why_preferred: z.string().min(1),
  /** Which observed patterns informed this recommendation. */
  informing_patterns: z.array(z.string()).default([]),
  /** 0..1 — how confident I am. */
  confidence: z.number().min(0).max(1),
  /** What evidence is missing (honest gaps). */
  evidence_missing: z.array(z.string()).default([]),
});
export type PemExplanation = z.infer<typeof PemExplanationSchema>;

/** The current Personal Executive Model — the learned operating profile. Mutable; evolves over time. */
export const PersonalExecutiveModelSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  traits: z.array(PemTraitSchema).default([]),
  /** Invariant: amplify, never imitate; never replaces Alyssa's judgment. */
  amplifies_not_imitates: z.literal(true).default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type PersonalExecutiveModel = z.infer<typeof PersonalExecutiveModelSchema>;
