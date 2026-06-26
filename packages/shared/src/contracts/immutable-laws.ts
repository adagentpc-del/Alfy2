import { z } from "zod";

/**
 * The Five Immutable Laws of Alfy². Every future feature, agent, workflow, algorithm, connector, automation,
 * and recommendation must satisfy these laws, and every major recommendation must explain how. See
 * docs/adr/ADR-0087-immutable-laws.md. Mirrored in workers (Pydantic).
 */

export const LawIdSchema = z.enum([
  "protect_the_human",
  "compound_everything",
  "allocate_capital_intelligently",
  "prefer_systems_over_heroics",
  "increase_founder_freedom",
]);
export type LawId = z.infer<typeof LawIdSchema>;

export const ImmutableLawSchema = z.object({
  id: LawIdSchema,
  number: z.number().int().min(1).max(5),
  title: z.string().min(1),
  text: z.string().min(1),
});
export type ImmutableLaw = z.infer<typeof ImmutableLawSchema>;

/** A recommendation checked against the laws. */
export const LawCheckInputSchema = z.object({
  recommendation: z.string().min(1),
  /** Does it risk Alyssa's health, integrity, relationships, or long-term goals? (Law 1) */
  harms_human: z.boolean().default(false),
  /** Does it produce reusable IP where practical? (Law 2) */
  produces_reusable_ip: z.boolean().default(false),
  /** Does it weigh time/money/energy/attention/reputation/knowledge/relationships/trust? (Law 3) */
  considers_capital_allocation: z.boolean().default(false),
  /** Is this a repeat problem better solved by a system than manual effort? (Law 4) */
  is_repeat_problem: z.boolean().default(false),
  builds_system: z.boolean().default(false),
  /** Does it increase founder freedom while maintaining/improving performance? (Law 5) */
  increases_freedom: z.boolean().default(false),
});
export type LawCheckInput = z.infer<typeof LawCheckInputSchema>;

export const LawVerdictSchema = z.object({
  law: LawIdSchema,
  satisfied: z.boolean(),
  note: z.string().min(1),
});
export type LawVerdict = z.infer<typeof LawVerdictSchema>;

export const LawComplianceSchema = z.object({
  compliant: z.boolean(),
  verdicts: z.array(LawVerdictSchema),
  violations: z.array(LawIdSchema).default([]),
  /** The mandatory explanation of how the recommendation satisfies the laws. */
  explanation: z.string().min(1),
});
export type LawCompliance = z.infer<typeof LawComplianceSchema>;
