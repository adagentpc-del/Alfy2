import { z } from "zod";

/**
 * Conversion Engine contracts. Tracks and improves the surfaces that turn attention into revenue —
 * landing pages, offers, hooks, CTAs, emails, DMs, sales calls, decks, proposals, follow-ups, checkout
 * flows. Per business it maintains a conversion baseline, active tests, winning and losing copy,
 * objections, best-performing offers, and the next optimization. Winners are decided by revenue per
 * visitor, not vanity metrics. See docs/adr/ADR-0032-conversion-engine.md. Mirrored in workers.
 */

/** The eleven conversion surfaces. */
export const ConversionSurfaceSchema = z.enum([
  "landing_page",
  "offer",
  "hook",
  "cta",
  "email",
  "dm",
  "sales_call",
  "deck",
  "proposal",
  "follow_up",
  "checkout_flow",
]);
export type ConversionSurface = z.infer<typeof ConversionSurfaceSchema>;

export const ConversionTestStatusSchema = z.enum(["active", "won", "lost", "inconclusive"]);
export type ConversionTestStatus = z.infer<typeof ConversionTestStatusSchema>;

export const VariantKeyConvSchema = z.enum(["A", "B"]);
export type VariantKeyConv = z.infer<typeof VariantKeyConvSchema>;

/** A copy snippet with its measured performance. */
export const CopySnippetSchema = z.object({
  surface: ConversionSurfaceSchema,
  text: z.string().min(1),
  conversion_rate: z.number().min(0).max(1).default(0),
  /** Revenue per visitor/recipient — the metric that actually matters. */
  revenue_per_unit_usd: z.number().nonnegative().default(0),
});
export type CopySnippet = z.infer<typeof CopySnippetSchema>;

/** An offer's performance. */
export const OfferPerfSchema = z.object({
  name: z.string().min(1),
  conversion_rate: z.number().min(0).max(1).default(0),
  revenue_usd: z.number().nonnegative().default(0),
});
export type OfferPerf = z.infer<typeof OfferPerfSchema>;

/** An A/B test on a surface. */
export const ConversionTestSchema = z.object({
  id: z.string().uuid(),
  surface: ConversionSurfaceSchema,
  hypothesis: z.string().min(1),
  variant_a: z.string().min(1),
  variant_b: z.string().min(1),
  status: ConversionTestStatusSchema.default("active"),
  winner: VariantKeyConvSchema.nullable().default(null),
  /** Revenue per unit for each variant (the deciding metric). */
  revenue_per_unit_a_usd: z.number().nonnegative().default(0),
  revenue_per_unit_b_usd: z.number().nonnegative().default(0),
  conversion_a: z.number().min(0).max(1).default(0),
  conversion_b: z.number().min(0).max(1).default(0),
  created_at: z.string().datetime(),
});
export type ConversionTest = z.infer<typeof ConversionTestSchema>;

/** A business's conversion profile. */
export const ConversionProfileSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid().nullable().default(null),
  business_name: z.string().min(1),
  /** Baseline revenue-per-visitor (or conversion if no revenue) for the business. */
  baseline_conversion: z.number().min(0).max(1).default(0),
  baseline_revenue_per_unit_usd: z.number().nonnegative().default(0),
  active_tests: z.array(ConversionTestSchema).default([]),
  winning_copy: z.array(CopySnippetSchema).default([]),
  losing_copy: z.array(CopySnippetSchema).default([]),
  objections: z.array(z.string()).default([]),
  best_offers: z.array(OfferPerfSchema).default([]),
  next_optimization: z.string().default(""),
  /** Always true: the engine optimizes for revenue, not vanity metrics. */
  revenue_focused: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ConversionProfile = z.infer<typeof ConversionProfileSchema>;

export const StartTestInputSchema = z.object({
  surface: ConversionSurfaceSchema,
  hypothesis: z.string().min(1),
  variant_a: z.string().min(1),
  variant_b: z.string().min(1),
});
export type StartTestInput = z.infer<typeof StartTestInputSchema>;

export const TestResultInputSchema = z.object({
  conversion_a: z.number().min(0).max(1).default(0),
  conversion_b: z.number().min(0).max(1).default(0),
  revenue_per_unit_a_usd: z.number().nonnegative().default(0),
  revenue_per_unit_b_usd: z.number().nonnegative().default(0),
});
export type TestResultInput = z.infer<typeof TestResultInputSchema>;
