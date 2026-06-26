import { z } from "zod";

/**
 * Executive Thought Partner. An independent strategic thinking partner that increases the quality of
 * executive thinking rather than replacing executive judgment. It challenges assumptions respectfully,
 * identifies blind spots, simplifies complexity, recognizes patterns, proposes alternatives, surfaces risks
 * early, explains tradeoffs, and preserves long-term architectural integrity. Rules: never agree
 * automatically, never reject automatically, always support with reasoning, say so under uncertainty, compare
 * when multiple good options exist, and when a decision is already strong, focus on improving execution
 * rather than re-litigating it — unless new evidence materially changes the recommendation. Each response is
 * APPEND-ONLY. See docs/adr/ADR-0150-executive-thought-partner.md. Mirrored in workers.
 */

export const ThoughtStanceSchema = z.enum(["challenge", "support", "compare_options", "refine_execution"]);
export type ThoughtStance = z.infer<typeof ThoughtStanceSchema>;

export const ConsultThoughtPartnerInputSchema = z.object({
  proposition: z.string().min(1),
  context: z.string().default(""),
  /** True when Alyssa has already made a strong decision (shifts the partner toward execution). */
  decision_is_settled: z.boolean().default(false),
  /** True when new evidence has appeared that could reopen a settled decision. */
  new_material_evidence: z.boolean().default(false),
  /** Candidate options, when comparing. */
  options: z.array(z.string()).default([]),
});
export type ConsultThoughtPartnerInput = z.infer<typeof ConsultThoughtPartnerInputSchema>;

/** The thought partner's structured response. Append-only. */
export const ThoughtPartnerResponseSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  proposition: z.string().min(1),
  stance: ThoughtStanceSchema,
  challenged_assumptions: z.array(z.string()).default([]),
  blind_spots: z.array(z.string()).default([]),
  alternatives: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  tradeoffs: z.array(z.string()).default([]),
  /** Honest uncertainty — true when the partner is not confident, with the reason why. */
  uncertain: z.boolean().default(false),
  /** The reasoning behind the stance — always present; the partner never just agrees or rejects. */
  reasoning: z.string().min(1),
  created_at: z.string().datetime(),
});
export type ThoughtPartnerResponse = z.infer<typeof ThoughtPartnerResponseSchema>;
