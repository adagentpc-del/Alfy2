import { z } from "zod";

/**
 * Vision Builder. When Alyssa says "I have an idea…", Alfy² enters collaborative thinking mode — it explores,
 * challenges, strengthens, and risk-checks the idea before generating an architecture, implementation plan,
 * business model, marketing, monetization, assets, agents, workflows, and roadmap. It becomes an executive
 * thought partner first; execution begins only after approval. Composes Idea Builder. See
 * docs/adr/ADR-0125-vision-builder.md. Mirrored in workers.
 */

export const ExploreIdeaInputSchema = z.object({
  idea: z.string().min(1),
  /** 0..1 signals to shape the partnership. */
  novelty: z.number().min(0).max(1).default(0.5),
  market_pull: z.number().min(0).max(1).default(0.5),
  founder_fit: z.number().min(0).max(1).default(0.5),
  complexity: z.number().min(0).max(1).default(0.5),
});
export type ExploreIdeaInput = z.infer<typeof ExploreIdeaInputSchema>;

/** A generated artifact plan (not executed — awaiting approval). */
export const VisionArtifactSchema = z.object({
  kind: z.enum([
    "architecture", "implementation_plan", "business_model", "marketing", "monetization",
    "assets", "agents", "workflows", "roadmap",
  ]),
  outline: z.string().min(1),
});
export type VisionArtifact = z.infer<typeof VisionArtifactSchema>;

/** A collaborative vision session. */
export const VisionSessionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  idea: z.string().min(1),
  /** Thought-partner phase. */
  exploration: z.array(z.string()).default([]),
  challenges: z.array(z.string()).default([]),
  strengthened: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  /** Generated plans, all awaiting approval. */
  artifacts: z.array(VisionArtifactSchema).default([]),
  /** 0..1 — overall promise of the idea. */
  promise: z.number().min(0).max(1),
  /** Always true — Vision Builder never auto-executes. */
  awaiting_approval: z.literal(true),
  created_at: z.string().datetime(),
});
export type VisionSession = z.infer<typeof VisionSessionSchema>;
