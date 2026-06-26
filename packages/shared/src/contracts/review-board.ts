import { z } from "zod";

/**
 * Executive Review Board contracts. Before any major strategic recommendation, a virtual board convenes —
 * each reviewer (CEO, CFO, COO, CTO, CMO, Chief Legal Officer, Chief Risk Officer, Chief Security Officer,
 * Chief Product Officer, Chief Customer Officer) independently evaluates benefits, risks, blind spots,
 * dependencies, costs, and operational impact. The board then synthesizes a final recommendation and
 * HIGHLIGHTS disagreements rather than forcing consensus. See docs/adr/ADR-0092-review-board.md. Mirrored.
 */

export const ReviewerRoleSchema = z.enum([
  "ceo", "cfo", "coo", "cto", "cmo", "clo", "cro", "cso", "cpo", "cco",
]);
export type ReviewerRole = z.infer<typeof ReviewerRoleSchema>;

/** Signals the board reads about the proposal (each 0..1). */
export const ProposalSignalsSchema = z.object({
  revenue_upside: z.number().min(0).max(1).default(0.5),
  cost: z.number().min(0).max(1).default(0.5),
  risk: z.number().min(0).max(1).default(0.5),
  legal_exposure: z.number().min(0).max(1).default(0.3),
  security_exposure: z.number().min(0).max(1).default(0.3),
  operational_load: z.number().min(0).max(1).default(0.5),
  customer_impact: z.number().min(0).max(1).default(0.5),
  product_fit: z.number().min(0).max(1).default(0.5),
  technical_complexity: z.number().min(0).max(1).default(0.5),
});
export type ProposalSignals = z.infer<typeof ProposalSignalsSchema>;

export const ConveneBoardInputSchema = z.object({
  proposal: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  signals: ProposalSignalsSchema,
});
export type ConveneBoardInput = z.infer<typeof ConveneBoardInputSchema>;

/** One reviewer's independent verdict. */
export const ReviewerVerdictSchema = z.object({
  role: ReviewerRoleSchema,
  /** approve / approve_with_conditions / reject. */
  stance: z.enum(["approve", "approve_with_conditions", "reject"]),
  benefits: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  blind_spots: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  costs: z.array(z.string()).default([]),
  operational_impact: z.string().default(""),
});
export type ReviewerVerdict = z.infer<typeof ReviewerVerdictSchema>;

/** The board's synthesized result. */
export const BoardReviewSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  proposal: z.string().min(1),
  verdicts: z.array(ReviewerVerdictSchema).default([]),
  approvals: z.number().int().nonnegative(),
  rejections: z.number().int().nonnegative(),
  /** Disagreements are highlighted, not smoothed over. */
  disagreements: z.array(z.string()).default([]),
  synthesis: z.string().min(1),
  final_recommendation: z.string().min(1),
  created_at: z.string().datetime(),
});
export type BoardReview = z.infer<typeof BoardReviewSchema>;
