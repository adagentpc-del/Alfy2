import { z } from "zod";

/**
 * Anti-Fragility Engine. Don't merely withstand failures — improve because of them. For every failure it
 * finds the root cause, whether it was preventable, the reusable lesson, and the new safeguard / automation
 * / agent / SOP / system redesign it implies, and measures recovery speed, learning gained, and future risk
 * reduction. See docs/adr/ADR-0095-anti-fragility.md. Mirrored in workers.
 */

export const FailureTypeSchema = z.enum([
  "missed_opportunity", "failed_launch", "security_incident", "rejected_proposal", "lost_sale",
  "customer_complaint", "agent_failure", "workflow_breakdown", "model_error",
]);
export type FailureType = z.infer<typeof FailureTypeSchema>;

export const AnalyzeFailureInputSchema = z.object({
  type: FailureTypeSchema,
  title: z.string().min(1),
  detail: z.string().default(""),
  /** Days from failure to recovery (lower = more resilient). */
  recovery_days: z.number().nonnegative().default(0),
  preventable: z.boolean().default(true),
  business_id: z.string().uuid().nullable().default(null),
});
export type AnalyzeFailureInput = z.infer<typeof AnalyzeFailureInputSchema>;

/** The anti-fragile response to a failure. */
export const AntiFragilityCaseSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  type: FailureTypeSchema,
  title: z.string().min(1),
  root_cause: z.string().default(""),
  preventable: z.boolean(),
  reusable_lesson: z.string().default(""),
  new_safeguard: z.string().default(""),
  new_automation: z.string().default(""),
  new_agent: z.string().default(""),
  new_sop: z.string().default(""),
  system_redesign: z.string().default(""),
  recovery_days: z.number().nonnegative(),
  /** 0..1 — learning extracted. */
  learning_gained: z.number().min(0).max(1),
  /** 0..1 — estimated future risk reduction from the response. */
  future_risk_reduction: z.number().min(0).max(1),
  created_at: z.string().datetime(),
});
export type AntiFragilityCase = z.infer<typeof AntiFragilityCaseSchema>;
