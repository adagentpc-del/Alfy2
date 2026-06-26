import type {
  ApiApprovalRequest as ApprovalRequest,
  ApiApprovalActionClass as ApprovalActionClass,
  ApiApprovalRisk as ApprovalRisk,
  ApiApprovalRequestStatus as ApprovalRequestStatus,
} from "@alfy2/shared";
import type {
  ApprovalRequestRepository,
  ApprovalListFilter,
} from "@alfy2/core";
import type { Querier } from "./client.js";

// Columns of `api_approval_requests` (the mutable `updated_at` is not read back).
const APPROVAL_COLS =
  "id, tenant_id, business_id, action_class, method, route, summary, payload, risk, " +
  "requires_approval, status, requested_by, decided_by, decision_reason, created_at, decided_at";

interface ApprovalRow {
  id: string;
  tenant_id: string;
  business_id: string | null;
  action_class: string;
  method: string;
  route: string;
  summary: string;
  payload: unknown;
  risk: string;
  requires_approval: boolean;
  status: string;
  requested_by: string;
  decided_by: string | null;
  decision_reason: string;
  created_at: Date | string;
  decided_at: Date | string | null;
}

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

function toRequest(row: ApprovalRow): ApprovalRequest {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    business_id: row.business_id,
    action_class: row.action_class as ApprovalActionClass,
    method: row.method,
    route: row.route,
    summary: row.summary,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    risk: row.risk as ApprovalRisk,
    requires_approval: row.requires_approval,
    status: row.status as ApprovalRequestStatus,
    requested_by: row.requested_by,
    decided_by: row.decided_by,
    decision_reason: row.decision_reason,
    created_at: toIso(row.created_at),
    decided_at: row.decided_at === null ? null : toIso(row.decided_at),
  };
}

/**
 * Postgres-backed {@link ApprovalRequestRepository} over `api_approval_requests`. Scalar fields map
 * to columns; the request `payload` is stored as `jsonb` (stringified on write, rehydrated on read).
 * Construct per unit of work from a tenant-scoped {@link Querier}; RLS isolates by tenant via the
 * connection's `app.tenant_id` GUC (the explicit predicates are defense-in-depth).
 */
export class PgApprovalRequestRepository implements ApprovalRequestRepository {
  constructor(private readonly q: Querier) {}

  async save(req: ApprovalRequest): Promise<void> {
    await this.q.query(
      `insert into api_approval_requests
         (id, tenant_id, business_id, action_class, method, route, summary, payload, risk,
          requires_approval, status, requested_by, decided_by, decision_reason, created_at, decided_at)
       values
         ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9,
          $10, $11, $12, $13, $14, $15, $16)
       on conflict (id) do update set
         business_id = excluded.business_id, action_class = excluded.action_class,
         method = excluded.method, route = excluded.route, summary = excluded.summary,
         payload = excluded.payload, risk = excluded.risk,
         requires_approval = excluded.requires_approval, status = excluded.status,
         requested_by = excluded.requested_by, decided_by = excluded.decided_by,
         decision_reason = excluded.decision_reason, decided_at = excluded.decided_at`,
      [
        req.id,
        req.tenant_id,
        req.business_id,
        req.action_class,
        req.method,
        req.route,
        req.summary,
        JSON.stringify(req.payload),
        req.risk,
        req.requires_approval,
        req.status,
        req.requested_by,
        req.decided_by,
        req.decision_reason,
        req.created_at,
        req.decided_at,
      ],
    );
  }

  async get(tenantId: string, id: string): Promise<ApprovalRequest | null> {
    const res = await this.q.query(
      `select ${APPROVAL_COLS} from api_approval_requests where id = $1 and tenant_id = $2`,
      [id, tenantId],
    );
    const row = (res.rows as ApprovalRow[])[0];
    return row ? toRequest(row) : null;
  }

  async list(tenantId: string, filter: ApprovalListFilter = {}): Promise<ApprovalRequest[]> {
    const statuses = filter.statuses ?? [];
    const limit = filter.limit ?? 100;
    const res = await this.q.query(
      `select ${APPROVAL_COLS} from api_approval_requests
        where tenant_id = $1
          and (cardinality($2::text[]) = 0 or status = any($2::text[]))
        order by created_at desc
        limit $3`,
      [tenantId, statuses, limit],
    );
    return (res.rows as ApprovalRow[]).map(toRequest);
  }

  async setDecision(
    tenantId: string,
    id: string,
    status: ApprovalRequestStatus,
    decidedBy: string,
    reason: string,
    decidedAt: string,
  ): Promise<void> {
    await this.q.query(
      `update api_approval_requests
          set status = $3, decided_by = $4, decision_reason = $5, decided_at = $6
        where id = $1 and tenant_id = $2`,
      [id, tenantId, status, decidedBy, reason, decidedAt],
    );
  }
}
