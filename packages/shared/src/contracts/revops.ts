import { z } from "zod";

/**
 * RevOps — the revenue-brief vertical (Release 6). The engine reads live `revenue_opportunities` and
 * `revenue_money_actions` and produces (a) a portfolio- or business-scoped {@link RevOpsBrief} (pipeline
 * value, open opportunities, money actions due, stalled deals, top opportunities) and (b) a deterministic
 * {@link FastestPathPlan} — the greedy sequence of opportunities that fastest reaches a revenue target.
 *
 * Contracts only; engine logic lives in `@alfy2/core/revops`. All names are uniquely prefixed
 * (`RevOps*` / `FastestPath*`) to avoid barrel collisions. Mirrored 1:1 by Pydantic in
 * workers/alfy_workers/contracts.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** The canonical revenue funnel stages, traffic → retention. */
export const RevOpsFunnelStageSchema = z.enum([
  "traffic",
  "lead",
  "qualified",
  "meeting",
  "proposal",
  "close",
  "delivery",
  "upsell",
  "referral",
  "case_study",
  "retention",
]);
export type RevOpsFunnelStage = z.infer<typeof RevOpsFunnelStageSchema>;

// ---------------------------------------------------------------------------
// Brief building blocks
// ---------------------------------------------------------------------------

/** A money action due now (or undated) the operator should act on to realize revenue. */
export const RevOpsMoneyActionSchema = z.object({
  id: z.string(),
  action: z.string(),
  business: z.string(),
  expected_revenue_usd: z.number(),
  due: z.string().nullable().default(null),
  status: z.string(),
});
export type RevOpsMoneyAction = z.infer<typeof RevOpsMoneyActionSchema>;

/** An open opportunity that has not progressed in a while (>14 days since update). */
export const RevOpsStalledDealSchema = z.object({
  id: z.string(),
  title: z.string(),
  business: z.string(),
  days_stalled: z.number().int(),
});
export type RevOpsStalledDeal = z.infer<typeof RevOpsStalledDealSchema>;

/** A top-scored open opportunity surfaced in the brief. */
export const RevOpsTopOpportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  business: z.string(),
  expected_revenue_usd: z.number(),
  probability: z.number().min(0).max(1),
  score: z.number(),
});
export type RevOpsTopOpportunity = z.infer<typeof RevOpsTopOpportunitySchema>;

// ---------------------------------------------------------------------------
// Revenue brief
// ---------------------------------------------------------------------------

/** The point-in-time revenue brief, portfolio-wide (business = null) or scoped to one business. */
export const RevOpsBriefSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** null = portfolio-wide; otherwise the single business this brief covers. */
  business: z.string().nullable().default(null),
  as_of: z.string().datetime(),
  pipeline_value_usd: z.number().default(0),
  open_opportunities: z.number().int().default(0),
  money_actions_due: z.array(RevOpsMoneyActionSchema).default([]),
  stalled_deals: z.array(RevOpsStalledDealSchema).default([]),
  top_opportunities: z.array(RevOpsTopOpportunitySchema).default([]),
  created_at: z.string().datetime(),
});
export type RevOpsBrief = z.infer<typeof RevOpsBriefSchema>;

// ---------------------------------------------------------------------------
// Fastest path to cash
// ---------------------------------------------------------------------------

/** One step on the fastest path: advance a specific opportunity. */
export const FastestPathStepSchema = z.object({
  opportunity_id: z.string(),
  title: z.string(),
  business: z.string(),
  expected_revenue_usd: z.number(),
  probability: z.number(),
  speed_to_cash_days: z.number(),
  action: z.string(),
});
export type FastestPathStep = z.infer<typeof FastestPathStepSchema>;

/** The greedy plan that reaches `target_usd` of expected revenue in the fewest days. */
export const FastestPathPlanSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business: z.string().nullable().default(null),
  target_usd: z.number(),
  steps: z.array(FastestPathStepSchema).default([]),
  projected_total_usd: z.number().default(0),
  projected_days: z.number().default(0),
  created_at: z.string().datetime(),
});
export type FastestPathPlan = z.infer<typeof FastestPathPlanSchema>;
