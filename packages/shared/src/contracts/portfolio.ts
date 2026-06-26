import { z } from "zod";

/**
 * Strategic Portfolio Optimizer contracts. Analyzes all businesses together and ranks them across ten
 * dimensions — revenue potential, speed to cash, effort required, stress cost, strategic value, current
 * traction, operational drag, capital required, team dependency, and monetization path — then
 * recommends focus now / delegate / automate / pause / kill / package for sale. See
 * docs/adr/ADR-0029-strategic-portfolio-optimizer.md. Mirrored in workers (Pydantic).
 */

export const PortfolioRecommendationSchema = z.enum([
  "focus_now",
  "delegate",
  "automate",
  "pause",
  "kill",
  "package_for_sale",
]);
export type PortfolioRecommendation = z.infer<typeof PortfolioRecommendationSchema>;

/** The ten ranking dimensions, each 0..1. Some are "higher is better" (revenue_potential, speed_to_cash,
 *  strategic_value, current_traction, monetization_path) and some "lower is better" (effort_required,
 *  stress_cost, operational_drag, capital_required, team_dependency). */
export const PortfolioMetricsSchema = z.object({
  revenue_potential: z.number().min(0).max(1),
  speed_to_cash: z.number().min(0).max(1),
  effort_required: z.number().min(0).max(1),
  stress_cost: z.number().min(0).max(1),
  strategic_value: z.number().min(0).max(1),
  current_traction: z.number().min(0).max(1),
  operational_drag: z.number().min(0).max(1),
  capital_required: z.number().min(0).max(1),
  team_dependency: z.number().min(0).max(1),
  monetization_path: z.number().min(0).max(1),
});
export type PortfolioMetrics = z.infer<typeof PortfolioMetricsSchema>;

/** One business's assessment and recommendation. */
export const BusinessAssessmentSchema = z.object({
  business_name: z.string().min(1),
  metrics: PortfolioMetricsSchema,
  /** Composite attractiveness score, 0..1. */
  score: z.number().min(0).max(1),
  recommendation: PortfolioRecommendationSchema,
  rationale: z.string().min(1),
});
export type BusinessAssessment = z.infer<typeof BusinessAssessmentSchema>;

/** The portfolio analysis, ranked. */
export const PortfolioReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  generated_at: z.string().datetime(),
  assessments: z.array(BusinessAssessmentSchema).default([]),
  summary: z.string().min(1),
});
export type PortfolioReport = z.infer<typeof PortfolioReportSchema>;

export const PortfolioBusinessInputSchema = z.object({
  business_name: z.string().min(1),
  metrics: PortfolioMetricsSchema,
});
export type PortfolioBusinessInput = z.infer<typeof PortfolioBusinessInputSchema>;

export const AnalyzePortfolioInputSchema = z.object({
  businesses: z.array(PortfolioBusinessInputSchema).min(1),
});
export type AnalyzePortfolioInput = z.infer<typeof AnalyzePortfolioInputSchema>;
