import { z } from "zod";

/**
 * Capital Allocation Engine — Profit-First bucketing + runway/mode rules per business (Operations
 * Architecture §34).
 *
 * NON-NEGOTIABLE RULE (Constitution / Part I §13): Alfie NEVER moves money. This engine only
 * RECOMMENDS how an inflow should be split across buckets and what mode a business is in. Every
 * {@link CapitalAllocation} is persisted with `recommended=true` and `approved=false` — the actual
 * transfer is surfaced as an approval item and executed by the founder, never by the system.
 *
 * This contract is the canonical shape; it is mirrored 1:1 by Pydantic models in
 * workers/alfy_workers/contracts.
 */

// ---------------------------------------------------------------------------
// Enums (locally named `Capital*` to avoid barrel collisions with other contracts)
// ---------------------------------------------------------------------------

/** The nine Profit-First buckets every inflow is split across. */
export const CapitalBucketSchema = z.enum([
  "operating",
  "taxes",
  "owner_pay",
  "reserve",
  "growth",
  "tools",
  "contractors",
  "legal",
  "investment",
]);
export type CapitalBucket = z.infer<typeof CapitalBucketSchema>;

/** The operating mode a business is in, derived from runway + reserve. */
export const CapitalModeSchema = z.enum(["profit_first", "growth", "emergency"]);
export type CapitalMode = z.infer<typeof CapitalModeSchema>;

// ---------------------------------------------------------------------------
// Capital Account (mutable — one row per bucket per business; balance + policy)
// ---------------------------------------------------------------------------

export const CapitalAccountSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid(),
  bucket: CapitalBucketSchema,
  target_pct: z.number().min(0).max(1),
  balance: z.number().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().nullable().default(null),
});
export type CapitalAccount = z.infer<typeof CapitalAccountSchema>;

// ---------------------------------------------------------------------------
// Capital Allocation (append-only — a recommended split of one inflow)
// ---------------------------------------------------------------------------

export const CapitalAllocationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid(),
  inflow_usd: z.number(),
  /** bucket → recommended amount (sums exactly to inflow_usd). */
  split: z.record(z.number()),
  mode: CapitalModeSchema,
  /** ALWAYS true — this is only ever a recommendation. */
  recommended: z.boolean().default(true),
  /** ALWAYS false on creation — Alfie never executes the transfer; the founder approves. */
  approved: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type CapitalAllocation = z.infer<typeof CapitalAllocationSchema>;

// ---------------------------------------------------------------------------
// Capital Runway (append-only — a cash/burn reading + derived mode)
// ---------------------------------------------------------------------------

export const CapitalRunwaySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid(),
  as_of: z.string().datetime(),
  cash_usd: z.number(),
  monthly_burn_usd: z.number(),
  runway_days: z.number().int(),
  min_reserve_usd: z.number(),
  mode: CapitalModeSchema,
  created_at: z.string().datetime(),
});
export type CapitalRunway = z.infer<typeof CapitalRunwaySchema>;

// ---------------------------------------------------------------------------
// Default Profit-First policy — the nine bucket weights. MUST sum to exactly 1.0.
// ---------------------------------------------------------------------------

/** Default allocation policy: bucket → fraction of inflow. Sums to exactly 1.0. */
export const DEFAULT_CAPITAL_POLICY: Record<CapitalBucket, number> = {
  operating: 0.3,
  taxes: 0.15,
  owner_pay: 0.15,
  reserve: 0.1,
  growth: 0.12,
  tools: 0.05,
  contractors: 0.08,
  legal: 0.02,
  investment: 0.03,
};
