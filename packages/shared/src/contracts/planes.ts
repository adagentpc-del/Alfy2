import { z } from "zod";

/**
 * Control Plane / Execution Plane contracts. Alfy² is split into two planes: the Control Plane governs
 * (policy, identity, permissions, approvals, routing, evaluations, observability, audit logs, cost
 * controls, risk controls) and the Execution Plane does the work (agents, workflows, automations,
 * connectors, tools, campaigns, repo actions, content generation). The rule: execution can move fast
 * only inside Control Plane boundaries — no agent may bypass the Control Plane. See
 * docs/adr/ADR-0046-control-execution-planes.md. Mirrored in workers (Pydantic).
 */

export const PlaneSchema = z.enum(["control", "execution"]);
export type Plane = z.infer<typeof PlaneSchema>;

/** The ten Control Plane concerns. */
export const ControlConcernSchema = z.enum([
  "policy",
  "identity",
  "permissions",
  "approvals",
  "routing",
  "evaluations",
  "observability",
  "audit_logs",
  "cost_controls",
  "risk_controls",
]);
export type ControlConcern = z.infer<typeof ControlConcernSchema>;

/** The eight Execution Plane concerns. */
export const ExecutionConcernSchema = z.enum([
  "agents",
  "workflows",
  "automations",
  "connectors",
  "tools",
  "campaigns",
  "repo_actions",
  "content_generation",
]);
export type ExecutionConcern = z.infer<typeof ExecutionConcernSchema>;

/** A capability tagged with the plane it belongs to. */
export const PlaneAssignmentSchema = z.object({
  capability: z.string().min(1),
  plane: PlaneSchema,
  /** The concern (a ControlConcern or ExecutionConcern value). */
  concern: z.string().min(1),
  /** The engine module that owns it. */
  engine_module: z.string().default(""),
});
export type PlaneAssignment = z.infer<typeof PlaneAssignmentSchema>;

/** An execution-plane action requesting to run — it must carry proof it passed the Control Plane gates. */
export const ExecutionRequestSchema = z.object({
  capability: z.string().min(1),
  concern: ExecutionConcernSchema,
  /** The Control Plane gates this action cleared. */
  identity_verified: z.boolean().default(false),
  policy_checked: z.boolean().default(false),
  permitted: z.boolean().default(false),
  /** Approval state: true = approved, false = required-but-missing, null = not required. */
  approved: z.boolean().nullable().default(null),
});
export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

/** The Control Plane's verdict on an execution request. */
export const PlaneDecisionSchema = z.object({
  allowed: z.boolean(),
  /** True when the action tried to run without clearing a required Control Plane gate. */
  bypass_attempt: z.boolean(),
  missing_gates: z.array(z.string()).default([]),
  reason: z.string().min(1),
});
export type PlaneDecision = z.infer<typeof PlaneDecisionSchema>;
