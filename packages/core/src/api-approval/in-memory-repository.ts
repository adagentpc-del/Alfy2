import type {
  ApiApprovalRequest as ApprovalRequest,
  ApiApprovalRequestStatus as ApprovalRequestStatus,
} from "@alfy2/shared";
import type {
  ApprovalRequestRepository,
  ApprovalListFilter,
} from "./repository.js";

/**
 * Reference {@link ApprovalRequestRepository} backed by an in-process Map keyed by
 * `${tenant}:${id}`. For tests and local runs only — the production store is the Supabase-backed
 * `api_approval_requests` table. Tenant isolation here is by the composite key (the database does it
 * via RLS).
 */
export class InMemoryApprovalRequestRepository implements ApprovalRequestRepository {
  private readonly requests = new Map<string, ApprovalRequest>();

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  async save(req: ApprovalRequest): Promise<void> {
    this.requests.set(this.key(req.tenant_id, req.id), structuredClone(req));
  }

  async get(tenantId: string, id: string): Promise<ApprovalRequest | null> {
    const r = this.requests.get(this.key(tenantId, id));
    return r ? structuredClone(r) : null;
  }

  async list(tenantId: string, filter: ApprovalListFilter = {}): Promise<ApprovalRequest[]> {
    const statuses =
      filter.statuses && filter.statuses.length > 0 ? new Set(filter.statuses) : null;
    let out = [...this.requests.values()].filter((r) => r.tenant_id === tenantId);
    if (statuses) out = out.filter((r) => statuses.has(r.status));
    out.sort((a, b) => b.created_at.localeCompare(a.created_at)); // newest first
    const limit = filter.limit ?? 100;
    out = out.slice(0, limit);
    return out.map((r) => structuredClone(r));
  }

  async setDecision(
    tenantId: string,
    id: string,
    status: ApprovalRequestStatus,
    decidedBy: string,
    reason: string,
    decidedAt: string,
  ): Promise<void> {
    const r = this.requests.get(this.key(tenantId, id));
    if (!r) return;
    r.status = status;
    r.decided_by = decidedBy;
    r.decision_reason = reason;
    r.decided_at = decidedAt;
  }
}
