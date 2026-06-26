import { z } from "zod";

/**
 * Legal Tax Strategy Analyzer contracts. Analyzes business and personal financial activity and identifies
 * LEGAL tax optimization opportunities — avoidance, deferral, deduction, structuring, and planning, NEVER
 * evasion. Alfy² does not provide final legal or tax advice; it prepares analysis, scenarios, questions,
 * and recommendations for CPA/attorney review. See docs/adr/ADR-0062-tax-strategy-analyzer.md. Mirrored
 * in workers (Pydantic).
 */

/** The fifteen tax-strategy areas. */
export const TaxStrategyAreaSchema = z.enum([
  "entity_election",
  "holding_company",
  "subsidiary_structure",
  "owner_compensation",
  "deductible_expenses",
  "retirement_vehicles",
  "self_directed_ira",
  "trusts",
  "estate_planning",
  "asset_protection",
  "state_tax",
  "federal_tax",
  "international_offshore",
  "bookkeeping_gaps",
  "compliance_deadlines",
]);
export type TaxStrategyArea = z.infer<typeof TaxStrategyAreaSchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const ComplexitySchema = z.enum(["low", "medium", "high"]);
export type Complexity = z.infer<typeof ComplexitySchema>;

/** The financial picture analyzed. */
export const TaxAnalysisInputSchema = z.object({
  subject: z.string().min(1),
  is_business: z.boolean().default(true),
  annual_revenue_usd: z.number().nonnegative().default(0),
  annual_profit_usd: z.number().default(0),
  owner_count: z.number().int().positive().default(1),
  has_payroll: z.boolean().default(false),
  state: z.string().default(""),
  /** Areas to focus on; empty = analyze all fifteen. */
  focus_areas: z.array(TaxStrategyAreaSchema).default([]),
});
export type TaxAnalysisInput = z.infer<typeof TaxAnalysisInputSchema>;

/** One tax recommendation — analysis only, for professional review. */
export const TaxRecommendationSchema = z.object({
  area: TaxStrategyAreaSchema,
  title: z.string().min(1),
  why_it_may_apply: z.string().min(1),
  estimated_benefit: z.string().default(""),
  risk_level: RiskLevelSchema,
  complexity: ComplexitySchema,
  /** Always true — execution requires a CPA and/or attorney. */
  requires_professional_review: z.literal(true),
  documents_needed: z.array(z.string()).default([]),
  next_step: z.string().min(1),
  questions_for_advisor: z.array(z.string()).default([]),
});
export type TaxRecommendation = z.infer<typeof TaxRecommendationSchema>;

/** The analysis output. */
export const TaxAnalysisSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  subject: z.string().min(1),
  recommendations: z.array(TaxRecommendationSchema).default([]),
  /** Standing disclaimer — analysis, not advice; legal optimization only. */
  disclaimer: z.string().min(1),
  created_at: z.string().datetime(),
});
export type TaxAnalysis = z.infer<typeof TaxAnalysisSchema>;
