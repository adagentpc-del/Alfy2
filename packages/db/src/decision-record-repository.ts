import type {
  DecisionRecord,
  DecisionLensReading,
  DecisionType,
  DecisionReversibility,
  DecisionRecordStatus,
} from "@alfy2/shared";
import type {
  DecisionRecordRepository,
  DecisionListFilter,
} from "@alfy2/core";
import type { Querier } from "./client.js";

// Columns of `decision_records` (the mutable `updated_at` IS read back here).
const DECISION_COLS =
  "id, tenant_id, business_id, title, summary, decision_type, risks, upside, downside, " +
  "assumptions, reversibility, required_data, lens_analysis, recommendation, approval_required, " +
  "status, created_at, updated_at, decided_at";

interface DecisionRow {
  id: string;
  tenant_id: string;
  business_id: string | null;
  title: string;
  summary: string;
  decision_type: string;
  risks: unknown;
  upside: string;
  downside: string;
  assumptions: unknown;
  reversibility: string;
  required_data: unknown;
  lens_analysis: unknown;
  recommendation: string;
  approval_required: boolean;
  status: string;
  created_at: Date | string;
  updated_at: Date | string | null;
  decided_at: Date | string | null;
}

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function toRecord(row: DecisionRow): DecisionRecord {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    business_id: row.business_id,
    title: row.title,
    summary: row.summary,
    decision_type: row.decision_type as DecisionType,
    risks: toStringArray(row.risks),
    upside: row.upside,
    downside: row.downside,
    assumptions: toStringArray(row.assumptions),
    reversibility: row.reversibility as DecisionReversibility,
    required_data: toStringArray(row.required_data),
    lens_analysis: (Array.isArray(row.lens_analysis)
      ? row.lens_analysis
      : []) as DecisionLensReading[],
    recommendation: row.recommendation,
    approval_required: row.approval_required,
    status: row.status as DecisionRecordStatus,
    created_at: toIso(row.created_at),
    updated_at: row.updated_at === null ? null : toIso(row.updated_at),
    decided_at: row.decided_at === null ? null : toIso(row.decided_at),
  };
}

/**
 * Postgres-backed {@link DecisionRecordRepository} over `decision_records`. Scalar fields map to
 * columns; arrays (`risks`, `assumptions`, `required_data`) and `lens_analysis` are stored as
 * `jsonb` (stringified on write, rehydrated on read). Construct per unit of work from a
 * tenant-scoped {@link Querier}; RLS isolates by tenant via the connection's `app.tenant_id` GUC
 * (the explicit predicates are defense-in-depth).
 */
export class PgDecisionRecordRepository implements DecisionRecordRepository {
  constructor(private readonly q: Querier) {}

  async save(rec: DecisionRecord): Promise<void> {
    await this.q.query(
      `insert into decision_records
         (id, tenant_id, business_id, title, summary, decision_type, risks, upside, downside,
          assumptions, reversibility, required_data, lens_analysis, recommendation,
          approval_required, status, created_at, decided_at)
       values
         ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9,
          $10::jsonb, $11, $12::jsonb, $13::jsonb, $14,
          $15, $16, $17, $18)
       on conflict (id) do update set
         business_id = excluded.business_id, title = excluded.title, summary = excluded.summary,
         decision_type = excluded.decision_type, risks = excluded.risks, upside = excluded.upside,
         downside = excluded.downside, assumptions = excluded.assumptions,
         reversibility = excluded.reversibility, required_data = excluded.required_data,
         lens_analysis = excluded.lens_analysis, recommendation = excluded.recommendation,
         approval_required = excluded.approval_required, status = excluded.status,
         decided_at = excluded.decided_at`,
      [
        rec.id,
        rec.tenant_id,
        rec.business_id,
        rec.title,
        rec.summary,
        rec.decision_type,
        JSON.stringify(rec.risks),
        rec.upside,
        rec.downside,
        JSON.stringify(rec.assumptions),
        rec.reversibility,
        JSON.stringify(rec.required_data),
        JSON.stringify(rec.lens_analysis),
        rec.recommendation,
        rec.approval_required,
        rec.status,
        rec.created_at,
        rec.decided_at,
      ],
    );
  }

  async get(tenantId: string, id: string): Promise<DecisionRecord | null> {
    const res = await this.q.query(
      `select ${DECISION_COLS} from decision_records where id = $1 and tenant_id = $2`,
      [id, tenantId],
    );
    const row = (res.rows as DecisionRow[])[0];
    return row ? toRecord(row) : null;
  }

  async list(tenantId: string, filter: DecisionListFilter = {}): Promise<DecisionRecord[]> {
    const statuses = filter.statuses ?? [];
    const limit = filter.limit ?? 100;
    const res = await this.q.query(
      `select ${DECISION_COLS} from decision_records
        where tenant_id = $1
          and (cardinality($2::text[]) = 0 or status = any($2::text[]))
        order by created_at desc
        limit $3`,
      [tenantId, statuses, limit],
    );
    return (res.rows as DecisionRow[]).map(toRecord);
  }

  async setDecision(
    tenantId: string,
    id: string,
    status: DecisionRecordStatus,
    decidedAt: string,
  ): Promise<void> {
    await this.q.query(
      `update decision_records
          set status = $3, decided_at = $4
        where id = $1 and tenant_id = $2`,
      [id, tenantId, status, decidedAt],
    );
  }
}
