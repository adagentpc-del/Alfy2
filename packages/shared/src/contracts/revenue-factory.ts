import { z } from "zod";

/**
 * Revenue Factory contracts. Turns goals, assets, contacts, and ideas into money. For every business it
 * tracks offers, pricing, target buyers, warm/cold leads, referral sources, proposals, follow-ups,
 * campaigns, conversion rates, booked calls, and revenue — and always answers "what do we do today to
 * make money?" See docs/adr/ADR-0041-revenue-factory.md. Mirrored in workers (Pydantic).
 */

export const LeadTemperatureSchema = z.enum(["warm", "cold"]);
export type LeadTemperature = z.infer<typeof LeadTemperatureSchema>;

/** An offer the business sells. */
export const FactoryOfferSchema = z.object({
  name: z.string().min(1),
  price_usd: z.number().nonnegative(),
  /** Historical close rate 0..1 — how likely this offer converts. */
  conversion_rate: z.number().min(0).max(1).default(0),
  /** Relative ease of selling 0..1 (1 = effortless). */
  ease: z.number().min(0).max(1).default(0.5),
});
export type FactoryOffer = z.infer<typeof FactoryOfferSchema>;

/** A buyer/lead/contact tracked for revenue. */
export const FactoryContactSchema = z.object({
  name: z.string().min(1),
  temperature: LeadTemperatureSchema.default("cold"),
  /** Relationship/affinity strength 0..1 (warmth of the actual relationship). */
  affinity: z.number().min(0).max(1).default(0),
  /** Estimated deal value if they buy. */
  potential_value_usd: z.number().nonnegative().default(0),
  is_referral_source: z.boolean().default(false),
});
export type FactoryContact = z.infer<typeof FactoryContactSchema>;

/** An outstanding proposal. */
export const FactoryProposalSchema = z.object({
  contact_name: z.string().min(1),
  offer_name: z.string().min(1),
  value_usd: z.number().nonnegative(),
  probability: z.number().min(0).max(1).default(0.5),
  /** Days since the proposal was sent (idle time). */
  age_days: z.number().int().nonnegative().default(0),
});
export type FactoryProposal = z.infer<typeof FactoryProposalSchema>;

/** A pending follow-up with revenue at stake. */
export const FactoryFollowUpSchema = z.object({
  contact_name: z.string().min(1),
  value_usd: z.number().nonnegative().default(0),
  /** Effort to execute 0..1 (0 = trivial). */
  effort: z.number().min(0).max(1).default(0.5),
});
export type FactoryFollowUp = z.infer<typeof FactoryFollowUpSchema>;

/** The per-business revenue snapshot fed to the Factory. */
export const RevenueFactoryInputSchema = z.object({
  business_id: z.string().uuid().nullable().default(null),
  business_name: z.string().min(1),
  offers: z.array(FactoryOfferSchema).default([]),
  contacts: z.array(FactoryContactSchema).default([]),
  proposals: z.array(FactoryProposalSchema).default([]),
  follow_ups: z.array(FactoryFollowUpSchema).default([]),
  booked_calls: z.number().int().nonnegative().default(0),
  revenue_generated_usd: z.number().nonnegative().default(0),
});
export type RevenueFactoryInput = z.infer<typeof RevenueFactoryInputSchema>;

/** The Factory's daily money directive. */
export const RevenueFactoryReportSchema = z.object({
  business_name: z.string().min(1),
  /** The single highest expected-value move available right now. */
  fastest_path_to_cash: z.string().default(""),
  easiest_offer_to_sell: z.string().nullable().default(null),
  best_warm_contact: z.string().nullable().default(null),
  lowest_effort_revenue_action: z.string().nullable().default(null),
  highest_value_follow_up: z.string().nullable().default(null),
  offer_most_likely_to_convert: z.string().nullable().default(null),
  /** The headline answer: "what do we do today to make money?" */
  todays_money_move: z.string().min(1),
  warm_lead_count: z.number().int().nonnegative().default(0),
  cold_lead_count: z.number().int().nonnegative().default(0),
  referral_source_count: z.number().int().nonnegative().default(0),
  open_proposal_value_usd: z.number().nonnegative().default(0),
  generated_at: z.string().datetime(),
});
export type RevenueFactoryReport = z.infer<typeof RevenueFactoryReportSchema>;
