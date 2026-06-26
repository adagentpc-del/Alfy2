import {
  ExecFlowRequestSchema,
  FlowDecisionSchema,
  type ExecFlowRequest,
  type FlowDecision,
  type LayerAssignment,
  type Layer,
} from "@alfy2/shared";

/**
 * Brain/Hands Separation (docs/adr/ADR-0096-brain-hands.md). Alfy² is layered: the Executive Brain
 * recommends, the Policy Layer governs, the Orchestrator coordinates, and the Execution Layer (Hands)
 * executes. The catalog below maps each engine to its layer. The rule this registry enforces: no execution
 * tool may bypass policy, approvals, or audit — an execution action is allowed only if it flowed Brain →
 * Policy → Orchestrator, will be audited, and is not blocked on a required approval. Pure; no per-tenant
 * state.
 */

/** The static catalog mapping Alfy²'s engines to their layer. */
export const LAYER_CATALOG: LayerAssignment[] = [
  // Brain — recommends.
  { capability: "Memory", layer: "brain", engine_module: "memory" },
  { capability: "Goal Engine", layer: "brain", engine_module: "goal-engine" },
  { capability: "Decision", layer: "brain", engine_module: "decision" },
  { capability: "Knowledge Graph", layer: "brain", engine_module: "knowledge-graph" },
  { capability: "Pattern Engine", layer: "brain", engine_module: "pattern-engine" },
  { capability: "Simulation", layer: "brain", engine_module: "simulation" },
  // Policy — governs.
  { capability: "Constitution", layer: "policy", engine_module: "constitution" },
  { capability: "Security Gate", layer: "policy", engine_module: "security" },
  { capability: "Permission Checker", layer: "policy", engine_module: "tenancy" },
  { capability: "Persistent Approval", layer: "policy", engine_module: "persistent-approval" },
  { capability: "Cost CFO", layer: "policy", engine_module: "cost-cfo" },
  // Orchestrator — coordinates.
  { capability: "Model Router", layer: "orchestrator", engine_module: "model-router" },
  { capability: "Agent Council", layer: "orchestrator", engine_module: "agent-council" },
  // Execution — Hands.
  { capability: "Agent Factory", layer: "execution", engine_module: "agent-factory" },
  { capability: "Connector Registry", layer: "execution", engine_module: "connector-registry" },
  { capability: "Campaign", layer: "execution", engine_module: "campaign" },
  { capability: "Media OS", layer: "execution", engine_module: "media-os" },
];

export class BrainHandsRegistry {
  private readonly catalog: LayerAssignment[];

  constructor(catalog: LayerAssignment[] = LAYER_CATALOG) {
    this.catalog = catalog;
  }

  /** Which layer a capability belongs to (by capability name or engine module). */
  layerOf(capabilityOrModule: string): Layer | undefined {
    return this.catalog.find(
      (a) => a.capability === capabilityOrModule || a.engine_module === capabilityOrModule,
    )?.layer;
  }

  byLayer(layer: Layer): LayerAssignment[] {
    return this.catalog.filter((a) => a.layer === layer);
  }

  /**
   * Guard an execution-layer action. It is ALLOWED only if it flowed Brain → Policy → Orchestrator, an
   * audit record will be written, and it is not blocked on a required-but-missing approval. Any missing
   * layer is a bypass attempt → denied. No execution may bypass policy, approvals, or audit.
   */
  guard(request: ExecFlowRequest): FlowDecision {
    const r = ExecFlowRequestSchema.parse(request);
    const missing: string[] = [];
    if (!r.brain_recommended) missing.push("brain");
    if (!r.policy_cleared) missing.push("policy");
    if (!r.orchestrator_routed) missing.push("orchestrator");
    if (!r.audited) missing.push("audit");
    if (r.approved === false) missing.push("approval");

    const allowed = missing.length === 0;
    if (allowed) {
      return FlowDecisionSchema.parse({
        allowed: true,
        bypass_attempt: false,
        missing_layers: [],
        reason: `Execution of "${r.capability}" flowed Brain → Policy → Orchestrator${r.approved === true ? " with approval" : ""} and will be audited.`,
      });
    }
    return FlowDecisionSchema.parse({
      allowed: false,
      bypass_attempt: true,
      missing_layers: missing,
      reason: `Execution of "${r.capability}" tried to bypass a layer — missing: ${missing.join(", ")}. No execution may bypass policy, approvals, or audit.`,
    });
  }
}
