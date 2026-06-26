import { z } from "zod";

/**
 * The Divini Standard. The quality benchmark every business, feature, workflow, automation, agent,
 * partnership, acquisition, and future company must meet before entering the ecosystem. It scores a proposal
 * across 14 criteria (trust, security, elegance, simplicity, scalability, compounding value, founder freedom,
 * customer value, ethical alignment, financial sustainability, technical quality, documentation, reusability,
 * long-term maintainability) into a Divini Score, then recommends proceed / redesign / reject. Sits alongside
 * the Ultimate Design Rule (ADR-0121) as a higher-resolution gate. Each evaluation is APPEND-ONLY. See
 * docs/adr/ADR-0142-divini-standard.md. Mirrored in workers.
 */

export const DiviniCriterionSchema = z.enum([
  "trust", "security", "elegance", "simplicity", "scalability", "compounding_value", "founder_freedom",
  "customer_value", "ethical_alignment", "financial_sustainability", "technical_quality", "documentation",
  "reusability", "long_term_maintainability",
]);
export type DiviniCriterion = z.infer<typeof DiviniCriterionSchema>;

export const DiviniCriterionScoreSchema = z.object({
  criterion: DiviniCriterionSchema,
  /** 0..1. */
  score: z.number().min(0).max(1),
  note: z.string().default(""),
});
export type DiviniCriterionScore = z.infer<typeof DiviniCriterionScoreSchema>;

export const DiviniRecommendationSchema = z.enum(["proceed", "redesign", "reject"]);
export type DiviniRecommendation = z.infer<typeof DiviniRecommendationSchema>;

export const EvaluateDiviniInputSchema = z.object({
  subject: z.string().min(1),
  subject_kind: z.string().default("feature"),
  criteria: z.array(DiviniCriterionScoreSchema).default([]),
});
export type EvaluateDiviniInput = z.infer<typeof EvaluateDiviniInputSchema>;

/** One Divini Standard evaluation. Append-only. */
export const DiviniEvaluationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  subject: z.string().min(1),
  subject_kind: z.string().default("feature"),
  criteria: z.array(DiviniCriterionScoreSchema).default([]),
  /** 0..1 — the overall Divini Score (weighted across criteria). */
  divini_score: z.number().min(0).max(1),
  recommendation: DiviniRecommendationSchema,
  /** The headline checks: would we still build this as a billion-dollar company; proud in ten years. */
  billion_dollar_worthy: z.boolean(),
  proud_in_ten_years: z.boolean(),
  reason: z.string().min(1),
  created_at: z.string().datetime(),
});
export type DiviniEvaluation = z.infer<typeof DiviniEvaluationSchema>;
