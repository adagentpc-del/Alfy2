import type {
  ModuleStateEntry,
  ModuleStateNamespaceSummary,
  VaultSnapshot,
  VaultSnapshotMeta,
} from "@alfy2/shared";

/**
 * Persistence PORT for the web module-state layer. Core defines the interface only; the concrete
 * store (Supabase tables `web_module_state` + `vault_snapshots`, migration 0244) is injected so the
 * service stays infrastructure-free. An in-memory reference implementation ships for tests.
 *
 * `web_module_state` is upsert-only KV keyed `(tenant_id, namespace, key)`; `vault_snapshots` is
 * append-only (insert + select, never mutated).
 */
export interface ModuleStateRepository {
  /** Upsert entries (within their tenant); returns how many rows were written. */
  upsertMany(
    tenantId: string,
    entries: Array<{ namespace: string; key: string; value: unknown }>,
    updatedAt: string,
  ): Promise<number>;
  /** All entries in one namespace for the tenant. */
  list(tenantId: string, namespace: string): Promise<ModuleStateEntry[]>;
  /** Per-namespace rollup (count + newest updated_at) for the custody dashboard. */
  listNamespaces(tenantId: string): Promise<ModuleStateNamespaceSummary[]>;

  /** Append a whole-vault snapshot. */
  saveSnapshot(snap: VaultSnapshot): Promise<void>;
  /** The newest snapshot (with payload), or null if none. */
  latestSnapshot(tenantId: string): Promise<VaultSnapshot | null>;
  /** Snapshot history, newest first (meta only — payloads can be MBs). */
  listSnapshots(tenantId: string, limit?: number): Promise<VaultSnapshotMeta[]>;
}
