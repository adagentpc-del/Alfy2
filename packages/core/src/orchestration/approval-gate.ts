import type { Action } from "@alfy2/shared";

/**
 * The Approval Gate (ARCHITECTURE.md §3.4). Any action with `reversible: false` is intercepted and
 * queued for human approval; execution halts until resolved. Reversible actions may auto-execute
 * when policy allows (still logged). Modules CANNOT bypass this — it lives in the dispatch path.
 */

export interface ApprovalRequest {
  tenant_id: string;
  trace_id?: string;
  action_label: string;
  action_payload: Record<string, unknown>;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

/** Persistence port. Pending approvals must survive restarts — never in-memory only in production. */
export interface ApprovalStore {
  create(request: ApprovalRequest): Promise<{ id: string; status: ApprovalStatus }>;
  resolve(id: string, status: "approved" | "rejected", resolvedBy: string): Promise<void>;
}

export interface GatePolicy {
  /** From config FLAG_APPROVAL_AUTOEXECUTE_REVERSIBLE. */
  autoExecuteReversible: boolean;
}

export type GateDecision =
  | { execute: true }
  | { execute: false; reason: "approval_required"; approvalId: string };

export class ApprovalGate {
  constructor(
    private readonly store: ApprovalStore,
    private readonly policy: GatePolicy,
  ) {}

  /**
   * Decide whether an action may execute now.
   * - reversible + policy allows  => execute immediately.
   * - reversible + policy denies   => queue for approval.
   * - irreversible (always)        => queue for approval.
   */
  async evaluate(
    action: Action,
    ctx: { tenant_id: string; trace_id?: string },
  ): Promise<GateDecision> {
    if (action.reversible && this.policy.autoExecuteReversible) {
      return { execute: true };
    }
    const request: ApprovalRequest = {
      tenant_id: ctx.tenant_id,
      action_label: action.label,
      action_payload: action.payload,
      ...(ctx.trace_id !== undefined ? { trace_id: ctx.trace_id } : {}),
    };
    const { id } = await this.store.create(request);
    return { execute: false, reason: "approval_required", approvalId: id };
  }
}

/** In-memory store for tests/Phase-0 only. Production uses the Supabase-backed approvals table. */
export class InMemoryApprovalStore implements ApprovalStore {
  readonly records = new Map<string, ApprovalRequest & { status: ApprovalStatus }>();
  async create(request: ApprovalRequest): Promise<{ id: string; status: ApprovalStatus }> {
    const id = crypto.randomUUID();
    this.records.set(id, { ...request, status: "pending" });
    return { id, status: "pending" };
  }
  async resolve(id: string, status: "approved" | "rejected"): Promise<void> {
    const rec = this.records.get(id);
    if (!rec) throw new Error(`Unknown approval: ${id}`);
    rec.status = status;
  }
}
