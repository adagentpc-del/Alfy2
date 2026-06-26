import { z } from "zod";

/**
 * Million-Dollar Sprint Engine. Builds an aggressive but realistic path to $1,000,000 in available cash,
 * ranking paths by speed to cash, deal size, probability, effort, legal/compliance risk, relationship
 * leverage, asset readiness, and founder energy — with 7/30/90-day plans and no fantasy math (every path
 * shows assumptions, risks, and required actions). See docs/adr/ADR-0100-million-sprint.md. Mirrored.
 */

export const CashPathInputSchema = z.object({
  label: z.string().min(1),
  deal_size_usd: z.number().nonnegative(),
  probability: z.number().min(0).max(1).default(0.5),
  /** Days to cash if it lands. */
  speed_days: z.number().nonnegative().default(30),
  effort: z.number().min(0).max(1).default(0.5),
  legal_risk: z.number().min(0).max(1).default(0.2),
  relationship_leverage: z.number().min(0).max(1).default(0.5),
  asset_readiness: z.number().min(0).max(1).default(0.5),
  founder_energy: z.number().min(0).max(1).default(0.5),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
});
export type CashPathInput = z.infer<typeof CashPathInputSchema>;

export const BuildSprintInputSchema = z.object({
  target_usd: z.number().positive().default(1_000_000),
  paths: z.array(CashPathInputSchema).min(1),
});
export type BuildSprintInput = z.infer<typeof BuildSprintInputSchema>;

/** A ranked path with its expected cash. */
export const RankedCashPathSchema = z.object({
  label: z.string().min(1),
  expected_cash_usd: z.number().nonnegative(),
  /** Expected cash per day — the speed-weighted score. */
  velocity: z.number().nonnegative(),
  score: z.number(),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  required_actions: z.array(z.string()).default([]),
});
export type RankedCashPath = z.infer<typeof RankedCashPathSchema>;

/** The sprint plan. */
export const SprintPlanSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  target_usd: z.number().positive(),
  ranked_paths: z.array(RankedCashPathSchema).default([]),
  expected_total_cash_usd: z.number().nonnegative(),
  plan_7_day: z.array(z.string()).default([]),
  plan_30_day: z.array(z.string()).default([]),
  plan_90_day: z.array(z.string()).default([]),
  daily_money_actions: z.array(z.string()).default([]),
  /** True when the probability-weighted total clears the target. */
  realistic: z.boolean(),
  created_at: z.string().datetime(),
});
export type SprintPlan = z.infer<typeof SprintPlanSchema>;
