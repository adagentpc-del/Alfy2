import { z } from "zod";

/**
 * Executive Delegation System. Identifies what Alyssa should NOT do herself by classifying each task to an
 * owner, keeping her focused on vision, relationships, high-value sales, strategic decisions, creative
 * insight, and approvals. See docs/adr/ADR-0102-delegation.md. Mirrored in workers.
 */

export const TaskOwnerSchema = z.enum([
  "alyssa_only", "ai_agent", "human_contractor", "specialist", "attorney_cpa", "assistant",
  "automation", "defer", "delete",
]);
export type TaskOwner = z.infer<typeof TaskOwnerSchema>;

export const ClassifyTaskInputSchema = z.object({
  task: z.string().min(1),
  /** Founder hours the task would cost. */
  founder_time_cost_hours: z.number().nonnegative().default(0),
  /** 0..1 — specialized skill required. */
  skill_requirement: z.number().min(0).max(1).default(0.5),
  risk: z.number().min(0).max(1).default(0.3),
  /** 0..1 — how repeatable it is. */
  repeatability: z.number().min(0).max(1).default(0.5),
  /** 0..1 — readiness to delegate cleanly. */
  delegation_readiness: z.number().min(0).max(1).default(0.5),
  sop_available: z.boolean().default(false),
  /** Does it genuinely need Alyssa's vision/relationship/creativity/approval? */
  needs_alyssa_judgment: z.boolean().default(false),
  business_id: z.string().uuid().nullable().default(null),
});
export type ClassifyTaskInput = z.infer<typeof ClassifyTaskInputSchema>;

export const DelegationDecisionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  task: z.string().min(1),
  owner: TaskOwnerSchema,
  reason: z.string().min(1),
  /** Founder hours returned by offloading it. */
  hours_returned: z.number().nonnegative(),
  created_at: z.string().datetime(),
});
export type DelegationDecision = z.infer<typeof DelegationDecisionSchema>;
