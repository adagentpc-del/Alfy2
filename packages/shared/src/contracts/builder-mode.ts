import { z } from "zod";

/**
 * Builder Mode contracts. When Alyssa says "I want to build...", Builder Mode launches and guides the
 * project through eighteen stages — discovery, market validation, offer design, pricing, business model,
 * brand, product architecture, technical architecture, database, agent plan, asset checklist, legal,
 * marketing, sales, automation, launch, KPIs, review checkpoints — producing the complete operating
 * system for a new venture, not just a task list. See docs/adr/ADR-0060-builder-mode.md. Mirrored in
 * workers (Pydantic). Composes the Idea Builder (ADR-0008) and Business Template (ADR-0006).
 */

/** The trigger phrase. */
export const BUILDER_TRIGGER = "I want to build";

/** The eighteen build stages, in order. */
export const BuilderStageSchema = z.enum([
  "discovery",
  "market_validation",
  "offer_design",
  "pricing",
  "business_model",
  "brand",
  "product_architecture",
  "technical_architecture",
  "database",
  "agent_plan",
  "asset_checklist",
  "legal",
  "marketing_plan",
  "sales_plan",
  "automation_plan",
  "launch_plan",
  "kpis",
  "review_checkpoints",
]);
export type BuilderStage = z.infer<typeof BuilderStageSchema>;

/** One stage's generated output. */
export const BuilderStageOutputSchema = z.object({
  stage: BuilderStageSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  items: z.array(z.string()).default([]),
  /** Open questions / assumptions for this stage (deterministic; no AI/web). */
  open_questions: z.array(z.string()).default([]),
});
export type BuilderStageOutput = z.infer<typeof BuilderStageOutputSchema>;

export const StartBuildInputSchema = z.object({
  idea: z.string().min(1),
  business_name: z.string().default(""),
  target_market: z.string().default(""),
});
export type StartBuildInput = z.infer<typeof StartBuildInputSchema>;

/** The complete venture operating system. */
export const VentureBlueprintSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  idea: z.string().min(1),
  business_name: z.string().default(""),
  stages: z.array(BuilderStageOutputSchema).default([]),
  /** Always awaiting approval before anything is built (human-in-command). */
  status: z.enum(["awaiting_approval", "approved"]).default("awaiting_approval"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type VentureBlueprint = z.infer<typeof VentureBlueprintSchema>;
