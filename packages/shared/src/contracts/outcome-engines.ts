import { z } from "zod";

/**
 * Outcome engines — Relaxation Outcome + True Progress. Alfy² optimizes for money created, risk controlled,
 * tasks delegated, systems running, founder freedom, and peace of mind — never busyness, more tasks, more
 * dashboards, or vanity metrics. It must never confuse intensity with progress. See
 * docs/adr/ADR-0107-outcome-engines.md. Mirrored in workers.
 */

// === Relaxation Outcome Engine ===

export const RelaxBucketSchema = z.enum([
  "must_do", "can_delegate", "can_automate", "can_ignore", "can_wait", "approval_only",
]);
export type RelaxBucket = z.infer<typeof RelaxBucketSchema>;

export const RelaxItemInputSchema = z.object({
  title: z.string().min(1),
  /** 0..1 — only Alyssa can do it / it's truly urgent. */
  requires_alyssa: z.number().min(0).max(1).default(0.5),
  automatable: z.boolean().default(false),
  delegatable: z.boolean().default(false),
  /** 0..1 — value/importance. */
  value: z.number().min(0).max(1).default(0.5),
  approval_only: z.boolean().default(false),
});
export type RelaxItemInput = z.infer<typeof RelaxItemInputSchema>;

export const RelaxPlanInputSchema = z.object({ items: z.array(RelaxItemInputSchema).default([]) });
export type RelaxPlanInput = z.infer<typeof RelaxPlanInputSchema>;

export const RelaxItemSchema = z.object({ title: z.string().min(1), bucket: RelaxBucketSchema });
export type RelaxItem = z.infer<typeof RelaxItemSchema>;

export const RelaxationPlanSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  items: z.array(RelaxItemSchema).default([]),
  /** What genuinely needs Alyssa so she can hand the rest off and relax. */
  must_do: z.array(z.string()).default([]),
  /** 0..1 — how much can be handled without her. */
  offload_ratio: z.number().min(0).max(1),
  created_at: z.string().datetime(),
});
export type RelaxationPlan = z.infer<typeof RelaxationPlanSchema>;

// === True Progress Engine ===

export const ProgressKindSchema = z.enum([
  "real_progress", "fake_progress", "maintenance", "distraction",
  "risk_reduction", "revenue_creation", "leverage_creation", "freedom_creation",
]);
export type ProgressKind = z.infer<typeof ProgressKindSchema>;

export const ProgressActionSchema = z.enum([
  "keep", "delegate", "automate", "pause", "delete", "simplify", "convert_to_ip", "move_to_later", "assign_to_agent",
]);
export type ProgressAction = z.infer<typeof ProgressActionSchema>;

export const AssessProgressInputSchema = z.object({
  initiative: z.string().min(1),
  /** 0..1 signals — what the initiative actually creates. */
  makes_money: z.number().min(0).max(1).default(0),
  reduces_risk: z.number().min(0).max(1).default(0),
  saves_future_time: z.number().min(0).max(1).default(0),
  increases_freedom: z.number().min(0).max(1).default(0),
  creates_reusable_assets: z.number().min(0).max(1).default(0),
  moves_a_goal: z.number().min(0).max(1).default(0),
  /** 0..1 — busyness/activity without outcome. */
  activity_only: z.number().min(0).max(1).default(0),
});
export type AssessProgressInput = z.infer<typeof AssessProgressInputSchema>;

export const ProgressAssessmentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  initiative: z.string().min(1),
  kind: ProgressKindSchema,
  /** 0..1 — real outcome value. */
  outcome_score: z.number().min(0).max(1),
  recommended_action: ProgressActionSchema,
  reason: z.string().min(1),
  created_at: z.string().datetime(),
});
export type ProgressAssessment = z.infer<typeof ProgressAssessmentSchema>;
