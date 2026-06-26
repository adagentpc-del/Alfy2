import { z } from "zod";

/**
 * Deal Desk contracts. One record per opportunity with the full deal context, ranked by probability,
 * revenue, speed, strategic value, and effort — always surfacing the next money move, the blocked deals,
 * and the deals likely to die without action. See docs/adr/ADR-0043-deal-desk.md. Mirrored in workers.
 */

export const DealStageSchema = z.enum([
  "new",
  "qualifying",
  "proposal",
  "negotiation",
  "verbal",
  "won",
  "lost",
]);
export type DealStage = z.infer<typeof DealStageSchema>;

/** A single opportunity tracked on the Deal Desk. */
export const DealSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  buyer_contact: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  business_name: z.string().default(""),
  offer: z.string().min(1),
  deal_size_usd: z.number().nonnegative().default(0),
  probability: z.number().min(0).max(1).default(0.5),
  stage: DealStageSchema.default("new"),
  next_step: z.string().default(""),
  deadline: z.string().datetime().nullable().default(null),
  objections: z.array(z.string()).default([]),
  missing_assets: z.array(z.string()).default([]),
  /** Follow-up state, e.g. "active", "stalled", "none". */
  follow_up_status: z.string().default("none"),
  decision_maker: z.string().default(""),
  relationship_notes: z.string().default(""),
  /** Risk that the deal slips/dies 0..1. */
  risk: z.number().min(0).max(1).default(0),
  /** Days since the deal last moved (idle time). */
  days_since_activity: z.number().int().nonnegative().default(0),
  projected_close_date: z.string().datetime().nullable().default(null),
  /** Relative effort to close 0..1 (0 = trivial). */
  effort: z.number().min(0).max(1).default(0.5),
  /** Strategic value beyond the dollar amount 0..1. */
  strategic_value: z.number().min(0).max(1).default(0.5),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Deal = z.infer<typeof DealSchema>;

export const CreateDealInputSchema = DealSchema.pick({
  buyer_contact: true,
  business_id: true,
  business_name: true,
  offer: true,
  deal_size_usd: true,
  probability: true,
  stage: true,
  next_step: true,
  deadline: true,
  objections: true,
  missing_assets: true,
  follow_up_status: true,
  decision_maker: true,
  relationship_notes: true,
  risk: true,
  days_since_activity: true,
  projected_close_date: true,
  effort: true,
  strategic_value: true,
}).partial().extend({
  buyer_contact: z.string().min(1),
  offer: z.string().min(1),
});
export type CreateDealInput = z.infer<typeof CreateDealInputSchema>;

/** How to rank the desk. */
export const DealRankBySchema = z.enum(["probability", "revenue", "speed", "strategic_value", "effort"]);
export type DealRankBy = z.infer<typeof DealRankBySchema>;

/** A ranked deal with its composite and the reason it's prioritized. */
export const RankedDealSchema = z.object({
  deal: DealSchema,
  /** Probability-weighted expected value. */
  expected_value_usd: z.number().nonnegative(),
  composite_score: z.number(),
  reason: z.string().default(""),
});
export type RankedDeal = z.infer<typeof RankedDealSchema>;

/** The desk view. */
export const DealDeskViewSchema = z.object({
  ranked: z.array(RankedDealSchema).default([]),
  /** The single best next money move across the desk. */
  next_money_move: z.string().min(1),
  /** Deals blocked by missing assets or a hard objection. */
  blocked_deals: z.array(DealSchema).default([]),
  /** Open deals likely to die without action (high risk / idle past threshold). */
  deals_likely_to_die: z.array(DealSchema).default([]),
  weighted_pipeline_usd: z.number().nonnegative().default(0),
  generated_at: z.string().datetime(),
});
export type DealDeskView = z.infer<typeof DealDeskViewSchema>;
