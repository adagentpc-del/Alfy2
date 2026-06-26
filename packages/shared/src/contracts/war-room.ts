import { z } from "zod";

/**
 * Conversion War Room contracts. Optimizes the nine conversion surfaces by tracking the full funnel —
 * open / reply / click / booked-call / close rates, time-to-conversion, revenue, negative replies, and
 * objections — running A/B tests and recommending winners. It never optimizes for vanity metrics; it
 * optimizes for revenue, booked calls, qualified leads, and cash collected. See
 * docs/adr/ADR-0042-conversion-war-room.md. Mirrored in workers (Pydantic).
 */

/** The nine surfaces the War Room optimizes. */
export const WarRoomSurfaceSchema = z.enum([
  "cold_email",
  "social_post",
  "landing_page",
  "dm",
  "sales_script",
  "deck",
  "proposal",
  "checkout_flow",
  "follow_up_sequence",
]);
export type WarRoomSurface = z.infer<typeof WarRoomSurfaceSchema>;

/** The full funnel metrics for one variant. Vanity metrics (opens/clicks) are tracked but never the
 *  deciding factor — the win is decided on revenue, booked calls, and qualified leads. */
export const FunnelMetricsSchema = z.object({
  sent: z.number().int().nonnegative().default(0),
  opens: z.number().int().nonnegative().default(0),
  replies: z.number().int().nonnegative().default(0),
  clicks: z.number().int().nonnegative().default(0),
  booked_calls: z.number().int().nonnegative().default(0),
  qualified_leads: z.number().int().nonnegative().default(0),
  closes: z.number().int().nonnegative().default(0),
  negative_replies: z.number().int().nonnegative().default(0),
  revenue_usd: z.number().nonnegative().default(0),
  cash_collected_usd: z.number().nonnegative().default(0),
  /** Average days from first touch to close. */
  time_to_conversion_days: z.number().nonnegative().default(0),
});
export type FunnelMetrics = z.infer<typeof FunnelMetricsSchema>;

/** A computed rate card derived from funnel metrics (rates are read-outs, not the win criteria). */
export const RateCardSchema = z.object({
  open_rate: z.number().min(0).max(1),
  reply_rate: z.number().min(0).max(1),
  click_rate: z.number().min(0).max(1),
  booked_call_rate: z.number().min(0).max(1),
  close_rate: z.number().min(0).max(1),
  negative_reply_rate: z.number().min(0).max(1),
  /** Revenue per message sent — the primary optimization target. */
  revenue_per_send_usd: z.number().nonnegative(),
});
export type RateCard = z.infer<typeof RateCardSchema>;

/** One A/B test on a surface. */
export const WarRoomTestSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid().nullable().default(null),
  surface: WarRoomSurfaceSchema,
  label: z.string().min(1),
  variant_a_label: z.string().default("A"),
  variant_b_label: z.string().default("B"),
  metrics_a: FunnelMetricsSchema,
  metrics_b: FunnelMetricsSchema,
  rates_a: RateCardSchema.nullable().default(null),
  rates_b: RateCardSchema.nullable().default(null),
  /** "a" / "b" / null (not enough signal yet). */
  winner: z.enum(["a", "b"]).nullable().default(null),
  recommendation: z.string().default(""),
  /** Aggregated objections heard on this surface. */
  objections: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type WarRoomTest = z.infer<typeof WarRoomTestSchema>;

export const StartWarRoomTestInputSchema = z.object({
  surface: WarRoomSurfaceSchema,
  label: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  variant_a_label: z.string().default("A"),
  variant_b_label: z.string().default("B"),
});
export type StartWarRoomTestInput = z.infer<typeof StartWarRoomTestInputSchema>;

export const RecordFunnelInputSchema = z.object({
  metrics_a: FunnelMetricsSchema,
  metrics_b: FunnelMetricsSchema,
});
export type RecordFunnelInput = z.infer<typeof RecordFunnelInputSchema>;
