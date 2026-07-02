import { z } from "zod";

/**
 * AI adapter contracts (docs/MODEL_ROUTER.md made live). One provider-agnostic completion surface,
 * always metered: every call records model, tokens, and cost so the Cost & Token CFO (ADR-0047) has
 * real numbers. Server-side only — keys never reach the browser. Mirrored.
 */

export const AiTaskKindSchema = z.enum([
  "triage", "enrich", "draft_report", "recommend", "summarize", "other",
]);
export type AiTaskKind = z.infer<typeof AiTaskKindSchema>;

export const AiRequestSchema = z.object({
  kind: AiTaskKindSchema,
  system: z.string().default(""),
  prompt: z.string().min(1),
  /** Hard output cap — cost control is not optional. */
  max_tokens: z.number().int().min(1).max(8192).default(1024),
  model: z.string().default("claude-sonnet-5"),
});
export type AiRequest = z.infer<typeof AiRequestSchema>;

export const AiUsageSchema = z.object({
  model: z.string(),
  kind: AiTaskKindSchema,
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cost_cents: z.number().nonnegative(),
  at: z.string().datetime(),
});
export type AiUsage = z.infer<typeof AiUsageSchema>;

export const AiResultSchema = z.object({
  text: z.string(),
  usage: AiUsageSchema,
});
export type AiResult = z.infer<typeof AiResultSchema>;

/** Per-MTok prices (USD cents) — kept here so metering is contract-visible and auditable. */
export const AI_PRICES_CENTS_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 300, output: 1500 },
  "claude-haiku-4-5-20251001": { input: 100, output: 500 },
  "claude-opus-4-8": { input: 1500, output: 7500 },
};
