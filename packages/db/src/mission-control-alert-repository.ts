import type { MissionControlAlert } from "@alfy2/shared";
import type {
  MissionControlAlertRepository,
  MissionControlAlertStatus,
} from "@alfy2/core";
import type { Querier } from "./client.js";

const COLS =
  "id, tenant_id, business_id, severity, category, title, detail, source_ref, " +
  "requires_approval, routed_to, status, created_at, updated_at";

interface AlertRow {
  id: string;
  tenant_id: string;
  business_id: string | null;
  severity: string;
  category: string;
  title: string;
  detail: string;
  source_ref: string;
  requires_approval: boolean;
  routed_to: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string | null;
}

function iso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

function toAlert(r: AlertRow): MissionControlAlert {
  return {
    id: r.id,
    tenant_id: r.tenant_id,
    business_id: r.business_id,
    severity: r.severity as MissionControlAlert["severity"],
    category: r.category as MissionControlAlert["category"],
    title: r.title,
    detail: r.detail,
    source_ref: r.source_ref,
    requires_approval: r.requires_approval,
    routed_to: r.routed_to,
    status: r.status as MissionControlAlert["status"],
    created_at: iso(r.created_at),
    updated_at: r.updated_at === null ? null : iso(r.updated_at),
  };
}

/**
 * Postgres-backed {@link MissionControlAlertRepository} over `mission_control_alerts`. Tenant-scoped
 * via the connection's `app.tenant_id` GUC (explicit predicates are defense-in-depth).
 */
export class PgMissionControlAlertRepository implements MissionControlAlertRepository {
  constructor(private readonly q: Querier) {}

  async listActive(tenantId: string): Promise<MissionControlAlert[]> {
    const res = await this.q.query(
      `select ${COLS} from mission_control_alerts
        where tenant_id = $1 and status <> 'resolved'
        order by created_at desc`,
      [tenantId],
    );
    return (res.rows as AlertRow[]).map(toAlert);
  }

  async insert(tenantId: string, a: MissionControlAlert): Promise<void> {
    await this.q.query(
      `insert into mission_control_alerts
         (id, tenant_id, business_id, severity, category, title, detail, source_ref,
          requires_approval, routed_to, status, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict (id) do nothing`,
      [
        a.id,
        tenantId,
        a.business_id,
        a.severity,
        a.category,
        a.title,
        a.detail,
        a.source_ref,
        a.requires_approval,
        a.routed_to,
        a.status,
        a.created_at,
      ],
    );
  }

  async setStatus(tenantId: string, id: string, status: MissionControlAlertStatus): Promise<void> {
    await this.q.query(
      `update mission_control_alerts set status = $3 where id = $1 and tenant_id = $2`,
      [id, tenantId, status],
    );
  }
}
