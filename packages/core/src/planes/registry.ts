import {
  ExecutionRequestSchema,
  PlaneDecisionSchema,
  type ExecutionRequest,
  type PlaneDecision,
  type PlaneAssignment,
  type Plane,
} from "@alfy2/shared";

/**
 * The Control / Execution Plane registry (docs/adr/ADR-0046-control-execution-planes.md). Alfy² is split
 * into two planes: the Control Plane governs (policy, identity, permissions, approvals, routing,
 * evaluations, observability, audit logs, cost controls, risk controls) and the Execution Plane does the
 * work (agents, workflows, automations, connectors, tools, campaigns, repo actions, content generation).
 * The rule this registry enforces: execution can move fast only inside Control Plane boundaries — no agent
 * may bypass the Control Plane. Deterministic. The plane catalog is static architecture metadata.
 */

/** The static catalog mapping Alfy²'s engines to their plane and concern. */
export const PLANE_CATALOG: PlaneAssignment[] = [
  // Control Plane
  { capability: "AI Center of Excellence", plane: "control", concern: "policy", engine_module: "ai-coe" },
  { capability: "Agent Identity & Zero Trust", plane: "control", concern: "identity", engine_module: "agent-identity" },
  { capability: "Permission Checker", plane: "control", concern: "permissions", engine_module: "tenancy" },
  { capability: "Persistent Approval", plane: "control", concern: "approvals", engine_module: "persistent-approval" },
  { capability: "Security Gate", plane: "control", concern: "approvals", engine_module: "security" },
  { capability: "Model Router", plane: "control", concern: "routing", engine_module: "model-router" },
  { capability: "Agent Evaluation Lab", plane: "control", concern: "evaluations", engine_module: "agent-eval" },
  { capability: "Agent Observability", plane: "control", concern: "observability", engine_module: "agent-observability" },
  { capability: "Audit Log", plane: "control", concern: "audit_logs", engine_module: "security" },
  { capability: "Cost & Token CFO", plane: "control", concern: "cost_controls", engine_module: "cost-cfo" },
  { capability: "Source-of-Truth Management", plane: "control", concern: "risk_controls", engine_module: "source-of-truth" },
  // Execution Plane
  { capability: "Agent Factory", plane: "execution", concern: "agents", engine_module: "agent-factory" },
  { capability: "Domain Operating Models", plane: "execution", concern: "workflows", engine_module: "domain-model" },
  { capability: "Follow-Up Autopilot", plane: "execution", concern: "automations", engine_module: "follow-up" },
  { capability: "Connector Registry", plane: "execution", concern: "connectors", engine_module: "connector-registry" },
  { capability: "GitHub Intelligence", plane: "execution", concern: "tools", engine_module: "github-intelligence" },
  { capability: "Campaign Intelligence", plane: "execution", concern: "campaigns", engine_module: "campaign" },
  { capability: "Conversion War Room", plane: "execution", concern: "campaigns", engine_module: "war-room" },
  { capability: "Sales Asset Generator", plane: "execution", concern: "content_generation", engine_module: "sales-asset" },
  { capability: "Knowledge Vault", plane: "execution", concern: "content_generation", engine_module: "knowledge-vault" },
];

export class PlaneRegistry {
  private readonly catalog: PlaneAssignment[];

  constructor(catalog: PlaneAssignment[] = PLANE_CATALOG) {
    this.catalog = catalog;
  }

  /** Which plane a capability belongs to (by capability name or engine module). */
  planeOf(capabilityOrModule: string): Plane | undefined {
    return this.catalog.find((a) => a.capability === capabilityOrModule || a.engine_module === capabilityOrModule)?.plane;
  }

  byPlane(plane: Plane): PlaneAssignment[] {
    return this.catalog.filter((a) => a.plane === plane);
  }

  /**
   * Guard an execution-plane action. It is ALLOWED only if it cleared every required Control Plane gate:
   * identity verified, policy checked, and permitted; plus, if approval was required (approved !== null),
   * it must be approved. Any missing gate is a Control Plane BYPASS attempt → denied. This is the rule:
   * no agent may bypass the Control Plane.
   */
  guard(request: ExecutionRequest): PlaneDecision {
    const r = ExecutionRequestSchema.parse(request);
    const missing: string[] = [];
    if (!r.identity_verified) missing.push("identity");
    if (!r.policy_checked) missing.push("policy");
    if (!r.permitted) missing.push("permissions");
    if (r.approved === false) missing.push("approval");

    if (missing.length === 0) {
      return PlaneDecisionSchema.parse({
        allowed: true,
        bypass_attempt: false,
        missing_gates: [],
        reason: `Execution of "${r.capability}" cleared the Control Plane (identity, policy, permissions${r.approved === true ? ", approval" : ""}).`,
      });
    }
    return PlaneDecisionSchema.parse({
      allowed: false,
      bypass_attempt: true,
      missing_gates: missing,
      reason: `Execution of "${r.capability}" tried to bypass the Control Plane — missing: ${missing.join(", ")}. No agent may bypass the Control Plane.`,
    });
  }
}
