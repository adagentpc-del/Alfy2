import { z } from "zod";

/**
 * Alyssa Pattern Mirror. Learns HOW Alyssa identifies patterns, connects ideas, evaluates opportunities, and
 * creates frameworks — her repeated thinking patterns, business pattern recognition, opportunity-detection
 * style, language preferences, decision criteria, intuition signals, bottlenecks, creative breakthroughs,
 * recurring themes, and founder instincts. The goal is NOT to imitate Alyssa but to amplify and PRESERVE her
 * pattern-recognition intelligence: personalize recommendations, suggest better agents, surface hidden
 * opportunities, and convert her thinking into frameworks (handed to the Teach My Framework engine as IP).
 * Observations are APPEND-ONLY. See docs/adr/ADR-0132-alyssa-pattern-mirror.md. Mirrored in workers.
 */

export const ThinkingPatternKindSchema = z.enum([
  "thinking_pattern", "business_pattern_recognition", "opportunity_detection_style",
  "language_preference", "decision_criterion", "intuition_signal", "bottleneck",
  "creative_breakthrough", "recurring_theme", "founder_instinct",
]);
export type ThinkingPatternKind = z.infer<typeof ThinkingPatternKindSchema>;

export const ObserveThinkingInputSchema = z.object({
  kind: ThinkingPatternKindSchema,
  observation: z.string().min(1),
  /** How many times this has been observed (drives framework_candidate). */
  occurrences: z.number().int().min(1).default(1),
  evidence_refs: z.array(z.string()).default([]),
});
export type ObserveThinkingInput = z.infer<typeof ObserveThinkingInputSchema>;

/** One observed slice of how Alyssa thinks. Append-only. */
export const ThinkingPatternObservationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: ThinkingPatternKindSchema,
  observation: z.string().min(1),
  occurrences: z.number().int().min(1).default(1),
  /** 0..1 — confidence this is a real, repeatable pattern rather than noise. */
  confidence: z.number().min(0).max(1).default(0.5),
  /** True when the pattern recurs enough to be worth converting into a teachable framework / IP. */
  framework_candidate: z.boolean().default(false),
  /** How the mirror would use it: personalize, suggest_agent, surface_opportunity, or build_framework. */
  amplification: z.enum(["personalize", "suggest_agent", "surface_opportunity", "build_framework"]),
  evidence_refs: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type ThinkingPatternObservation = z.infer<typeof ThinkingPatternObservationSchema>;
