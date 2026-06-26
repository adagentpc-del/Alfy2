import { z } from "zod";

/**
 * Algorithm Overlay System contracts. Reusable scoring algorithms that sit above agents, workflows, goals,
 * businesses, campaigns, and tasks. Each algorithm is transparent: a purpose, inputs, a simple rules-based
 * formula (Phase 1), a 0..1 score, a confidence, an explanation, and an override option. Every result
 * explains why it scored as it did, what data was used, what's missing, the recommended action, and
 * whether approval is required. See docs/adr/ADR-0066-algorithm-overlay.md. Mirrored in workers (Pydantic).
 */

/** The fifteen scoring algorithms. */
export const AlgorithmIdSchema = z.enum([
  "priority",
  "roi",
  "fastest_path_to_cash",
  "friction",
  "conversion_probability",
  "agent_need_detection",
  "opportunity_matching",
  "business_health",
  "goal_gap",
  "risk",
  "pattern_prediction",
  "energy_aware_scheduling",
  "knowledge_to_money",
  "portfolio_allocation",
  "ab_test_winner",
]);
export type AlgorithmId = z.infer<typeof AlgorithmIdSchema>;

/** The scoring phase (the system starts at rules-based and graduates with data). */
export const ScoringPhaseSchema = z.enum(["rules_based", "weighted", "historical", "predictive"]);
export type ScoringPhase = z.infer<typeof ScoringPhaseSchema>;

/** An algorithm's static descriptor. */
export const AlgorithmDescriptorSchema = z.object({
  id: AlgorithmIdSchema,
  name: z.string().min(1),
  purpose: z.string().min(1),
  inputs: z.array(z.string()).default([]),
  output: z.string().min(1),
  formula: z.string().min(1),
  dashboard_use: z.string().default(""),
  agent_use: z.string().default(""),
});
export type AlgorithmDescriptor = z.infer<typeof AlgorithmDescriptorSchema>;

/** A score request: the algorithm plus a flat bag of numeric/boolean signals. */
export const ScoreRequestSchema = z.object({
  algorithm: AlgorithmIdSchema,
  subject: z.string().min(1),
  /** Named 0..1 (or raw) signals the formula reads. */
  signals: z.record(z.string(), z.number()).default({}),
  /** Optional manual override of the score, 0..1. */
  override: z.number().min(0).max(1).nullable().default(null),
});
export type ScoreRequest = z.infer<typeof ScoreRequestSchema>;

/** A transparent, explained score. */
export const AlgorithmScoreSchema = z.object({
  algorithm: AlgorithmIdSchema,
  subject: z.string().min(1),
  phase: ScoringPhaseSchema,
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  /** Why it scored high (or low). */
  why: z.string().min(1),
  data_used: z.array(z.string()).default([]),
  data_missing: z.array(z.string()).default([]),
  recommended_action: z.string().min(1),
  requires_approval: z.boolean().default(false),
  overridden: z.boolean().default(false),
});
export type AlgorithmScore = z.infer<typeof AlgorithmScoreSchema>;
