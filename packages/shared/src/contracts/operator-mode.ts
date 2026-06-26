import { z } from "zod";

/**
 * Billion-Dollar Operator Mode. Evaluates every major recommendation against enterprise-level discipline
 * before the company reaches enterprise scale, asking "Would this still make sense at $100M+/year?" — and
 * if not, recommends the cleaner, scalable version. See docs/adr/ADR-0098-operator-mode.md. Mirrored.
 */

export const OperatorReviewInputSchema = z.object({
  recommendation: z.string().min(1),
  /** Each 0..1. */
  scalability: z.number().min(0).max(1).default(0.5),
  compliance: z.number().min(0).max(1).default(0.5),
  reputation: z.number().min(0).max(1).default(0.5),
  financial_upside: z.number().min(0).max(1).default(0.5),
  downside_risk: z.number().min(0).max(1).default(0.5),
  delegation_potential: z.number().min(0).max(1).default(0.5),
  operational_complexity: z.number().min(0).max(1).default(0.5),
  cash_impact: z.number().min(0).max(1).default(0.5),
  customer_trust: z.number().min(0).max(1).default(0.5),
  legal_exposure: z.number().min(0).max(1).default(0.3),
  founder_freedom: z.number().min(0).max(1).default(0.5),
  long_term_enterprise_value: z.number().min(0).max(1).default(0.5),
});
export type OperatorReviewInput = z.infer<typeof OperatorReviewInputSchema>;

export const OperatorReviewSchema = z.object({
  recommendation: z.string().min(1),
  /** 0..1 — does this scale to $100M+? */
  hundred_m_fit: z.number().min(0).max(1),
  /** True when it would still make sense at enterprise scale. */
  passes: z.boolean(),
  weaknesses: z.array(z.string()).default([]),
  /** The cleaner, scalable version when it doesn't pass. */
  scalable_version: z.string().default(""),
  verdict: z.string().min(1),
});
export type OperatorReview = z.infer<typeof OperatorReviewSchema>;
