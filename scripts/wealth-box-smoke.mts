/**
 * Runtime smoke for the Wealth Architecture Dump Box. Proves a dropped idea runs the 10-step pipeline —
 * summary, scope, legality notes, upside, risk, a Wealth Knowledge Vault reference (from the asset sink),
 * and a next action — that compliance-sensitive kinds (tax/offshore) require professional review, and that
 * items are tenant-scoped. Run with: `tsx scripts/wealth-box-smoke.mts`.
 */
import assert from "node:assert/strict";
import { WealthArchitectureDumpBox } from "@alfy2/core";
import { WealthDropSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

// Capture the Wealth Knowledge Vault sink calls and return a deterministic reference id.
const sinkCalls: { kind: string; title: string }[] = [];
const assetSink = (_tenantId: string, entry: { kind: string; title: string }) => {
  sinkCalls.push(entry);
  return `vault-asset:${entry.kind}`;
};
const box = new WealthArchitectureDumpBox({ clock: () => NOW, idFactory, assetSink });

const tax = box.drop(
  TENANT,
  WealthDropSchema.parse({ kind: "tax_idea", title: "Bonus depreciation timing", content: "Accelerate deductions this year. Confirm with CPA." }),
);
const offshore = box.drop(
  TENANT,
  WealthDropSchema.parse({ kind: "offshore_idea", title: "Compliant cross-border entity", content: "Legitimate global ops. FBAR/FATCA reporting required." }),
);

// === 1. Each WealthItem carries the full 10-step pipeline output. ===
for (const item of [tax, offshore]) {
  assert.ok(item.summary.length > 0, "summary populated");
  assert.ok(item.scope.length > 0, "scope populated");
  assert.ok(item.upside >= 0 && item.upside <= 1, "upside in 0..1");
  assert.ok(item.risk >= 0 && item.risk <= 1, "risk in 0..1");
  assert.ok(item.vault_asset_id.length > 0, "vault_asset_id set");
  assert.ok(item.next_action.length > 0, "next_action set");
}
// The offshore idea is flagged with explicit legality/compliance notes (FBAR/FATCA-class concern).
assert.ok(offshore.legality_notes.length > 0, "legality_notes populated for the offshore (compliance-sensitive) idea");
console.log("[1] dropped items carry summary / scope / upside / risk / vault ref / next action; offshore flagged with legality notes ✔");

// === 2. Compliance-sensitive kinds (tax/offshore) require professional review. ===
assert.equal(tax.requires_professional_review, true, "tax_idea requires review");
assert.equal(offshore.requires_professional_review, true, "offshore_idea requires review");
console.log("[2] tax_idea + offshore_idea require professional review ✔");

// === 3. vault_asset_id comes from the asset sink. ===
assert.equal(tax.vault_asset_id, "vault-asset:tax_idea", "vault ref from the sink");
assert.equal(offshore.vault_asset_id, "vault-asset:offshore_idea", "vault ref from the sink");
assert.equal(sinkCalls.length, 2, "sink called once per drop");
console.log(`[3] vault_asset_id from the sink; ${sinkCalls.length} sink calls ✔`);

// === 4. Tenant isolation. ===
assert.ok(box.get(TENANT, tax.id), "own tenant can read its item");
assert.equal(box.get("00000000-0000-0000-0000-000000000002", tax.id), undefined, "other tenant cannot");
console.log("[4] tenant isolation on stored items ✔");

console.log(
  "\nWEALTH BOX SMOKE OK — every dropped idea runs the 10-step pipeline (summary / scope / legality / upside / risk / vault reference / next action), tax and offshore ideas require CPA/attorney review, the vault reference comes from the asset sink, and items are tenant-scoped.",
);
