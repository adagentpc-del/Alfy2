import { z } from "zod";
import { RiskLevelSchema } from "./tax-strategy.js";

/**
 * Entity Structure Optimizer contracts. Evaluates whether each business should remain an LLC, elect S Corp
 * treatment, convert to C Corp, create subsidiaries, or sit under a holding company — from revenue, profit,
 * payroll, investor plans, exit potential, liability, owners, fundraising, tax treatment, state, compliance,
 * asset protection, future SaaS monetization, and IP ownership. Analysis only, for CPA/attorney review.
 * See docs/adr/ADR-0063-entity-structure-optimizer.md. Mirrored in workers (Pydantic).
 */

export const EntityStructureSchema = z.enum([
  "sole_prop",
  "llc",
  "llc_s_corp",
  "c_corp",
  "holding_company",
  "subsidiary_under_holding",
]);
export type EntityStructure = z.infer<typeof EntityStructureSchema>;

export const EntityAnalysisInputSchema = z.object({
  business_name: z.string().min(1),
  current_structure: EntityStructureSchema.default("llc"),
  annual_revenue_usd: z.number().nonnegative().default(0),
  annual_profit_usd: z.number().default(0),
  has_payroll: z.boolean().default(false),
  owner_count: z.number().int().positive().default(1),
  plans_to_raise: z.boolean().default(false),
  exit_potential: z.boolean().default(false),
  high_liability: z.boolean().default(false),
  owns_ip: z.boolean().default(false),
  future_saas: z.boolean().default(false),
  state: z.string().default(""),
});
export type EntityAnalysisInput = z.infer<typeof EntityAnalysisInputSchema>;

/** A candidate structure with its trade-offs. */
export const EntityOptionSchema = z.object({
  structure: EntityStructureSchema,
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  tax_considerations: z.array(z.string()).default([]),
  legal_considerations: z.array(z.string()).default([]),
});
export type EntityOption = z.infer<typeof EntityOptionSchema>;

/** The entity-structure analysis. */
export const EntityAnalysisSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_name: z.string().min(1),
  current_structure: EntityStructureSchema,
  recommended_structure: EntityStructureSchema,
  why_recommended: z.string().min(1),
  alternatives: z.array(EntityOptionSchema).default([]),
  cpa_questions: z.array(z.string()).default([]),
  attorney_questions: z.array(z.string()).default([]),
  action_checklist: z.array(z.string()).default([]),
  risk_level: RiskLevelSchema,
  requires_professional_review: z.literal(true),
  created_at: z.string().datetime(),
});
export type EntityAnalysis = z.infer<typeof EntityAnalysisSchema>;
