import { z } from "zod";

/**
 * Strategic Exit & Asset Value Engine. Tracks which businesses, products, automations, assets, or IP could
 * become a cash-flow business, SaaS product, agency service, licensing asset, acquisition target, joint
 * venture, sellable micro-business, or investor-backed company — with valuation logic and the steps to make
 * each sellable. See docs/adr/ADR-0105-strategic-exit.md. Mirrored in workers.
 */

export const ExitPathSchema = z.enum([
  "cash_flow_business", "saas_product", "agency_service", "licensing_asset", "acquisition_target",
  "joint_venture", "sellable_micro_business", "investor_backed_company",
]);
export type ExitPath = z.infer<typeof ExitPathSchema>;

export const AssessExitInputSchema = z.object({
  asset_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  annual_revenue_usd: z.number().nonnegative().default(0),
  /** 0..1 signals. */
  recurring: z.number().min(0).max(1).default(0),
  defensibility: z.number().min(0).max(1).default(0.5),
  documentation: z.number().min(0).max(1).default(0.3),
  transferability: z.number().min(0).max(1).default(0.5),
  strategic_value: z.number().min(0).max(1).default(0.5),
});
export type AssessExitInput = z.infer<typeof AssessExitInputSchema>;

/** An exit/value assessment. */
export const ExitAssessmentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  asset_name: z.string().min(1),
  recommended_paths: z.array(ExitPathSchema).default([]),
  potential_buyers: z.array(z.string()).default([]),
  valuation_logic: z.string().min(1),
  revenue_multiple: z.number().nonnegative(),
  estimated_value_usd: z.number().nonnegative(),
  strategic_value: z.number().min(0).max(1),
  missing_proof: z.array(z.string()).default([]),
  missing_documentation: z.array(z.string()).default([]),
  steps_to_sellable: z.array(z.string()).default([]),
  /** 0..1 — how ready it is to be sold/packaged today. */
  sellability: z.number().min(0).max(1),
  created_at: z.string().datetime(),
});
export type ExitAssessment = z.infer<typeof ExitAssessmentSchema>;
