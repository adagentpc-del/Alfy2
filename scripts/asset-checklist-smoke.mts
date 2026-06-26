/**
 * Runtime smoke for the Business Asset Checklist. Proves it tracks the 25 assets per business, shows
 * present/missing + completeness, recommends the fastest, highest-leverage missing asset next, surfaces
 * missing across businesses, and updates as assets are added. Run with: `tsx scripts/asset-checklist-smoke.mts`.
 */
import assert from "node:assert/strict";
import { BusinessAssetChecklist, ALL_ASSETS } from "@alfy2/core";
import { BuildChecklistInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const cl = new BusinessAssetChecklist({ clock: () => NOW, idFactory: id });

assert.equal(ALL_ASSETS.length, 25, "25 tracked assets");

// === 1. Present + missing + completeness computed. ===
const c = cl.build(TENANT, BuildChecklistInputSchema.parse({
  business_name: "Move Mi",
  present: ["logo", "domain", "email", "landing_page", "pricing", "lead_list"],
}));
assert.equal(c.present.length, 6);
assert.equal(c.missing.length, 19, "missing = 25 - present");
assert.equal(c.completeness, 0.24, "completeness = 6/25");
assert.ok(!c.missing.includes("logo" as never), "present asset not in missing");
console.log(`[1] present/missing/completeness (${Math.round(c.completeness * 100)}%) ✔`);

// === 2. Recommends the fastest, highest-leverage missing asset. ===
// Offer is the top-priority missing asset (revenue-critical, fast).
assert.equal(c.recommended_next, "offer", "recommends the offer (highest-priority missing)");
assert.ok(c.recommendation_reason.length > 0, "recommendation explained");
console.log(`[2] recommends fastest asset next: ${c.recommended_next} ✔`);

// === 3. Marking it present advances the recommendation. ===
const c2 = cl.markPresent(TENANT, "Move Mi", "offer");
assert.ok(c2.present.includes("offer"), "offer now present");
assert.notEqual(c2.recommended_next, "offer", "recommendation advances to the next-highest-priority missing");
assert.equal(c2.recommended_next, "follow_up_sequence", "next priority after offer (pricing & lead_list already present)");
console.log(`[3] mark present → recommendation advances (${c2.recommended_next}) ✔`);

// === 4. Show missing across businesses. ===
cl.build(TENANT, BuildChecklistInputSchema.parse({ business_name: "Oralia", present: ["logo"] }));
const across = cl.showMissing(TENANT);
assert.equal(across.length, 2, "two businesses tracked");
assert.ok(across.find((b) => b.business_name === "Oralia")!.missing.length === 24, "Oralia missing 24");
console.log("[4] show missing across businesses ✔");

// === 5. Complete business → no recommendation. ===
const full = cl.build(TENANT, BuildChecklistInputSchema.parse({ business_name: "Complete Co", present: [...ALL_ASSETS] }));
assert.equal(full.completeness, 1);
assert.equal(full.recommended_next, null, "nothing to recommend when complete");
console.log("[5] complete business → completeness 1, no recommendation ✔");

// === 6. Tenant isolation. ===
assert.equal(cl.list(OTHER).length, 0, "no cross-tenant checklists");
console.log("[6] tenant isolation ✔");

console.log(
  "\nBUSINESS ASSET CHECKLIST SMOKE OK — tracks 25 assets per business, shows present/missing + completeness, recommends the fastest highest-leverage missing asset next (advancing as assets are added), shows missing across businesses, tenant-isolated.",
);
