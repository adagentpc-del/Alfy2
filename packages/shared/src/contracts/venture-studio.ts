import { z } from "zod";

/**
 * Venture Studio. Turns ideas into companies. Triggered when Alyssa says "I have an idea…", it advances a
 * venture through 17 stages from Discovery to FounderOS Integration. Every company inherits the enterprise
 * operating standards — no business starts from zero. Composes the Idea Builder (ADR-0008) and Vision
 * Builder (ADR-0125): Vision Builder explores the idea, Idea Builder drafts the blueprint, and Venture
 * Studio is the staged company-build that wraps them. The session is MUTABLE — stages progress over time.
 * Nothing is launched without approval. See docs/adr/ADR-0131-venture-studio.md. Mirrored in workers.
 */

export const VentureStudioStageSchema = z.enum([
  "discovery", "validation", "market", "business_model", "pricing", "brand", "technology",
  "architecture", "agents", "automation", "marketing", "sales", "finance", "legal", "launch",
  "kpis", "founderos_integration",
]);
export type VentureStudioStage = z.infer<typeof VentureStudioStageSchema>;

export const StageStatusSchema = z.enum(["not_started", "in_progress", "complete"]);
export type StageStatus = z.infer<typeof StageStatusSchema>;

/** One stage's progress and its produced artifact summary. */
export const VentureStageProgressSchema = z.object({
  stage: VentureStudioStageSchema,
  status: StageStatusSchema.default("not_started"),
  artifact_summary: z.string().default(""),
});
export type VentureStageProgress = z.infer<typeof VentureStageProgressSchema>;

export const StartVentureInputSchema = z.object({
  idea: z.string().min(1),
  working_name: z.string().default(""),
});
export type StartVentureInput = z.infer<typeof StartVentureInputSchema>;

/** A staged company-build. Mutable — current_stage and stage statuses advance. */
export const VentureStudioSessionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  idea: z.string().min(1),
  working_name: z.string().default(""),
  current_stage: VentureStudioStageSchema.default("discovery"),
  stages: z.array(VentureStageProgressSchema).default([]),
  /** Invariant: every company inherits enterprise operating standards — no business starts from zero. */
  inherits_operating_standards: z.literal(true).default(true),
  /** Always true until explicit approval to launch — nothing launches on its own. */
  awaiting_launch_approval: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type VentureStudioSession = z.infer<typeof VentureStudioSessionSchema>;
