import { z } from "zod";

/**
 * Model Router contracts. Alfy2 must never depend on a single AI provider. Models are described as
 * registry entries (not an enum) so any current or FUTURE model is added as data, never code. The
 * router scores models per task type and returns a choice plus a cross-provider fallback chain.
 * The chosen model id is consumed by the AI Gateway. See docs/adr/ADR-0012-router-and-connectors.md.
 * Mirrored in workers (Pydantic).
 */

/** The kinds of work the router selects a model for. */
export const TaskTypeSchema = z.enum([
  "coding",
  "reasoning",
  "writing",
  "debugging",
  "planning",
  "research",
  "architecture",
  "summarization",
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const CostTierSchema = z.enum(["low", "medium", "high"]);
export type CostTier = z.infer<typeof CostTierSchema>;

/** A model the router can choose. A registry entry — adding a model is data, not code. */
export const ModelDescriptorSchema = z.object({
  /** Stable id, e.g. "claude-code", "gpt-5.5", "local-llama". */
  id: z.string().min(1),
  name: z.string().min(1),
  /** Provider/family, e.g. "anthropic", "openai", "openclaw", "local". Drives fallback diversity. */
  provider: z.string().min(1),
  local: z.boolean().default(false),
  available: z.boolean().default(true),
  cost_tier: CostTierSchema.default("medium"),
  context_window: z.number().int().positive().nullable().default(null),
  /** Per-task capability scores, 0..1. Missing task => treated as 0. */
  strengths: z.record(TaskTypeSchema, z.number().min(0).max(1)).default({}),
  notes: z.string().default(""),
});
export type ModelDescriptor = z.infer<typeof ModelDescriptorSchema>;

/** Optional constraints on a routing request. */
export const RouteConstraintsSchema = z.object({
  prefer_local: z.boolean().default(false),
  max_cost_tier: CostTierSchema.optional(),
  require_available: z.boolean().default(true),
});
export type RouteConstraints = z.infer<typeof RouteConstraintsSchema>;

export const ModelScoreSchema = z.object({
  model_id: z.string().min(1),
  score: z.number().min(0).max(1),
});
export type ModelScore = z.infer<typeof ModelScoreSchema>;

/** The router's answer: a chosen model + the full ranking + a cross-provider fallback chain. */
export const RoutingDecisionSchema = z.object({
  task: TaskTypeSchema,
  chosen_model_id: z.string().min(1),
  ranked: z.array(ModelScoreSchema).min(1),
  /** Ordered fallback model ids — at least one from a different provider when available. */
  fallbacks: z.array(z.string()).default([]),
  rationale: z.string().min(1),
});
export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;
