import { z } from "zod";

/**
 * Failure Database + Future Trends Lab contracts.
 *
 * Failure Database tracks major failures (fraud, lawsuits, AI failures, security breaches, failed
 * startups, scams, regulatory actions, bankruptcies, ethical failures) as permanent institutional
 * knowledge: what happened, timeline, why it failed, root cause, warning signs, lessons learned, and how
 * Alfy² avoids repeating it.
 *
 * Future Trends Lab tracks developments over 6mo / 1yr / 3yr / 5yr / 10yr horizons with likelihood,
 * impact, affected industries/businesses, preparation steps, skills/tech needed, investment
 * opportunities, threats, and a readiness score — preparing Alyssa before everyone else.
 *
 * See docs/adr/ADR-0068-failure-trends.md. Mirrored in workers (Pydantic).
 */

// === Failure Database ===

export const FailureKindSchema = z.enum([
  "fraud",
  "lawsuit",
  "ai_failure",
  "security_breach",
  "failed_startup",
  "scam",
  "regulatory_action",
  "bankruptcy",
  "ethical_failure",
]);
export type FailureKind = z.infer<typeof FailureKindSchema>;

export const CaptureFailureInputSchema = z.object({
  kind: FailureKindSchema,
  title: z.string().min(1),
  what_happened: z.string().default(""),
  timeline: z.array(z.string()).default([]),
  why_it_failed: z.string().default(""),
  root_cause: z.string().default(""),
  warning_signs: z.array(z.string()).default([]),
  lessons_learned: z.array(z.string()).default([]),
});
export type CaptureFailureInput = z.infer<typeof CaptureFailureInputSchema>;

export const FailureCaseSchema = CaptureFailureInputSchema.extend({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** Generated: how Alfy² should avoid repeating this. */
  how_alfy2_avoids_it: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type FailureCase = z.infer<typeof FailureCaseSchema>;

// === Future Trends Lab ===

export const TrendHorizonSchema = z.enum(["6_months", "1_year", "3_years", "5_years", "10_years"]);
export type TrendHorizon = z.infer<typeof TrendHorizonSchema>;

export const TrackTrendInputSchema = z.object({
  name: z.string().min(1),
  horizon: TrendHorizonSchema,
  description: z.string().default(""),
  /** 0..1 estimates. */
  likelihood: z.number().min(0).max(1).default(0.5),
  impact: z.number().min(0).max(1).default(0.5),
  industries_affected: z.array(z.string()).default([]),
  businesses_affected: z.array(z.string()).default([]),
});
export type TrackTrendInput = z.infer<typeof TrackTrendInputSchema>;

export const TrendSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  horizon: TrendHorizonSchema,
  description: z.string().default(""),
  likelihood: z.number().min(0).max(1),
  impact: z.number().min(0).max(1),
  industries_affected: z.array(z.string()).default([]),
  businesses_affected: z.array(z.string()).default([]),
  preparation_steps: z.array(z.string()).default([]),
  skills_needed: z.array(z.string()).default([]),
  technology_needed: z.array(z.string()).default([]),
  investment_opportunities: z.array(z.string()).default([]),
  potential_threats: z.array(z.string()).default([]),
  /** likelihood × impact — how ready Alyssa should be. */
  readiness_score: z.number().min(0).max(1),
  created_at: z.string().datetime(),
});
export type Trend = z.infer<typeof TrendSchema>;
