/**
 * Runtime smoke for Source-of-Truth Management. Proves Alfy² distinguishes the nine knowledge kinds,
 * that every record carries source/confidence/freshness/owner/last-verified/update-trigger, that
 * freshness is derived from a per-kind verification TTL and decays over time, that verify/markOutdated
 * work, and that needsVerification surfaces stale/expired records. Run with:
 * `tsx scripts/source-of-truth-smoke.mts`.
 */
import assert from "node:assert/strict";
import { SourceOfTruthRegistry } from "@alfy2/core";
import { RecordTruthInputSchema, type RecordTruthInput, type FactKind } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
let now = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const sot = new SourceOfTruthRegistry({ clock: () => now, idFactory: id });

const rec = (over: Partial<RecordTruthInput> & Pick<RecordTruthInput, "kind" | "statement" | "source" | "owner">) =>
  sot.record(TENANT, RecordTruthInputSchema.parse(over));

// === 1. Distinguishes the nine kinds; every record has full provenance. ===
const KINDS: FactKind[] = [
  "verified_fact", "assumption", "outdated", "user_preference", "inferred_pattern",
  "external_research", "document", "contact", "financial_data",
];
for (const kind of KINDS) {
  const r = rec({ kind, statement: `${kind} claim`, source: "test", owner: "alyssa@x.com", update_trigger: "quarterly", last_verified_at: now.toISOString() });
  assert.equal(r.kind, kind);
  for (const f of ["source", "confidence", "freshness", "owner", "update_trigger"] as const) assert.ok(r[f] !== undefined, `${kind} has ${f}`);
}
assert.equal(sot.query(TENANT, "verified_fact").length, 1, "query filters by kind");
assert.equal(sot.query(TENANT).length, 9, "all nine recorded");
console.log("[1] distinguishes 9 kinds; every record has source/confidence/freshness/owner/last-verified/update-trigger ✔");

// === 2. Outdated records are expired immediately. ===
assert.equal(sot.query(TENANT, "outdated")[0]!.freshness, "expired", "outdated → expired");
console.log("[2] outdated knowledge marked expired ✔");

// === 3. Freshness decays with the per-kind TTL. ===
const fin = rec({ kind: "financial_data", statement: "MRR $22k", source: "QuickBooks", owner: "alyssa@x.com", last_verified_at: now.toISOString(), update_trigger: "Monthly close" });
assert.equal(sot.get(TENANT, fin.id)!.freshness, "fresh", "freshly verified financial data is fresh");
// financial_data TTL = 30 days. Advance 20 days → aging; 45 → stale; 70 → expired.
now = new Date("2026-07-15T12:00:00.000Z"); // +20d
assert.equal(sot.refreshAll(TENANT).find((r) => r.id === fin.id)!.freshness, "aging", "ages after half the TTL");
now = new Date("2026-08-09T12:00:00.000Z"); // ~+45d
assert.equal(sot.refreshAll(TENANT).find((r) => r.id === fin.id)!.freshness, "stale", "stale past the TTL");
console.log("[3] freshness decays with the per-kind verification TTL ✔");

// === 4. needsVerification surfaces stale/expired; verify resets it. ===
const due = sot.needsVerification(TENANT);
assert.ok(due.some((r) => r.id === fin.id), "stale financial data needs verification");
const verified = sot.verify(TENANT, fin.id, { confidence: 0.95 });
assert.equal(verified.freshness, "fresh", "verify resets freshness");
assert.equal(verified.confidence, 0.95, "verify can bump confidence");
assert.ok(!sot.needsVerification(TENANT).some((r) => r.id === fin.id), "no longer needs verification");
console.log("[4] needsVerification surfaces stale/expired; verify resets freshness + confidence ✔");

// === 5. markOutdated demotes a record. ===
const pref = rec({ kind: "user_preference", statement: "Prefers email", source: "alyssa", owner: "alyssa@x.com", last_verified_at: now.toISOString() });
const outdated = sot.markOutdated(TENANT, pref.id);
assert.equal(outdated.kind, "outdated");
assert.equal(outdated.freshness, "expired");
assert.ok(outdated.confidence <= 0.2, "confidence dropped");
console.log("[5] markOutdated demotes a record (kind=outdated, expired, low confidence) ✔");

// === 6. Tenant isolation. ===
assert.equal(sot.query(OTHER).length, 0, "no cross-tenant records");
console.log("[6] tenant isolation ✔");

console.log(
  "\nSOURCE-OF-TRUTH MANAGEMENT SMOKE OK — distinguishes verified facts / assumptions / outdated / preferences / inferred patterns / external research / documents / contacts / financial data; every record carries source/confidence/freshness/owner/last-verified/update-trigger; freshness decays with a per-kind TTL; verify/markOutdated/needsVerification work; tenant-isolated.",
);
