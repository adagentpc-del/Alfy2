import type {
  DecisionRecord,
  DecisionRecordStatus,
} from "@alfy2/shared";

/**
 * Persistence PORT for the Advisory Decision Engine (§35). Core defines the interface only; the
 * concrete store (Supabase, table `decision_records`) is injected so the engine stays
 * infrastructure-free. An in-memory reference implementation ships for tests and local runs.
 *
 * A stored row is the full {@link DecisionRecord}. The operator advances `status` from "open" to
 * "approved"/"rejected"/"deferred" via {@link DecisionRecordRepository.setDecision}.
 */

export interface DecisionListFilter {
  /** Restrict to these statuses (empty/omitted = any). */
  statuses?: DecisionRecordStatus[];
  /** Max rows, newest first. Default 100. */
  limit?: number;
}

export interface DecisionRecordRepository {
  /** Insert or replace a decision record by id (within its tenant). */
  save(rec: DecisionRecord): Promise<void>;
  get(tenantId: string, id: string): Promise<DecisionRecord | null>;
  /** Tenant-scoped list, newest first, optionally filtered by status. */
  list(tenantId: string, filter?: DecisionListFilter): Promise<DecisionRecord[]>;
  /** Record the operator's decision (status + when). */
  setDecision(
    tenantId: string,
    id: string,
    status: DecisionRecordStatus,
    decidedAt: string,
  ): Promise<void>;
}
