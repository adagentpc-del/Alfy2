import { z } from "zod";

/**
 * Confidence-Weighted Agent Council. For high-impact decisions, ten agents evaluate independently, each
 * giving a recommendation, a confidence score, risks, assumptions, missing information, and expected
 * upside/downside. The Orchestrator compares agreement, disagreement, confidence gaps, unresolved risks,
 * and whether more data is needed. See docs/adr/ADR-0097-agent-council.md. Mirrored in workers.
 */

export const CouncilRoleSchema = z.enum([
  "ceo", "cfo", "coo", "cto", "cmo", "legal_risk", "security", "customer", "investor", "contrarian",
]);
export type CouncilRole = z.infer<typeof CouncilRoleSchema>;

export const CouncilDecisionKindSchema = z.enum([
  "entity_restructuring", "large_spending", "major_launch", "pricing_change", "fundraising",
  "hiring", "legal_compliance", "market_entry",
]);
export type CouncilDecisionKind = z.infer<typeof CouncilDecisionKindSchema>;

export const CouncilSignalsSchema = z.object({
  revenue_upside: z.number().min(0).max(1).default(0.5),
  cost: z.number().min(0).max(1).default(0.5),
  risk: z.number().min(0).max(1).default(0.5),
  legal_exposure: z.number().min(0).max(1).default(0.3),
  security_exposure: z.number().min(0).max(1).default(0.3),
  operational_load: z.number().min(0).max(1).default(0.5),
  customer_impact: z.number().min(0).max(1).default(0.5),
  data_completeness: z.number().min(0).max(1).default(0.5),
});
export type CouncilSignals = z.infer<typeof CouncilSignalsSchema>;

export const ConveneCouncilInputSchema = z.object({
  kind: CouncilDecisionKindSchema,
  decision: z.string().min(1),
  signals: CouncilSignalsSchema,
});
export type ConveneCouncilInput = z.infer<typeof ConveneCouncilInputSchema>;

/** One agent's independent, confidence-scored evaluation. */
export const CouncilOpinionSchema = z.object({
  role: CouncilRoleSchema,
  recommendation: z.enum(["proceed", "proceed_with_conditions", "reject"]),
  confidence: z.number().min(0).max(1),
  risks: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  missing_information: z.array(z.string()).default([]),
  expected_upside: z.string().default(""),
  expected_downside: z.string().default(""),
});
export type CouncilOpinion = z.infer<typeof CouncilOpinionSchema>;

/** The orchestrator's synthesis of the council. */
export const CouncilVerdictSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: CouncilDecisionKindSchema,
  decision: z.string().min(1),
  opinions: z.array(CouncilOpinionSchema).default([]),
  /** Mean confidence across the council. */
  agreement: z.number().min(0).max(1),
  /** Spread between the most and least confident — the confidence gap. */
  confidence_gap: z.number().min(0).max(1),
  unresolved_risks: z.array(z.string()).default([]),
  /** True when the council lacks enough data to decide. */
  needs_more_data: z.boolean(),
  recommendation: z.string().min(1),
  created_at: z.string().datetime(),
});
export type CouncilVerdict = z.infer<typeof CouncilVerdictSchema>;
