import { z } from "zod";

/**
 * Web Module State + Vault Snapshots — server-side persistence for the command-center module layer.
 *
 * The enterprise SPA (apps/web) keeps every module's working state (approvals overlay, factory
 * packets, studio episodes, Divini Pay ledger, Forge registry edits, brain dumps…) in a namespaced
 * localStorage overlay. That state is real work product and must not be mortal: this contract gives
 * it a home in Postgres so it survives devices, browsers, and cache clears.
 *
 * Two shapes:
 *  - {@link ModuleStateEntry}: one namespaced key/value document (the unit the browser syncs). The
 *    table is an upsert-only KV — `(tenant_id, namespace, key)` is the identity, `value` is jsonb.
 *  - {@link VaultSnapshot}: one append-only, whole-vault export (the "export everything" button's
 *    server twin). Snapshots are never mutated; restore = read latest and re-apply client-side.
 *
 * SECURITY INVARIANT: no credentials ever enter this store. Keys that look like secrets
 * (token/secret/password/api_key…) are rejected server-side; the browser exporter excludes them
 * independently. Sync is an `internal_action` — visible only to the operator — so it is not
 * approval-gated.
 */

// ---------------------------------------------------------------------------
// Module state entries (upsert-only KV)
// ---------------------------------------------------------------------------

/** Namespace/key charset: lowercase-ish identifier segments, dots/colons/dashes/underscores. */
export const MODULE_STATE_NAME_RE = /^[a-z0-9][a-z0-9_.:\-]{0,127}$/i;

export const ModuleStateEntrySchema = z.object({
  tenant_id: z.string().uuid(),
  /** Which module owns the document (e.g. "ops", "factory", "studio", "pay", "forge", "vault"). */
  namespace: z.string().regex(MODULE_STATE_NAME_RE),
  /** The document key within the namespace (e.g. "approvals", "packets", "dumps"). */
  key: z.string().regex(MODULE_STATE_NAME_RE),
  /** The document itself — arbitrary JSON produced by the module layer. */
  value: z.unknown(),
  updated_at: z.string().datetime(),
});
export type ModuleStateEntry = z.infer<typeof ModuleStateEntrySchema>;

/** One entry as the browser submits it (tenant + timestamps are server-assigned). */
export const ModuleStateSyncEntrySchema = z.object({
  namespace: z.string().regex(MODULE_STATE_NAME_RE),
  key: z.string().regex(MODULE_STATE_NAME_RE),
  value: z.unknown(),
});
export type ModuleStateSyncEntry = z.infer<typeof ModuleStateSyncEntrySchema>;

export const ModuleStateSyncInputSchema = z.object({
  entries: z.array(ModuleStateSyncEntrySchema).min(1).max(500),
});
export type ModuleStateSyncInput = z.infer<typeof ModuleStateSyncInputSchema>;

/** Per-namespace rollup for the custody dashboard. */
export const ModuleStateNamespaceSummarySchema = z.object({
  namespace: z.string(),
  entry_count: z.number().int().nonnegative(),
  updated_at: z.string().datetime(),
});
export type ModuleStateNamespaceSummary = z.infer<typeof ModuleStateNamespaceSummarySchema>;

// ---------------------------------------------------------------------------
// Vault snapshots (append-only whole-vault exports)
// ---------------------------------------------------------------------------

export const VaultSnapshotMetaSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** Operator-facing label, e.g. "pre-migration backup". */
  label: z.string().max(200).default(""),
  /** Serialized payload size in bytes (as measured at write time). */
  byte_size: z.number().int().nonnegative(),
  /** How many top-level documents the snapshot carries. */
  entry_count: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
});
export type VaultSnapshotMeta = z.infer<typeof VaultSnapshotMetaSchema>;

export const VaultSnapshotSchema = VaultSnapshotMetaSchema.extend({
  /** The full vault export document (format `alfy2-vault`, produced by apps/web/assets/vault.mjs). */
  payload: z.unknown(),
});
export type VaultSnapshot = z.infer<typeof VaultSnapshotSchema>;

// ---------------------------------------------------------------------------
// Limits (enforced by ModuleStateService; mirrored client-side)
// ---------------------------------------------------------------------------

/** Max serialized size of a single state entry's value. */
export const MODULE_STATE_MAX_ENTRY_BYTES = 256_000;
/** Max serialized size of a whole vault snapshot payload. */
export const VAULT_SNAPSHOT_MAX_BYTES = 4_000_000;
