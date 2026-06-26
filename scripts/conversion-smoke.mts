/**
 * Runtime smoke for the Conversion Engine. Proves it maintains a per-business profile (baseline, active
 * tests, winning/losing copy, objections, best offers, next optimization), and — critically — decides
 * A/B winners by REVENUE PER UNIT, not vanity conversion. Run with: `tsx scripts/conversion-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ConversionEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const eng = new ConversionEngine({ clock: () => NOW, idFactory: id });

// === 1. Profile + baseline. ===
eng.setBaseline(TENANT, "Move Mi", 0.06, 12);
const p0 = eng.profileFor(TENANT, "Move Mi");
assert.equal(p0.baseline_revenue_per_unit_usd, 12);
assert.equal(p0.revenue_focused, true, "optimizes for revenue, not vanity");
console.log("[1] per-business profile + baseline ✔");

// === 2. Winner decided by REVENUE per unit, not raw conversion. ===
// Variant A converts higher (8%) but at low value; Variant B converts lower (5%) but far higher value.
const test = eng.startTest(TENANT, "Move Mi", { surface: "email", hypothesis: "Reliability beats discount", variant_a: "Save 20% with a retainer", variant_b: "Never scramble for movers again" });
const p1 = eng.recordResult(TENANT, "Move Mi", test.id, {
  conversion_a: 0.08, revenue_per_unit_a_usd: 8,   // higher conversion, lower revenue
  conversion_b: 0.05, revenue_per_unit_b_usd: 20,  // lower conversion, higher revenue
});
assert.ok(p1.winning_copy.some((c) => /Never scramble/.test(c.text)), "revenue winner (B) wins despite lower conversion");
assert.ok(p1.losing_copy.some((c) => /Save 20%/.test(c.text)), "vanity-conversion variant (A) loses");
assert.equal(p1.baseline_revenue_per_unit_usd, 20, "baseline lifts to the revenue winner");
assert.ok(p1.next_optimization.length > 0, "next optimization set");
assert.equal(p1.active_tests.length, 0, "resolved test cleared from active");
console.log("[2] winner decided by REVENUE per unit, not vanity conversion ✔");

// === 3. Objections + best offers. ===
eng.addObjection(TENANT, "Move Mi", "Too expensive");
const p2 = eng.recordOffer(TENANT, "Move Mi", { name: "Monthly retainer", conversion_rate: 0.09, revenue_usd: 2700 });
eng.recordOffer(TENANT, "Move Mi", { name: "One-off discount", conversion_rate: 0.12, revenue_usd: 600 });
const p3 = eng.profileFor(TENANT, "Move Mi");
assert.ok(p3.objections.includes("Too expensive"), "objection tracked");
assert.equal(p3.best_offers[0]!.name, "Monthly retainer", "offers ranked by revenue, not conversion");
console.log("[3] objections tracked; best offers ranked by revenue ✔");

// === 4. Tenant isolation. ===
assert.equal(eng.list(OTHER).length, 0, "no cross-tenant profiles");
console.log("[4] tenant isolation ✔");

console.log(
  "\nCONVERSION ENGINE SMOKE OK — per-business profile (baseline/active tests/winning+losing copy/objections/best offers/next optimization), A/B winners decided by revenue per unit (not vanity conversion), offers ranked by revenue, tenant-isolated.",
);
