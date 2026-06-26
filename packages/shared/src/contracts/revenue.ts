import { z } from "zod";

/**
 * Revenue Command System contracts. Every business has offers, pricing, a pipeline, leads, conversion
 * rates, follow-ups, campaigns, cash opportunities, and revenue goals. Alfy² must always know the
 * fastest path to cash, the easiest offer to sell, the best current lead source, the highest-ROI
 * campaign, the stuck deals, and the next money action. Section types are `Revenue`-prefixed to avoid
 * collisions. See docs/adr/ADR-0034-revenue-command-system.md. Mirrored in workers (Pydantic).
 */

export const RevenueOfferSchema = z.object({
  name: z.string().min(1),
  price_usd: z.number().nonnegative(),
  conversion_rate: z.number().min(0).max(1).default(0),
});
export type RevenueOffer = z.infer<typeof RevenueOfferSchema>;

export const PipelineDealSchema = z.object({
  name: z.string().min(1),
  value_usd: z.number().nonnegative(),
  /** Probability of closing, 0..1. */
  probability: z.number().min(0).max(1).default(0.5),
  /** Expected days to close. */
  days_to_close: z.number().int().nonnegative().default(30),
  /** Days the deal has been idle (for stuck-deal detection). */
  idle_days: z.number().int().nonnegative().default(0),
});
export type PipelineDeal = z.infer<typeof PipelineDealSchema>;

export const LeadSourceSchema = z.object({
  name: z.string().min(1),
  leads: z.number().int().nonnegative().default(0),
  conversion_rate: z.number().min(0).max(1).default(0),
});
export type LeadSource = z.infer<typeof LeadSourceSchema>;

export const RevenueCampaignPerfSchema = z.object({
  name: z.string().min(1),
  roi: z.number().nullable().default(null),
  status: z.string().default("active"),
});
export type RevenueCampaignPerf = z.infer<typeof RevenueCampaignPerfSchema>;

export const CashOpportunitySchema = z.object({
  description: z.string().min(1),
  value_usd: z.number().nonnegative(),
  probability: z.number().min(0).max(1).default(0.5),
  days_to_cash: z.number().int().nonnegative().default(14),
});
export type CashOpportunity = z.infer<typeof CashOpportunitySchema>;

/** A business's revenue snapshot (the input to the command system). */
export const RevenueProfileInputSchema = z.object({
  business_name: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  offers: z.array(RevenueOfferSchema).default([]),
  pipeline: z.array(PipelineDealSchema).default([]),
  leads: z.array(LeadSourceSchema).default([]),
  campaigns: z.array(RevenueCampaignPerfSchema).default([]),
  cash_opportunities: z.array(CashOpportunitySchema).default([]),
  open_follow_ups: z.number().int().nonnegative().default(0),
  revenue_goal_usd: z.number().nonnegative().default(0),
  /** Days idle before a deal counts as stuck. */
  stuck_after_days: z.number().int().positive().default(14),
});
export type RevenueProfileInput = z.infer<typeof RevenueProfileInputSchema>;

/** The computed revenue intelligence Alfy² always knows. */
export const RevenueIntelSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_name: z.string().min(1),
  generated_at: z.string().datetime(),
  fastest_path_to_cash: z.string().min(1),
  easiest_offer_to_sell: z.string().min(1),
  best_lead_source: z.string().min(1),
  highest_roi_campaign: z.string().min(1),
  stuck_deals: z.array(z.string()).default([]),
  next_money_action: z.string().min(1),
  /** Expected revenue from the weighted pipeline + cash opportunities. */
  weighted_pipeline_usd: z.number().nonnegative(),
  revenue_goal_usd: z.number().nonnegative(),
});
export type RevenueIntel = z.infer<typeof RevenueIntelSchema>;
