/**
 * Data Custody Vault — the "export everything / import everything" layer (blind spot #7: mortal data).
 *
 * Everything the command center produces locally (approvals overlay, factory packets, studio
 * episodes, Divini Pay ledger, Forge registry edits, brain dumps…) lives in namespaced localStorage
 * keys. This module makes that state durable and portable:
 *
 *  - exportEverything(): one self-describing JSON snapshot (`format: "alfy2-vault"`) of every
 *    module document. CREDENTIALS ARE NEVER EXPORTED — any key that looks like a secret is
 *    excluded here, and the server refuses them independently (two locks).
 *  - previewImport()/importEverything(): validate a snapshot, show what it carries, then apply.
 *    Import is preview-first so a wrong file can never silently clobber the workspace.
 *  - pushToCloud()/pullFromCloud(): the server twins — POST /vault/snapshots (append-only) +
 *    POST /state/sync (namespaced KV) when connected; honest local_only status otherwise.
 *
 * Pure ES module: runs in the browser and under node (scripts/vault-custody-smoke.mts) via an
 * injectable storage.
 */
import { createActionLog, liveEnabled, liveFetch } from "./services.mjs";

export const VAULT_FORMAT = "alfy2-vault";
export const VAULT_VERSION = 1;

/** Key fragments that indicate credential material — never exported, never imported. */
const SECRET_KEY_RE = /(token|secret|password|passwd|credential|api[-_]?key|private[-_]?key)/i;

/** A vault key belongs to the module layer: our prefixes only, never other sites'/apps' keys. */
const VAULT_KEY_RE = /^(alfy2_|alfie_)/;

/** localStorage prefix → server-side namespace (mirrors each module's store prefix). */
const NAMESPACES = [
  ["alfy2_ops_", "ops"],
  ["alfy2_factory_", "factory"],
  ["alfy2_studio_", "studio"],
  ["alfy2_pay_", "pay"],
  ["alfy2_forge_", "forge"],
  ["alfy2_meta_", "meta"],
  ["alfie_", "meta"],
];

// --- injectable storage (browser: localStorage; smoke: in-memory shim) ---------------------------

const memStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
  };
};

let storage = typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage : memStorage();
let clock = () => new Date();

/** Test/embedding hook: swap the backing storage and clock (returns the previous storage). */
export function configureVault(options = {}) {
  const prev = storage;
  if (options.storage) storage = options.storage;
  if (options.clock) clock = options.clock;
  return prev;
}
export const vaultStores = { memStorage };

function listVaultKeys() {
  const keys = [];
  for (let i = 0; i < storage.length; i += 1) {
    const k = storage.key(i);
    if (k && VAULT_KEY_RE.test(k) && !SECRET_KEY_RE.test(k)) keys.push(k);
  }
  return keys.sort();
}

function namespaceOf(key) {
  for (const [prefix, ns] of NAMESPACES) {
    if (key.startsWith(prefix)) return { namespace: ns, docKey: key.slice(prefix.length) || key };
  }
  return { namespace: "other", docKey: key };
}

// --- export ---------------------------------------------------------------------------------------

/**
 * Build the complete snapshot. Values are stored parsed (module docs are JSON); anything that is
 * not valid JSON rides along as `{ __raw: "<string>" }` so import can restore it byte-for-byte.
 */
export function exportEverything() {
  const data = {};
  const byModule = {};
  for (const key of listVaultKeys()) {
    const raw = storage.getItem(key);
    if (raw === null) continue;
    let value;
    try { value = JSON.parse(raw); } catch { value = { __raw: raw }; }
    data[key] = value;
    const { namespace } = namespaceOf(key);
    byModule[namespace] = (byModule[namespace] ?? 0) + 1;
  }
  const snapshot = {
    format: VAULT_FORMAT,
    version: VAULT_VERSION,
    app: "Alfy2 Enterprise Command Center",
    exported_at: clock().toISOString(),
    counts: {
      documents: Object.keys(data).length,
      bytes: JSON.stringify(data).length,
      by_module: byModule,
    },
    credential_policy: "no credentials are ever included in this file",
    data,
  };
  storage.setItem("alfy2_meta_last_export", JSON.stringify(snapshot.exported_at));
  createActionLog({
    agent_id: "chief-knowledge",
    action: `Vault export: ${snapshot.counts.documents} documents (${(snapshot.counts.bytes / 1024).toFixed(1)} KB)`,
    status: "succeeded",
  });
  return snapshot;
}

/** The snapshot as a pretty JSON string + a deterministic filename (for the download button). */
export function exportAsFile() {
  const snapshot = exportEverything();
  const stamp = snapshot.exported_at.slice(0, 19).replace(/[:T]/g, "-");
  return { filename: `alfy2-vault-${stamp}.json`, json: JSON.stringify(snapshot, null, 2), snapshot };
}

// --- import (preview-first) ------------------------------------------------------------------------

/**
 * Validate a snapshot (object or JSON string) WITHOUT applying it. Returns
 * `{ ok, reason?, exported_at?, documents?, by_module?, skipped_secrets?, unknown_keys? }`.
 */
export function previewImport(input) {
  let snap = input;
  if (typeof input === "string") {
    try { snap = JSON.parse(input); } catch { return { ok: false, reason: "not valid JSON" }; }
  }
  if (!snap || typeof snap !== "object") return { ok: false, reason: "not a vault snapshot" };
  if (snap.format !== VAULT_FORMAT) return { ok: false, reason: `unknown format "${snap.format ?? "?"}" — expected ${VAULT_FORMAT}` };
  if (snap.version !== VAULT_VERSION) return { ok: false, reason: `unsupported version ${snap.version} — this build reads v${VAULT_VERSION}` };
  if (!snap.data || typeof snap.data !== "object") return { ok: false, reason: "snapshot has no data section" };

  const byModule = {};
  const skippedSecrets = [];
  const unknownKeys = [];
  let documents = 0;
  for (const key of Object.keys(snap.data)) {
    if (SECRET_KEY_RE.test(key)) { skippedSecrets.push(key); continue; }
    if (!VAULT_KEY_RE.test(key)) { unknownKeys.push(key); continue; }
    documents += 1;
    const { namespace } = namespaceOf(key);
    byModule[namespace] = (byModule[namespace] ?? 0) + 1;
  }
  if (documents === 0) return { ok: false, reason: "snapshot carries no importable documents" };
  return {
    ok: true,
    exported_at: snap.exported_at ?? "unknown",
    documents,
    by_module: byModule,
    skipped_secrets: skippedSecrets,
    unknown_keys: unknownKeys,
    snapshot: snap,
  };
}

/**
 * Apply a previously validated snapshot. Every importable document overwrites its local key;
 * credential-looking and foreign keys are refused. Returns the applied summary.
 */
export function importEverything(input) {
  const preview = previewImport(input);
  if (!preview.ok) throw new Error(`import refused: ${preview.reason}`);
  const snap = preview.snapshot;
  let applied = 0;
  for (const [key, value] of Object.entries(snap.data)) {
    if (SECRET_KEY_RE.test(key) || !VAULT_KEY_RE.test(key)) continue;
    const raw = value && typeof value === "object" && typeof value.__raw === "string"
      ? value.__raw
      : JSON.stringify(value);
    storage.setItem(key, raw);
    applied += 1;
  }
  createActionLog({
    agent_id: "chief-knowledge",
    action: `Vault import: ${applied} documents restored (snapshot of ${preview.exported_at})`,
    status: "succeeded",
  });
  return { applied, exported_at: preview.exported_at, by_module: preview.by_module, skipped_secrets: preview.skipped_secrets };
}

// --- custody status --------------------------------------------------------------------------------

export function getCustodyStatus() {
  const keys = listVaultKeys();
  let bytes = 0;
  const byModule = {};
  for (const k of keys) {
    const raw = storage.getItem(k) ?? "";
    bytes += raw.length;
    const { namespace } = namespaceOf(k);
    byModule[namespace] = (byModule[namespace] ?? 0) + 1;
  }
  let lastExport = null;
  try { lastExport = JSON.parse(storage.getItem("alfy2_meta_last_export") ?? "null"); } catch { /* unreadable */ }
  return {
    documents: keys.length,
    bytes,
    by_module: byModule,
    last_export: lastExport,
    live_connected: liveEnabled(),
  };
}

// --- cloud twins (server persistence via /state + /vault when connected) --------------------------

/** Push the whole vault to the server: one append-only snapshot + the namespaced KV sync. */
export async function pushToCloud(label = "manual push") {
  if (!liveEnabled()) throw new Error("not connected — use Connect API first (export to file always works)");
  const snapshot = exportEverything();
  const meta = await liveFetch("/vault/snapshots", {
    method: "POST",
    body: JSON.stringify({ payload: snapshot, label }),
  });
  const entries = Object.entries(snapshot.data)
    .map(([key, value]) => {
      const { namespace, docKey } = namespaceOf(key);
      return { namespace, key: docKey, value };
    })
    .filter((e) => /^[a-z0-9][a-z0-9_.:-]{0,127}$/i.test(e.key));
  let synced = { synced: 0, rejected: [] };
  if (entries.length > 0) {
    synced = await liveFetch("/state/sync", { method: "POST", body: JSON.stringify({ entries }) });
  }
  createActionLog({
    agent_id: "chief-knowledge",
    action: `Vault pushed to cloud: snapshot ${meta.id?.slice(0, 8) ?? "?"} (${meta.entry_count} docs) + ${synced.synced} KV docs`,
    status: "succeeded",
  });
  return { snapshot_meta: meta, kv: synced };
}

/** Read the newest server snapshot; returns a preview — apply with importEverything(preview.snapshot). */
export async function pullFromCloud() {
  if (!liveEnabled()) throw new Error("not connected — use Connect API first");
  const { snapshot } = await liveFetch("/vault/snapshots/latest");
  if (!snapshot) return { ok: false, reason: "no cloud snapshot yet — push one first" };
  return previewImport(snapshot.payload);
}

/** Server-side custody rollup (namespaces + snapshot history) for the /vault screen. */
export async function getCloudStatus() {
  if (!liveEnabled()) return { connected: false };
  const [{ namespaces }, { snapshots }] = await Promise.all([
    liveFetch("/state"),
    liveFetch("/vault/snapshots"),
  ]);
  return { connected: true, namespaces, snapshots };
}
