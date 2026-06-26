import { z } from "zod";

/**
 * Capital Allocation Board. Allocates cash, time, attention, energy, team capacity, agent capacity,
 * technology spend, relationships, and brand equity. For every option it computes expected return, risk,
 * payback period, liquidity impact, leverage, compounding value, and opportunity cost, then issues a
 * disposition: invest / test / delay / automate / delegate / kill / sell / package into FounderOS. See
 * docs/adr/ADR-0099-capital-board.md. Mirrored in workers.
 */

export const CapitalDispositionSchema = z.enum([
  "invest", "test", "delay", "automate", "delegate", "kill", "sell", "package_founderos",
]);
export type CapitalDisposition = z.infer<typeof CapitalDispositionSchema>;

export const BoardOptionInputSchema = z.object({
  label: z.string().min(1),
  expected_return: z.number().min(0).max(1).default(0),
  risk: z.number().min(0).max(1).default(0.5),
  payback_months: z.number().nonnegative().default(0),
  /** How much it ties up liquidity, 0..1. */
  liquidity_impact: z.number().min(0).max(1).default(0),
  leverage: z.number().min(0).max(1).default(0),
  compounding: z.number().min(0).max(1).default(0),
  /** Whether it is already automatable / delegatable / packageable. */
  automatable: z.boolean().default(false),
  delegatable: z.boolean().default(false),
  packageable: z.boolean().default(false),
});
export type BoardOptionInput = z.infer<typeof BoardOptionInputSchema>;

export const AllocateBoardInputSchema = z.object({
  options: z.array(BoardOptionInputSchema).min(1),
});
export type AllocateBoardInput = z.infer<typeof AllocateBoardInputSchema>;

/** A scored option with its disposition. */
export const BoardOptionVerdictSchema = z.object({
  label: z.string().min(1),
  composite_score: z.number(),
  opportunity_cost: z.number(),
  disposition: CapitalDispositionSchema,
  reason: z.string().min(1),
});
export type BoardOptionVerdict = z.infer<typeof BoardOptionVerdictSchema>;

export const CapitalBoardDecisionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  verdicts: z.array(BoardOptionVerdictSchema).default([]),
  top_pick: z.string().min(1),
  created_at: z.string().datetime(),
});
export type CapitalBoardDecision = z.infer<typeof CapitalBoardDecisionSchema>;
