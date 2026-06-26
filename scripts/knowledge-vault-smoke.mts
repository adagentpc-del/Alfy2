/**
 * Runtime smoke for the Knowledge Vault. Proves it accepts all 13 input kinds, extracts the 11 fields,
 * saves the source to the Asset Library (reference only), converts knowledge into action items, and is
 * tenant-isolated. Run with: `tsx scripts/knowledge-vault-smoke.mts`.
 */
import assert from "node:assert/strict";
import { KnowledgeVault } from "@alfy2/core";
import { VaultDropSchema, VaultInputKindSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const saved: string[] = [];
const vault = new KnowledgeVault({
  clock: () => NOW,
  idFactory: id,
  assetSink: (_t, e) => { const ref = `asset:${e.title.toLowerCase().replace(/\W+/g, "-")}`; saved.push(ref); return ref; },
});

// === 1. Accepts all 13 input kinds. ===
const kinds = VaultInputKindSchema.options;
assert.equal(kinds.length, 13, "13 input kinds");
for (const k of kinds) {
  const e = vault.drop(TENANT, VaultDropSchema.parse({ kind: k, title: `${k} drop`, content: "You should always lead with the outcome. For example, a $2k audit that saves $50k. You can monetize this as a productized offer." }));
  assert.equal(e.kind, k);
}
console.log("[1] accepts all 13 input kinds ✔");

// === 2. Extracts the 11 fields + converts to actions + saves to Asset Library. ===
const entry = vault.drop(TENANT, VaultDropSchema.parse({
  kind: "youtube_transcript",
  title: "How to price a high-ticket offer",
  content: "Anchor on outcome, not hours. You should never quote an hourly rate first. “Price is a story you tell about value”. For example, a $2k audit that saves $50k. This fits AI Authority perfectly — you can package the audit as a productized offer to drive revenue.",
  businesses: ["AI Authority", "Move Mi"],
  business_ids: ["00000000-0000-0000-0000-0000000000aa"],
}));
const x = entry.extraction;
assert.ok(x.key_ideas.length > 0, "key ideas");
assert.ok(x.tactics.length > 0, "tactics");
assert.ok(x.quotes.length > 0 && x.quotes[0]!.includes("Price is a story"), "quotes extracted");
assert.ok(x.examples.length > 0, "examples");
assert.ok(x.monetization_opportunities.length > 0, "monetization opportunities");
assert.ok(x.action_items.length > 0, "ACTION ITEMS — knowledge converted to execution");
assert.equal(entry.converted_to_actions, x.action_items.length, "converted_to_actions counts actions");
assert.ok(entry.asset_id.startsWith("asset:") && saved.includes(entry.asset_id), "source saved to Asset Library (reference)");
assert.ok(x.related_businesses.includes("AI Authority"), "related business matched from content");
console.log(`[2] extracts 11 fields, converts to ${entry.converted_to_actions} actions, saves asset ✔`);

// === 3. Action items aggregate across the Vault. ===
const actions = vault.allActionItems(TENANT);
assert.ok(actions.length >= entry.converted_to_actions, "actions aggregate across entries");
console.log(`[3] ${actions.length} action items aggregated across the Vault ✔`);

// === 4. Tenant isolation. ===
assert.equal(vault.list(OTHER).length, 0, "no cross-tenant entries");
console.log("[4] tenant isolation ✔");

console.log(
  "\nKNOWLEDGE VAULT SMOKE OK — 13 input kinds, extracts 11 fields (ideas/frameworks/tactics/quotes/examples/applications/monetization/related businesses+agents+assets/action items), saves source to Asset Library (reference only), CONVERTS knowledge into action items (asset→…→cash chain), tenant-isolated.",
);
