import {
  MODULE_STATE_MAX_ENTRY_BYTES,
  MODULE_STATE_NAME_RE,
  VAULT_SNAPSHOT_MAX_BYTES,
  type ModuleStateEntry,
  type ModuleStateNamespaceSummary,
  type ModuleStateSyncEntry,
  type VaultSnapshot,
  type VaultSnapshotMeta,
} from "@alfy2/shared";
import type { ModuleStateRepository } from "./repository.js";

/** Key fragments that indicate credential material — refused regardless of value. */
const SECRET_KEY_RE = /(token|secret|password|passwd|credential|api[-_]?key|private[-_]?key)/i;

export interface ModuleStateServiceOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export interface SyncResult {
  synced: number;
  /** Entries refused with the reason — refusal is per-entry, not all-or-nothing. */
  rejected: Array<{ namespace: string; key: string; reason: string }>;
}

/**
 * Application service over {@link ModuleStateRepository}. Enforces the layer's invariants before
 * anything touches the store:
 *  - namespace/key charset (defense against junk keys polluting the KV);
 *  - **no credentials**: keys that look like secrets are rejected per-entry (the browser exporter
 *    excludes them independently — this is the second lock);
 *  - size caps per entry and per snapshot so a runaway client cannot bloat the tenant's rows.
 *
 * Sync is upsert-only and snapshots are append-only; nothing here deletes, so a bad sync can never
 * destroy server state (restore = re-apply an older snapshot client-side).
 */
export class ModuleStateService {
  private readonly clock: () => Date;
  private readonly idFactory: () => string;

  constructor(
    private readonly repo: ModuleStateRepository,
    options: ModuleStateServiceOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  async sync(tenantId: string, entries: ModuleStateSyncEntry[]): Promise<SyncResult> {
    const accepted: Array<{ namespace: string; key: string; value: unknown }> = [];
    const rejected: SyncResult["rejected"] = [];
    for (const e of entries) {
      if (!MODULE_STATE_NAME_RE.test(e.namespace) || !MODULE_STATE_NAME_RE.test(e.key)) {
        rejected.push({ namespace: e.namespace, key: e.key, reason: "invalid_name" });
        continue;
      }
      if (SECRET_KEY_RE.test(e.key) || SECRET_KEY_RE.test(e.namespace)) {
        rejected.push({ namespace: e.namespace, key: e.key, reason: "looks_like_credential" });
        continue;
      }
      const bytes = utf8Bytes(JSON.stringify(e.value ?? null));
      if (bytes > MODULE_STATE_MAX_ENTRY_BYTES) {
        rejected.push({ namespace: e.namespace, key: e.key, reason: "entry_too_large" });
        continue;
      }
      accepted.push({ namespace: e.namespace, key: e.key, value: e.value ?? null });
    }
    const synced =
      accepted.length > 0
        ? await this.repo.upsertMany(tenantId, accepted, this.clock().toISOString())
        : 0;
    return { synced, rejected };
  }

  read(tenantId: string, namespace: string): Promise<ModuleStateEntry[]> {
    return this.repo.list(tenantId, namespace);
  }

  namespaces(tenantId: string): Promise<ModuleStateNamespaceSummary[]> {
    return this.repo.listNamespaces(tenantId);
  }

  async saveSnapshot(tenantId: string, payload: unknown, label = ""): Promise<VaultSnapshotMeta> {
    const serialized = JSON.stringify(payload ?? null);
    const byteSize = utf8Bytes(serialized);
    if (byteSize > VAULT_SNAPSHOT_MAX_BYTES) {
      throw new Error(`snapshot_too_large: ${byteSize} bytes > ${VAULT_SNAPSHOT_MAX_BYTES}`);
    }
    if (SECRET_KEY_RE.test(collectTopLevelKeys(payload))) {
      throw new Error("snapshot_rejected: payload carries credential-looking keys");
    }
    const snap: VaultSnapshot = {
      id: this.idFactory(),
      tenant_id: tenantId,
      label: label.slice(0, 200),
      payload,
      byte_size: byteSize,
      entry_count: countEntries(payload),
      created_at: this.clock().toISOString(),
    };
    await this.repo.saveSnapshot(snap);
    const { payload: _p, ...meta } = snap;
    return meta;
  }

  latestSnapshot(tenantId: string): Promise<VaultSnapshot | null> {
    return this.repo.latestSnapshot(tenantId);
  }

  listSnapshots(tenantId: string, limit = 30): Promise<VaultSnapshotMeta[]> {
    return this.repo.listSnapshots(tenantId, limit);
  }
}

function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** The keys of `payload.data` (the vault export's document map) joined for the secret scan. */
function collectTopLevelKeys(payload: unknown): string {
  if (payload === null || typeof payload !== "object") return "";
  const data = (payload as Record<string, unknown>)["data"];
  if (data === null || data === undefined || typeof data !== "object") return "";
  return Object.keys(data as Record<string, unknown>).join("\n");
}

function countEntries(payload: unknown): number {
  if (payload === null || typeof payload !== "object") return 0;
  const data = (payload as Record<string, unknown>)["data"];
  if (data === null || data === undefined || typeof data !== "object") return 0;
  return Object.keys(data as Record<string, unknown>).length;
}
