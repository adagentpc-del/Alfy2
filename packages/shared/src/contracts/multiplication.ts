import { z } from "zod";

/**
 * Multiplication Engine contracts. Never solve a problem only once. Whenever Alfy² solves a problem, it
 * asks whether the solution can help another business, department, workflow, agent, future Alyssa, future
 * FounderOS users, clients, partners, or investors — and if so recommends converting it into shared
 * infrastructure, workflow, template, automation, agent, asset, knowledge, or a FounderOS feature. The
 * Multiplication Score estimates how many future uses it will create. The objective is leverage:
 * 1 solution → 100 uses → 1000 hours saved → 10000 future decisions improved. See
 * docs/adr/ADR-0085-multiplication-engine.md. Mirrored in workers (Pydantic).
 */

/** Who/what a solution could help. */
export const MultiplicationTargetSchema = z.enum([
  "another_business", "another_department", "another_workflow", "another_agent", "future_alyssa",
  "future_founderos_users", "clients", "partners", "investors",
]);
export type MultiplicationTarget = z.infer<typeof MultiplicationTargetSchema>;

/** The shared forms a solution can be converted into. */
export const SharedFormSchema = z.enum([
  "shared_infrastructure", "shared_workflow", "shared_template", "shared_automation",
  "shared_agent", "shared_asset", "shared_knowledge", "founderos_feature",
]);
export type SharedForm = z.infer<typeof SharedFormSchema>;

export const EvaluateMultiplicationInputSchema = z.object({
  solution_title: z.string().min(1),
  solution_summary: z.string().default(""),
  business_id: z.string().uuid().nullable().default(null),
  /** The targets this could plausibly help. */
  helps: z.array(MultiplicationTargetSchema).default([]),
  /** Estimated uses per target (drives the score). */
  estimated_uses_per_target: z.number().nonnegative().default(1),
});
export type EvaluateMultiplicationInput = z.infer<typeof EvaluateMultiplicationInputSchema>;

/** The multiplication evaluation. */
export const MultiplicationEvaluationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  solution_title: z.string().min(1),
  helps: z.array(MultiplicationTargetSchema).default([]),
  recommended_shared_forms: z.array(SharedFormSchema).default([]),
  /** Estimated total future uses (targets × uses-per-target). */
  estimated_future_uses: z.number().int().nonnegative(),
  /** 0..1 — multiplication leverage. */
  multiplication_score: z.number().min(0).max(1),
  recommend_share: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type MultiplicationEvaluation = z.infer<typeof MultiplicationEvaluationSchema>;
