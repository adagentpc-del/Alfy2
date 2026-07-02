import type {
  ModuleStateEntry,
  ModuleStateNamespaceSummary,
  VaultSnapshot,
  VaultSnapshotMeta,
} from "@alfy2/shared";
import type { ModuleStateRepository } from "@alfy2/core";
import type { Querier } from "./client.js";

interface StateRow {
  tenant_id: string;
  namespace: string;
  key: string;
  value: unknown;
  updated_at: Date | string;
}

interface NamespaceRow {
  namespace: string;
  entry_count: number | string;
  updated_at: Date | string;
}

interface SnapshotRow {
  id: string;
  tenant_id: string;
  label: string;
  payload?: unknown;
  byte_size: number;
  entry_count: number;
  created_at: Date | string;
}

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

/**
 * Postgres-backed {@link ModuleStateRepository} over `web_module_state` (upsert-only KV) and
 * `vault_snapshots` (append-only), migration 0244. `value`/`payload` are jsonb — stringified on
 * write, rehydrated on read. Construct per unit of work from a tenant-scoped {@link Querier}; RLS
 * isolates by tenant via the connection's `app.tenant_id` GUC (explicit predicates are
 * defense-in-depth).
 */
export class PgModuleStateRepository implements ModuleStateRepository {
  constructor(private readonly q: Querier) {}

  async upsertMany(
    tenantId: string,
    entries: Array<{ namespace: string; key: string; value: unknown }>,
    updatedAt: string,
  ): Promise<number> {
    let written = 0;
    for (const e of entries) {
      await this.q.query(
        `insert into web_module_state (tenant_id, namespace, key, value, updated_at)
         values ($1, $2, $3, $4::jsonb, $5)
         on conflict (tenant_id, namespace, key)
           do update set value = excluded.value, updated_at = excluded.updated_at`,
        [tenantId, e.namespace, e.key, JSON.stringify(e.value ?? null), updatedAt],
      );
      written += 1;
    }
    return written;
  }

  async list(tenantId: string, namespace: string): Promise<ModuleStateEntry[]> {
    const res = await this.q.query(
      `select tenant_id, namespace, key, value, updated_at
         from web_module_state
        where tenant_id = $1 and namespace = $2
        order by key`,
      [tenantId, namespace],
    );
    return (res.rows as StateRow[]).map((r) => ({
      tenant_id: r.tenant_id,
      namespace: r.namespace,
      key: r.key,
      value: r.value,
      updated_at: toIso(r.updated_at),
    }));
  }

  async listNamespaces(tenantId: string): Promise<ModuleStateNamespaceSummary[]> {
    const res = await this.q.query(
      `select namespace, count(*)::int as entry_count, max(updated_at) as updated_at
         from web_module_state
        where tenant_id = $1
        group by namespace
        order by namespace`,
      [tenantId],
    );
    return (res.rows as NamespaceRow[]).map((r) => ({
      namespace: r.namespace,
      entry_count: typeof r.entry_count === "string" ? Number(r.entry_count) : r.entry_count,
      updated_at: toIso(r.updated_at),
    }));
  }

  async saveSnapshot(snap: VaultSnapshot): Promise<void> {
    await this.q.query(
      `insert into vault_snapshots (id, tenant_id, label, payload, byte_size, entry_count, created_at)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
      [
        snap.id,
        snap.tenant_id,
        snap.label,
        JSON.stringify(snap.payload ?? null),
        snap.byte_size,
        snap.entry_count,
        snap.created_at,
      ],
    );
  }

  async latestSnapshot(tenantId: string): Promise<VaultSnapshot | null> {
    const res = await this.q.query(
      `select id, tenant_id, label, payload, byte_size, entry_count, created_at
         from vault_snapshots
        where tenant_id = $1
        order by created_at desc
        limit 1`,
      [tenantId],
    );
    const row = (res.rows as SnapshotRow[])[0];
    if (!row) return null;
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      label: row.label,
      payload: row.payload,
      byte_size: row.byte_size,
      entry_count: row.entry_count,
      created_at: toIso(row.created_at),
    };
  }

  async listSnapshots(tenantId: string, limit = 30): Promise<VaultSnapshotMeta[]> {
    const res = await this.q.query(
      `select id, tenant_id, label, byte_size, entry_count, created_at
         from vault_snapshots
        where tenant_id = $1
        order by created_at desc
        limit $2`,
      [tenantId, limit],
    );
    return (res.rows as SnapshotRow[]).map((r) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      label: r.label,
      byte_size: r.byte_size,
      entry_count: r.entry_count,
      created_at: toIso(r.created_at),
    }));
  }
}
