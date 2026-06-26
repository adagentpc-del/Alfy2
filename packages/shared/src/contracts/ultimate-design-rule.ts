import { z } from "zod";

/**
 * The Ultimate Design Rule — the admission gate that sits above the README and the Constitution. A feature
 * belongs in Alfy² only if it increases leverage, reduces friction, compounds knowledge, protects trust,
 * generates measurable value, or increases founder freedom. If it does none of these, it does not belong.
 * See docs/adr/ADR-0121-ultimate-design-rule.md. Mirrored in workers.
 */

export const DesignRuleCriterionSchema = z.enum([
  "increases_leverage", "reduces_friction", "compounds_knowledge",
  "protects_trust", "generates_measurable_value", "increases_founder_freedom",
]);
export type DesignRuleCriterion = z.infer<typeof DesignRuleCriterionSchema>;

export const EvaluateFeatureInputSchema = z.object({
  feature: z.string().min(1),
  /** 0..1 — how strongly the feature satisfies each criterion. */
  increases_leverage: z.number().min(0).max(1).default(0),
  reduces_friction: z.number().min(0).max(1).default(0),
  compounds_knowledge: z.number().min(0).max(1).default(0),
  protects_trust: z.number().min(0).max(1).default(0),
  generates_measurable_value: z.number().min(0).max(1).default(0),
  increases_founder_freedom: z.number().min(0).max(1).default(0),
  /** Criteria are satisfied at or above this strength. */
  threshold: z.number().min(0).max(1).default(0.5),
});
export type EvaluateFeatureInput = z.infer<typeof EvaluateFeatureInputSchema>;

/** The admission verdict. */
export const DesignRuleVerdictSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  feature: z.string().min(1),
  satisfied: z.array(DesignRuleCriterionSchema).default([]),
  /** True when at least one criterion is satisfied — the feature belongs. */
  belongs: z.boolean(),
  verdict: z.string().min(1),
  created_at: z.string().datetime(),
});
export type DesignRuleVerdict = z.infer<typeof DesignRuleVerdictSchema>;
