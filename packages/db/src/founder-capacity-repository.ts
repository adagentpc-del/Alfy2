import type { FounderCapacitySnapshot, FounderWorkMode } from "@alfy2/shared";
import type { FounderCapacityRepository } from "@alfy2/core";
import type { Querier } from "./client.js";

// Columns of `founder_capacity_snapshots` (append-only; no mutable columns).
const CAPACITY_COLS =
  "id, tenant_id, as_of, energy, sleep_hours, stress, focus, meeting_load, decision_fatigue, " +
  "context_switching, emotional_load, urgency, build_intensity, health_constraints, " +
  "capacity_score, recommended_mode, do_not_interrupt, created_at";

interface CapacityRow {
  id: string;
  tenant_id: string;
  as_of: Date | string;
  energy: number | null;
  sleep_hours: number | string | null;
  stress: number | null;
  focus: number | null;
  meeting_load: number | null;
  decision_fatigue: number | null;
  context_switching: number | null;
  emotional_load: number | null;
  urgency: number | null;
  build_intensity: number | null;
  health_constraints: unknown;
  capacity_score: number;
  recommended_mode: string;
  do_not_interrupt: boolean;
  created_at: Date | string;
}

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

function toNum(v: number | string | null): number | null {
  return v === null ? null : typeof v === "string" ? Number(v) : v;
}

function toSnapshot(row: CapacityRow): FounderCapacitySnapshot {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    as_of: toIso(row.as_of),
    energy: row.energy,
    sleep_hours: toNum(row.sleep_hours),
    stress: row.stress,
    focus: row.focus,
    meeting_load: row.meeting_load,
    decision_fatigue: row.decision_fatigue,
    context_switching: row.context_switching,
    emotional_load: row.emotional_load,
    urgency: row.urgency,
    build_intensity: row.build_intensity,
    health_constraints: (row.health_constraints ?? []) as string[],
    capacity_score: row.capacity_score,
    recommended_mode: row.recommended_mode as FounderWorkMode,
    do_not_interrupt: row.do_not_interrupt,
    created_at: toIso(row.created_at),
  };
}

/**
 * Postgres-backed {@link FounderCapacityRepository} over the append-only `founder_capacity_snapshots`
 * table (§31): insert + select only. Scalar signals map to columns; `health_constraints` is stored as
 * `jsonb` (stringified on write, rehydrated on read). Construct per unit of work from a tenant-scoped
 * {@link Querier}; RLS isolates by tenant via the connection's `app.tenant_id` GUC (the explicit
 * predicates are defense-in-depth).
 */
export class PgFounderCapacityRepository implements FounderCapacityRepository {
  constructor(private readonly q: Querier) {}

  async save(snap: FounderCapacitySnapshot): Promise<void> {
    await this.q.query(
      `insert into founder_capacity_snapshots
         (id, tenant_id, as_of, energy, sleep_hours, stress, focus, meeting_load, decision_fatigue,
          context_switching, emotional_load, urgency, build_intensity, health_constraints,
          capacity_score, recommended_mode, do_not_interrupt, created_at)
       values
         ($1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14::jsonb,
          $15, $16, $17, $18)`,
      [
        snap.id,
        snap.tenant_id,
        snap.as_of,
        snap.energy,
        snap.sleep_hours,
        snap.stress,
        snap.focus,
        snap.meeting_load,
        snap.decision_fatigue,
        snap.context_switching,
        snap.emotional_load,
        snap.urgency,
        snap.build_intensity,
        JSON.stringify(snap.health_constraints),
        snap.capacity_score,
        snap.recommended_mode,
        snap.do_not_interrupt,
        snap.created_at,
      ],
    );
  }

  async getLatest(tenantId: string): Promise<FounderCapacitySnapshot | null> {
    const res = await this.q.query(
      `select ${CAPACITY_COLS} from founder_capacity_snapshots
        where tenant_id = $1
        order by as_of desc
        limit 1`,
      [tenantId],
    );
    const row = (res.rows as CapacityRow[])[0];
    return row ? toSnapshot(row) : null;
  }

  async list(tenantId: string, limit = 30): Promise<FounderCapacitySnapshot[]> {
    const res = await this.q.query(
      `select ${CAPACITY_COLS} from founder_capacity_snapshots
        where tenant_id = $1
        order by as_of desc
        limit $2`,
      [tenantId, limit],
    );
    return (res.rows as CapacityRow[]).map(toSnapshot);
  }
}
