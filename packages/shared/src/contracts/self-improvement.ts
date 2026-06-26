import { z } from "zod";

/**
 * Enterprise Self-Improvement Engine. Every month it evaluates the operating system itself — what is slow,
 * duplicated, fragile, confusing, or should be simplified, merged, retired, or promoted to infrastructure —
 * and produces a refactoring plan and tech-debt report. The goal: Alfy² improves continuously without
 * becoming more complicated. See docs/adr/ADR-0117-self-improvement.md. Complements Continuous Improvement.
 *
 * SUBSUMES the Simplicity Engine (rather than building a parallel engine — "can two systems become one?").
 * It also hunts duplicate agents / workflows / assets / prompts and unnecessary approvals / dashboards /
 * clicks / complexity, and scores the system on four axes so Alfy² becomes more powerful while feeling
 * simpler every month: complexity hidden, power exposed.
 */

export const SelfImprovementFindingKindSchema = z.enum([
  "slow", "duplicated", "fragile", "confusing", "simplify", "merge", "retire", "promote_to_infrastructure",
  // Simplicity Engine findings
  "duplicate_agent", "duplicate_workflow", "duplicate_asset", "duplicate_prompt",
  "unnecessary_approval", "unnecessary_dashboard", "unnecessary_click", "unnecessary_complexity",
]);
export type SelfImprovementFindingKind = z.infer<typeof SelfImprovementFindingKindSchema>;

export const SystemComponentInputSchema = z.object({
  component: z.string().min(1),
  /** 0..1 signals. */
  latency: z.number().min(0).max(1).default(0.3),
  duplication: z.number().min(0).max(1).default(0),
  fragility: z.number().min(0).max(1).default(0.2),
  confusion: z.number().min(0).max(1).default(0.2),
  usage: z.number().min(0).max(1).default(0.5),
  /** 0..1 — how broadly reused it could be if promoted. */
  reuse_potential: z.number().min(0).max(1).default(0.3),
});
export type SystemComponentInput = z.infer<typeof SystemComponentInputSchema>;

export const EvaluateSystemInputSchema = z.object({
  period_label: z.string().min(1),
  components: z.array(SystemComponentInputSchema).default([]),
});
export type EvaluateSystemInput = z.infer<typeof EvaluateSystemInputSchema>;

export const SelfImprovementFindingSchema = z.object({
  component: z.string().min(1),
  kind: SelfImprovementFindingKindSchema,
  recommendation: z.string().min(1),
  /** 0..1 — priority. */
  priority: z.number().min(0).max(1),
});
export type SelfImprovementFinding = z.infer<typeof SelfImprovementFindingSchema>;

/** The monthly self-evaluation report. */
export const SelfImprovementReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  period_label: z.string().min(1),
  findings: z.array(SelfImprovementFindingSchema).default([]),
  refactoring_plan: z.array(z.string()).default([]),
  tech_debt: z.array(z.string()).default([]),
  /** 0..1 — net complexity change the plan implies (negative-leaning = simpler). */
  complexity_delta: z.number().min(-1).max(1),
  /** Simplicity Engine scores (0..1). Lower complexity/friction is better; higher leverage/maintainability is better. */
  complexity_score: z.number().min(0).max(1).default(0.5),
  leverage_score: z.number().min(0).max(1).default(0.5),
  maintainability_score: z.number().min(0).max(1).default(0.5),
  user_friction_score: z.number().min(0).max(1).default(0.5),
  created_at: z.string().datetime(),
});
export type SelfImprovementReport = z.infer<typeof SelfImprovementReportSchema>;
