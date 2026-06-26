import type {
  ApiApprovalRequest as ApprovalRequest,
  ApiApprovalRequestStatus as ApprovalRequestStatus,
} from "@alfy2/shared";

/**
 * Persistence PORT for the API Approval Gate. Core defines the interface only; the concrete store
 * (Supabase, table `api_approval_requests`) is injected so the gate stays infrastructure-free. An
 * in-memory reference implementation ships for tests and local runs.
 *
 * A stored row is the full {@link ApprovalRequest}. The operator advances `status` from "pending" to
 * "approved"/"denied" via {@link ApprovalRequestRepository.setDecision}; "expired" is reached when an
 * undecided request ages out.
 */

export interface ApprovalListFilter {
  /** Restrict to these statuses (empty/omitted = any). */
  statuses?: ApprovalRequestStatus[];
  /** Max rows, newest first. Default 100. */
  limit?: number;
}

export interface ApprovalRequestRepository {
  /** Insert or replace an approval request by id (within its tenant). */
  save(req: ApprovalRequest): Promise<void>;
  get(tenantId: string, id: string): Promise<ApprovalRequest | null>;
  /** Tenant-scoped list, newest first, optionally filtered by status. */
  list(tenantId: string, filter?: ApprovalListFilter): Promise<ApprovalRequest[]>;
  /** Record an operator decision (status + who/why/when). */
  setDecision(
    tenantId: string,
    id: string,
    status: ApprovalRequestStatus,
    decidedBy: string,
    reason: string,
    decidedAt: string,
  ): Promise<void>;
}
