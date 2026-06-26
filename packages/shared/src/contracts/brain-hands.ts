import { z } from "zod";

/**
 * Brain/Hands Separation. Alfy² is layered: the Executive Brain recommends, the Policy Layer governs, the
 * Orchestrator coordinates, and the Execution Layer (Hands) executes. No execution tool may bypass policy,
 * approvals, or audit logging. See docs/adr/ADR-0096-brain-hands.md. Mirrored in workers.
 */

export const LayerSchema = z.enum(["brain", "policy", "orchestrator", "execution"]);
export type Layer = z.infer<typeof LayerSchema>;

/** A capability tagged with its layer. */
export const LayerAssignmentSchema = z.object({
  capability: z.string().min(1),
  layer: LayerSchema,
  engine_module: z.string().default(""),
});
export type LayerAssignment = z.infer<typeof LayerAssignmentSchema>;

/** An execution-layer action requesting to run — it must show it flowed Brain → Policy → Orchestrator. */
export const ExecFlowRequestSchema = z.object({
  capability: z.string().min(1),
  /** Brain recommended it. */
  brain_recommended: z.boolean().default(false),
  /** Policy (constitution/permissions/risk/approvals) cleared it. */
  policy_cleared: z.boolean().default(false),
  /** Approval obtained (true), required-but-missing (false), or not required (null). */
  approved: z.boolean().nullable().default(null),
  /** Orchestrator routed/authorized it. */
  orchestrator_routed: z.boolean().default(false),
  /** An audit record will be written. */
  audited: z.boolean().default(false),
});
export type ExecFlowRequest = z.infer<typeof ExecFlowRequestSchema>;

export const FlowDecisionSchema = z.object({
  allowed: z.boolean(),
  /** True when the action tried to skip a layer (bypass). */
  bypass_attempt: z.boolean(),
  missing_layers: z.array(z.string()).default([]),
  reason: z.string().min(1),
});
export type FlowDecision = z.infer<typeof FlowDecisionSchema>;
