import { z } from "zod";

/**
 * Founder Operating Principle contracts. The global rule of Alfy²: convert speed of thought into speed of
 * execution, and never let an idea die in notes. Every idea becomes one of task / asset / campaign /
 * offer / agent / workflow / parked / killed. Every business always has a next money / risk / follow-up /
 * asset / conversion action. And the whole system optimizes, in order, for: cash, conversion, follow-up,
 * risk control, execution speed, founder energy, reusable IP. See docs/adr/ADR-0050-founder-principle.md.
 * Mirrored in workers (Pydantic).
 */

/** The eight dispositions every idea must resolve into — it never just sits in notes. */
export const IdeaDispositionKindSchema = z.enum([
  "task",
  "asset",
  "campaign",
  "offer",
  "agent",
  "workflow",
  "parked_idea",
  "killed_idea",
]);
export type IdeaDispositionKind = z.infer<typeof IdeaDispositionKindSchema>;

/** Signals used to route an idea to its disposition. */
export const IdeaSignalsSchema = z.object({
  /** Estimated value/upside, 0..1. */
  value: z.number().min(0).max(1).default(0.5),
  /** Directly tied to revenue (an offer/campaign). */
  revenue_linked: z.boolean().default(false),
  /** Recurring / repeatable (an agent or workflow). */
  recurring: z.boolean().default(false),
  /** Produces a reusable artifact (an asset). */
  reusable: z.boolean().default(false),
  /** A single concrete next step (a task). */
  actionable_now: z.boolean().default(false),
});
export type IdeaSignals = z.infer<typeof IdeaSignalsSchema>;

/** A routed idea — captured with its disposition so it never dies in notes. */
export const IdeaDispositionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  idea: z.string().min(1),
  disposition: IdeaDispositionKindSchema,
  reason: z.string().min(1),
  business_id: z.string().uuid().nullable().default(null),
  created_at: z.string().datetime(),
});
export type IdeaDisposition = z.infer<typeof IdeaDispositionSchema>;

/** The five next-actions every business must always have. */
export const BusinessNextActionsSchema = z.object({
  business_name: z.string().min(1),
  next_money_action: z.string().min(1),
  next_risk_action: z.string().min(1),
  next_follow_up_action: z.string().min(1),
  next_asset_to_build: z.string().min(1),
  next_conversion_improvement: z.string().min(1),
  generated_at: z.string().datetime(),
});
export type BusinessNextActions = z.infer<typeof BusinessNextActionsSchema>;

/** A per-business snapshot the engine reads to fill the five next-actions. */
export const NextActionsInputSchema = z.object({
  business_name: z.string().min(1),
  money_candidate: z.string().default(""),
  risk_candidate: z.string().default(""),
  follow_up_candidate: z.string().default(""),
  asset_gap: z.string().default(""),
  conversion_candidate: z.string().default(""),
});
export type NextActionsInput = z.infer<typeof NextActionsInputSchema>;

/** The system's optimization priority, highest first. */
export const OptimizationPrioritySchema = z.enum([
  "cash",
  "conversion",
  "follow_up",
  "risk_control",
  "execution_speed",
  "founder_energy",
  "reusable_ip",
]);
export type OptimizationPriority = z.infer<typeof OptimizationPrioritySchema>;
