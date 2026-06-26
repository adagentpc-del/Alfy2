/**
 * Runtime smoke for the Sales Asset Generator. Proves it generates all twelve sales asset kinds for a
 * business and saves each to the Asset Library (via the injected sink). Run with:
 * `tsx scripts/sales-asset-smoke.mts`.
 */
import assert from "node:assert/strict";
import { SalesAssetGenerator } from "@alfy2/core";
import { GenerateSalesAssetsInputSchema, type SalesAssetKind } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

let saved = 0;
const gen = new SalesAssetGenerator({
  clock: () => NOW,
  idFactory: id,
  assetSink: (a) => { saved += 1; return `asset:${a.kind}:${saved}`; },
});

const pack = gen.generate(TENANT, GenerateSalesAssetsInputSchema.parse({
  business_name: "Move Mi",
  offer: "monthly moving retainer",
  audience: "busy homeowners and realtors",
}));

// === 1. All twelve asset kinds generated. ===
const ALL: SalesAssetKind[] = ["one_pager", "pitch_deck", "investor_deck", "sales_deck", "proposal", "email_sequence", "dm_script", "call_script", "objection_handling", "faq", "case_study_template", "onboarding_packet"];
const kinds = new Set(pack.assets.map((a) => a.kind));
for (const k of ALL) assert.ok(kinds.has(k), `pack has a ${k}`);
assert.equal(pack.assets.length, 12, "exactly 12 assets");
assert.ok(pack.assets.every((a) => a.title.length > 0 && a.body.length > 0), "every asset has title + body");
console.log("[1] all 12 sales asset kinds generated ✔");

// === 2. Each saved to the Asset Library. ===
assert.equal(saved, 12, "asset sink invoked for all 12");
assert.ok(pack.assets.every((a) => a.asset_id !== null && /^asset:/.test(a.asset_id!)), "every asset has an Asset Library reference");
console.log("[2] all 12 saved to the Asset Library (references) ✔");

// === 3. Content reflects the offer + audience. ===
assert.ok(pack.assets.some((a) => /retainer|homeowners|realtors/i.test(a.body)), "content reflects offer/audience");
console.log("[3] content reflects offer + audience ✔");

// === 4. Tenant isolation. ===
assert.equal(gen.get(OTHER, pack.id), undefined, "no cross-tenant read");
assert.equal(gen.list(OTHER).length, 0, "no cross-tenant packs");
console.log("[4] tenant isolation ✔");

console.log(
  "\nSALES ASSET GENERATOR SMOKE OK — generates all 12 sales assets (one-pager/pitch/investor/sales deck/proposal/email seq/DM/call script/objection handling/FAQ/case study/onboarding) per business, each saved to the Asset Library, tenant-isolated.",
);
