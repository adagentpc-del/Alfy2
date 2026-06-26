import { z } from "zod";

/**
 * Revenue Truth System. Prevents fake progress by separating the pipeline into honest stages and never
 * treating activity as revenue. The dashboard prioritizes cash collected, then signed contracts, then
 * invoices sent, then qualified pipeline, then booked calls. See docs/adr/ADR-0101-revenue-truth.md.
 */

/** The honest revenue ladder, weakest → strongest commitment. */
export const RevenueStageSchema = z.enum([
  "idea", "lead", "warm_lead", "qualified", "proposal", "verbal_yes", "signed", "invoice_sent", "cash_collected",
]);
export type RevenueStage = z.infer<typeof RevenueStageSchema>;

/** One deal at a point on the ladder. */
export const TruthDealSchema = z.object({
  name: z.string().min(1),
  stage: RevenueStageSchema,
  value_usd: z.number().nonnegative().default(0),
  probability: z.number().min(0).max(1).default(0.5),
  /** Days since the deal last moved. */
  days_idle: z.number().int().nonnegative().default(0),
});
export type TruthDeal = z.infer<typeof TruthDealSchema>;

export const RevenueTruthInputSchema = z.object({
  business_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  deals: z.array(TruthDealSchema).default([]),
  stalled_after_days: z.number().int().positive().default(14),
});
export type RevenueTruthInput = z.infer<typeof RevenueTruthInputSchema>;

/** The truth report — real money first. */
export const RevenueTruthReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_name: z.string().min(1),
  cash_collected_usd: z.number().nonnegative(),
  signed_usd: z.number().nonnegative(),
  invoices_sent_usd: z.number().nonnegative(),
  qualified_pipeline_usd: z.number().nonnegative(),
  booked_calls: z.number().int().nonnegative(),
  /** Probability-weighted value of everything not yet cash. */
  probability_weighted_pipeline_usd: z.number().nonnegative(),
  stalled_deals: z.array(z.string()).default([]),
  next_money_action: z.string().min(1),
  created_at: z.string().datetime(),
});
export type RevenueTruthReport = z.infer<typeof RevenueTruthReportSchema>;
