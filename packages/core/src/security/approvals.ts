import {
  ApprovalRequestSchema,
  type ApprovalRequest,
  type ApprovalStatus,
  type Role,
  type SensitiveActionClass,
} from "@alfy2/shared";

/**
 * The approval queue / workflow. When the Security Gate decides an action needs approval, it enqueues
 * a pending ApprovalRequest here. A human with the required role (or higher) approves or rejects it;
 * nothing executes until then. Tenant-scoped. Approval/rejection is expected to be re-audited by the
 * caller (the gate exposes the audit id on each request).
 */

const ROLE_RANK: Record<Role, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

export class ApprovalQueueError extends Error {}

export interface EnqueueInput {
  tenant_id: string;
  requested_by: string;
  action: string;
  action_class?: SensitiveActionClass | null;
  resource?: string;
  reason?: string;
  required_role?: Role;
  audit_id: string;
}

export class ApprovalQueue {
  private readonly requests = new Map<string, ApprovalRequest>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Queue a pending approval and return it. */
  enqueue(input: EnqueueInput): ApprovalRequest {
    const req = ApprovalRequestSchema.parse({
      id: this.newId(),
      tenant_id: input.tenant_id,
      requested_by: input.requested_by,
      action: input.action,
      action_class: input.action_class ?? null,
      resource: input.resource ?? "",
      reason: input.reason ?? "",
      status: "pending",
      required_role: input.required_role ?? "owner",
      created_at: this.clock().toISOString(),
      resolved_at: null,
      resolved_by: null,
      audit_id: input.audit_id,
    });
    this.requests.set(req.id, req);
    return req;
  }

  get(tenantId: string, id: string): ApprovalRequest | undefined {
    const r = this.requests.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  /** Approve a pending request. The approver's role must meet/exceed the required role. */
  approve(tenantId: string, id: string, by: string, approverRoles: Role[]): ApprovalRequest {
    return this.resolve(tenantId, id, "approved", by, approverRoles);
  }

  /** Reject a pending request (same role requirement as approval). */
  reject(tenantId: string, id: string, by: string, approverRoles: Role[]): ApprovalRequest {
    return this.resolve(tenantId, id, "rejected", by, approverRoles);
  }

  private resolve(
    tenantId: string,
    id: string,
    status: Extract<ApprovalStatus, "approved" | "rejected">,
    by: string,
    approverRoles: Role[],
  ): ApprovalRequest {
    const req = this.get(tenantId, id);
    if (!req) throw new ApprovalQueueError(`No approval request ${id} in tenant ${tenantId}.`);
    if (req.status !== "pending") {
      throw new ApprovalQueueError(`Approval ${id} is already ${req.status}.`);
    }
    const need = ROLE_RANK[req.required_role];
    const have = Math.max(-1, ...approverRoles.map((r) => ROLE_RANK[r]));
    if (have < need) {
      throw new ApprovalQueueError(
        `Approver ${by} lacks the required role (${req.required_role}) to resolve this request.`,
      );
    }
    const resolved: ApprovalRequest = {
      ...req,
      status,
      resolved_at: this.clock().toISOString(),
      resolved_by: by,
    };
    this.requests.set(id, resolved);
    return resolved;
  }

  /** Pending (or other-status) requests for a tenant. */
  list(tenantId: string, status?: ApprovalStatus): ApprovalRequest[] {
    return [...this.requests.values()].filter(
      (r) => r.tenant_id === tenantId && (status ? r.status === status : true),
    );
  }
}
