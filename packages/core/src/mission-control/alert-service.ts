import { MissionControlAlertSchema, type MissionControlAlert } from "@alfy2/shared";

/**
 * Persistence PORT for Mission Control alerts. The engine derives ephemeral alerts on each compose;
 * this port keeps the operator-facing alert QUEUE — so an alert the founder has acknowledged or
 * escalated stays that way across refreshes. "Active" = not resolved (open | acknowledged | escalated).
 */
export type MissionControlAlertStatus = MissionControlAlert["status"];

export interface MissionControlAlertRepository {
  /** Alerts the operator still cares about (status open | acknowledged | escalated), newest first. */
  listActive(tenantId: string): Promise<MissionControlAlert[]>;
  /** Persist a newly-surfaced alert (status defaults to "open"). */
  insert(tenantId: string, alert: MissionControlAlert): Promise<void>;
  /** Advance an alert's status (acknowledge / escalate / resolve). */
  setStatus(tenantId: string, id: string, status: MissionControlAlertStatus): Promise<void>;
}

/** In-memory reference repository — tests and local runs only. */
export class InMemoryMissionControlAlertRepository implements MissionControlAlertRepository {
  private readonly byTenant = new Map<string, MissionControlAlert[]>();

  async listActive(tenantId: string): Promise<MissionControlAlert[]> {
    return (this.byTenant.get(tenantId) ?? [])
      .filter((a) => a.status !== "resolved")
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async insert(tenantId: string, alert: MissionControlAlert): Promise<void> {
    const list = this.byTenant.get(tenantId) ?? [];
    list.push(alert);
    this.byTenant.set(tenantId, list);
  }
  async setStatus(tenantId: string, id: string, status: MissionControlAlertStatus): Promise<void> {
    const list = this.byTenant.get(tenantId) ?? [];
    const a = list.find((x) => x.id === id);
    if (a) a.status = status;
  }
}

export interface MissionControlAlertServiceOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

/**
 * Reconciles the engine's freshly-derived alerts with the persisted queue. Deterministic: a derived
 * alert is matched to an existing active one by (category, title), so the same condition does not
 * create a duplicate row and the operator's acknowledged/escalated status is preserved. New conditions
 * are inserted as "open". Acknowledge / escalate advance a single alert's status.
 */
export class MissionControlAlertService {
  private readonly clock: () => Date;
  private readonly idFactory: () => string;

  constructor(
    private readonly repo: MissionControlAlertRepository,
    options: MissionControlAlertServiceOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Insert any newly-surfaced derived alerts, then return the full active queue (newest first). */
  async sync(
    tenantId: string,
    businessId: string | null,
    derived: MissionControlAlert[],
  ): Promise<MissionControlAlert[]> {
    const active = await this.repo.listActive(tenantId);
    const seen = new Set(active.map((a) => `${a.category}::${a.title}`));
    for (const d of derived) {
      const key = `${d.category}::${d.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const alert = MissionControlAlertSchema.parse({
        ...d,
        id: this.idFactory(),
        tenant_id: tenantId,
        business_id: businessId,
        status: "open",
        created_at: this.clock().toISOString(),
      });
      await this.repo.insert(tenantId, alert);
    }
    return this.repo.listActive(tenantId);
  }

  async acknowledge(tenantId: string, id: string): Promise<void> {
    await this.repo.setStatus(tenantId, id, "acknowledged");
  }
  async escalate(tenantId: string, id: string): Promise<void> {
    await this.repo.setStatus(tenantId, id, "escalated");
  }
  async resolve(tenantId: string, id: string): Promise<void> {
    await this.repo.setStatus(tenantId, id, "resolved");
  }
  async listActive(tenantId: string): Promise<MissionControlAlert[]> {
    return this.repo.listActive(tenantId);
  }
}
