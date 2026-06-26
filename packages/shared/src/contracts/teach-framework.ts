import { z } from "zod";

/**
 * Teach My Framework Engine. Converts Alyssa's lived pattern recognition into teachable frameworks for other
 * people. When the Alyssa Pattern Mirror (ADR-0132) notices her repeatedly solving a type of problem, this
 * engine generates a named framework with an explanation, a step-by-step process, examples, use cases, a
 * checklist, a worksheet, a training module, a podcast topic, a consulting asset, and a FounderOS feature
 * candidate. The goal: turn her natural intelligence into reusable intellectual property that helps others.
 * Generated frameworks are APPEND-ONLY records. Feeds the Legacy Archive. See
 * docs/adr/ADR-0133-teach-framework.md. Mirrored in workers.
 */

/** The reusable artifacts a framework is expanded into. */
export const FrameworkArtifactKindSchema = z.enum([
  "explanation", "step_by_step", "examples", "use_cases", "checklist", "worksheet",
  "training_module", "podcast_topic", "consulting_asset", "founderos_feature",
]);
export type FrameworkArtifactKind = z.infer<typeof FrameworkArtifactKindSchema>;

export const FrameworkArtifactSchema = z.object({
  kind: FrameworkArtifactKindSchema,
  content: z.string().min(1),
});
export type FrameworkArtifact = z.infer<typeof FrameworkArtifactSchema>;

export const DetectFrameworkInputSchema = z.object({
  problem_type: z.string().min(1),
  /** How many times Alyssa has solved this problem type (the recurrence that triggers teaching). */
  solution_count: z.number().int().min(1).default(1),
  recurrence_evidence: z.array(z.string()).default([]),
});
export type DetectFrameworkInput = z.infer<typeof DetectFrameworkInputSchema>;

/** A named, teachable framework distilled from a recurring problem-solving pattern. Append-only. */
export const TaughtFrameworkSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  problem_type: z.string().min(1),
  explanation: z.string().min(1),
  artifacts: z.array(FrameworkArtifactSchema).default([]),
  /** 0..1 — how strong / repeatable the underlying pattern is (drives IP value). */
  strength: z.number().min(0).max(1).default(0.5),
  created_at: z.string().datetime(),
});
export type TaughtFramework = z.infer<typeof TaughtFrameworkSchema>;
