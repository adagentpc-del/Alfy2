import type {
  DecisionRecord,
  DecisionRecordStatus,
} from "@alfy2/shared";
import type {
  DecisionRecordRepository,
  DecisionListFilter,
} from "./repository.js";

/**
 * Reference {@link DecisionRecordRepository} backed by an in-process Map keyed by `${tenant}:${id}`.
 * For tests and local runs only — the production store is the Supabase-backed `decision_records`
 * table. Tenant isolation here is by the composite key (the database does it via RLS).
 */
export class InMemoryDecisionRecordRepository implements DecisionRecordRepository {
  private readonly records = new Map<string, DecisionRecord>();

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  async save(rec: DecisionRecord): Promise<void> {
    this.records.set(this.key(rec.tenant_id, rec.id), structuredClone(rec));
  }

  async get(tenantId: string, id: string): Promise<DecisionRecord | null> {
    const r = this.records.get(this.key(tenantId, id));
    return r ? structuredClone(r) : null;
  }

  async list(tenantId: string, filter: DecisionListFilter = {}): Promise<DecisionRecord[]> {
    const statuses =
      filter.statuses && filter.statuses.length > 0 ? new Set(filter.statuses) : null;
    let out = [...this.records.values()].filter((r) => r.tenant_id === tenantId);
    if (statuses) out = out.filter((r) => statuses.has(r.status));
    out.sort((a, b) => b.created_at.localeCompare(a.created_at)); // newest first
    const limit = filter.limit ?? 100;
    out = out.slice(0, limit);
    return out.map((r) => structuredClone(r));
  }

  async setDecision(
    tenantId: string,
    id: string,
    status: DecisionRecordStatus,
    decidedAt: string,
  ): Promise<void> {
    const r = this.records.get(this.key(tenantId, id));
    if (!r) return;
    r.status = status;
    r.decided_at = decidedAt;
    r.updated_at = decidedAt;
  }
}
