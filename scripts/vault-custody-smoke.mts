/**
 * Runtime smoke for the Data Custody Vault (apps/web/assets/vault.mjs) — proves "export everything /
 * import everything" is lossless for module documents and airtight for credentials: secrets are
 * excluded from exports, refused on import, foreign keys never cross, tampered files are rejected
 * with a reason, and a fresh workspace restored from a snapshot is byte-identical for every module
 * document. Run with: `tsx scripts/vault-custody-smoke.mts`.
 */
import assert from "node:assert/strict";
// @ts-ignore — browser-shared ES module, intentionally untyped
import * as svc from "../apps/web/assets/services.mjs";
// @ts-ignore — browser-shared ES module, intentionally untyped
import * as vault from "../apps/web/assets/vault.mjs";

const NOW = new Date("2026-07-02T12:00:00.000Z");
svc.configure({ store: svc.stores.memoryStore(), clock: () => NOW });

// === 1. Seed a representative workspace: five modules + a credential + a foreign key. ===
const deviceA = vault.vaultStores.memStorage();
vault.configureVault({ storage: deviceA, clock: () => NOW });

const SEED: Record<string, unknown> = {
  alfy2_ops_approvals: [{ id: "apr-001", status: "approved" }],
  alfy2_ops_dumps: [{ id: "dump-1", text: "brain dump", status: "local_only" }],
  alfy2_factory_packets: [{ id: "pkt-1", kind: "company", status: "draft" }],
  alfy2_studio_episodes: [{ id: "ep-1", title: "Decoded 001" }],
  alfy2_pay_ledger: [{ id: "led-1", entries: [] }],
  alfy2_forge_registry_overrides: { github: { status: "live" } },
};
for (const [k, v] of Object.entries(SEED)) deviceA.setItem(k, JSON.stringify(v));
deviceA.setItem("alfie_api", JSON.stringify("https://alfie-api.onrender.com"));
deviceA.setItem("alfie_token", "sk-this-must-never-be-exported");
deviceA.setItem("some_other_app_data", JSON.stringify({ not: "ours" }));
console.log("[1] workspace seeded: 6 module docs + api url + a credential + a foreign key ✔");

// === 2. Export everything: complete, credential-free, foreign-free. ===
const snap = vault.exportEverything();
assert.equal(snap.format, "alfy2-vault");
assert.equal(snap.version, 1);
assert.equal(snap.counts.documents, 7, "6 module docs + alfie_api (the url is not a secret)");
assert.ok(!("alfie_token" in snap.data), "credential NEVER exported");
assert.ok(!("some_other_app_data" in snap.data), "foreign keys never exported");
assert.ok(!JSON.stringify(snap).includes("sk-this-must-never"), "no secret material anywhere in the file");
assert.equal(snap.counts.by_module.ops, 2, "per-module counts: ops=2");
assert.equal(snap.counts.by_module.forge, 1, "per-module counts: forge=1");
assert.equal(deviceA.getItem("alfy2_meta_last_export"), JSON.stringify(NOW.toISOString()), "last-export stamped");

const file = vault.exportAsFile();
assert.match(file.filename, /^alfy2-vault-2026-07-02.*\.json$/, "deterministic filename");
assert.ok(file.json.startsWith("{"), "file body is JSON");
console.log(`[2] export everything: ${snap.counts.documents} docs, credentials excluded ✔`);

// === 3. Restore onto a fresh device: preview-first, byte-identical, secrets refused. ===
const deviceB = vault.vaultStores.memStorage();
vault.configureVault({ storage: deviceB });

const preview = vault.previewImport(file.json);
assert.equal(preview.ok, true, "valid snapshot previews ok");
// the second export also carries the alfy2_meta_last_export stamp from the first → 8 docs
assert.equal(preview.documents, 8, "preview counts the documents (incl. last-export stamp)");
assert.equal(preview.skipped_secrets.length, 0, "clean file has nothing to skip");

const applied = vault.importEverything(file.json);
assert.equal(applied.applied, 8, "all documents restored");
for (const [k, v] of Object.entries(SEED)) {
  assert.equal(deviceB.getItem(k), JSON.stringify(v), `${k} restored byte-identical`);
}
assert.equal(deviceB.getItem("alfie_token"), null, "credential did not cross devices");
assert.equal(deviceB.getItem("some_other_app_data"), null, "foreign key did not cross");
console.log("[3] fresh-device restore: 7/7 byte-identical, zero secrets crossed ✔");

// === 4. Hostile files are refused with a reason. ===
assert.equal(vault.previewImport("not json at all").ok, false, "garbage refused");
assert.equal(vault.previewImport({ format: "evil-vault", version: 1, data: {} }).ok, false, "wrong format refused");
assert.equal(vault.previewImport({ format: "alfy2-vault", version: 99, data: { alfy2_ops_x: 1 } }).ok, false, "future version refused");
assert.equal(vault.previewImport({ format: "alfy2-vault", version: 1, data: {} }).ok, false, "empty payload refused");
assert.throws(() => vault.importEverything({ format: "evil-vault" }), /import refused/, "import throws on refusal");

// a snapshot smuggling a credential key: the secret is skipped, the rest applies
const smuggle = {
  format: "alfy2-vault", version: 1,
  data: { alfy2_ops_approvals: [], alfie_token: "sk-smuggled" },
};
const p2 = vault.previewImport(smuggle);
assert.equal(p2.ok, true, "otherwise-valid snapshot still imports");
assert.deepEqual(p2.skipped_secrets, ["alfie_token"], "the smuggled credential is flagged");
vault.importEverything(smuggle);
assert.equal(deviceB.getItem("alfie_token"), null, "smuggled credential never lands");
console.log("[4] tamper suite: garbage/format/version/empty refused; smuggled credential blocked ✔");

// === 5. Custody status + honest offline behavior of the cloud twins. ===
const status = vault.getCustodyStatus();
assert.equal(status.documents >= 7, true, "status counts the workspace");
assert.equal(status.live_connected, false, "no creds in node → not connected");
await assert.rejects(() => vault.pushToCloud(), /not connected/, "push demands a connection");
await assert.rejects(() => vault.pullFromCloud(), /not connected/, "pull demands a connection");
console.log("[5] custody status + offline cloud twins honest ✔");

console.log(
  "VAULT CUSTODY SMOKE OK — export complete & credential-free, preview-first import, byte-identical " +
    "restore, tamper refusal, smuggled-secret block, honest offline cloud behavior.",
);
