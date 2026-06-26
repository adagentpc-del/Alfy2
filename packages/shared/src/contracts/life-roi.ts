import { z } from "zod";

/**
 * Life ROI Engine. Every workflow calculates Financial ROI AND Life ROI — translating hours saved into
 * workdays and life returned, and counting decisions, meetings, and emails eliminated and freedom gained.
 * Alfy² optimizes for life returned, not only money earned. See docs/adr/ADR-0115-life-roi.md.
 */

export const LifeRoiInputSchema = z.object({
  workflow: z.string().min(1),
  hours_saved_per_week: z.number().nonnegative().default(0),
  decisions_eliminated: z.number().int().nonnegative().default(0),
  meetings_eliminated: z.number().int().nonnegative().default(0),
  emails_eliminated: z.number().int().nonnegative().default(0),
  /** 0..1 — stress reduced. */
  stress_reduced: z.number().min(0).max(1).default(0),
  /** Revenue preserved/created by the workflow (USD/yr). */
  revenue_maintained_usd: z.number().nonnegative().default(0),
  /** One-time + annual cost of running the workflow (USD/yr) for financial ROI. */
  annual_cost_usd: z.number().nonnegative().default(0),
  /** Value of a founder hour (USD) to monetize time saved. */
  founder_hour_value_usd: z.number().nonnegative().default(250),
});
export type LifeRoiInput = z.infer<typeof LifeRoiInputSchema>;

/** The dual-ROI assessment. */
export const LifeRoiAssessmentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  workflow: z.string().min(1),
  hours_saved_per_year: z.number().nonnegative(),
  /** Hours saved expressed as 8-hour workdays. */
  workdays_returned: z.number().nonnegative(),
  /** Financial ROI ratio = (time value + revenue maintained − cost) / max(cost, 1). */
  financial_roi: z.number(),
  decisions_eliminated: z.number().int().nonnegative(),
  meetings_eliminated: z.number().int().nonnegative(),
  emails_eliminated: z.number().int().nonnegative(),
  /** 0..1 — freedom gained. */
  freedom_gained: z.number().min(0).max(1),
  /** 0..1 — composite Life ROI Score (life returned, weighted over money). */
  life_roi_score: z.number().min(0).max(1),
  summary: z.string().min(1),
  created_at: z.string().datetime(),
});
export type LifeRoiAssessment = z.infer<typeof LifeRoiAssessmentSchema>;
