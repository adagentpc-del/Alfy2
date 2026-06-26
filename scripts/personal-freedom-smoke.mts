/**
 * Runtime smoke for the Personal Freedom Engine. Proves a week's hours yield offloadable (editing+approving)
 * hours, a 0..1 freedom score, and recommendations that EVERY pass the mandatory performance-preserving test,
 * and that reports are tenant-scoped. Run with: `tsx scripts/personal-freedom-smoke.mts`.
 */
import assert from "node:assert/strict";
import { PersonalFreedomEngine } from "@alfy2/core";
import { FreedomLogInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new PersonalFreedomEngine({ clock: () => NOW, idFactory });

// === 1. offloadable_hours = editing + approving = 6 + 3 = 9. ===
const report = engine.report(
  TENANT,
  FreedomLogInputSchema.parse({
    week_label: "2026-W26",
    hours_working: 20, hours_creating: 4, hours_editing: 6, hours_approving: 3,
    hours_outdoors: 10, hours_exercise: 4, hours_family: 8, hours_friends: 3,
    hours_travel: 2, hours_creative: 2, hours_rest: 6,
  }),
);
assert.equal(report.offloadable_hours, 9, "offloadable = editing + approving");
console.log(`[1] offloadable_hours = ${report.offloadable_hours} (editing 6 + approving 3) ✔`);

// === 2. freedom_score in 0..1. ===
assert.ok(report.freedom_score >= 0 && report.freedom_score <= 1, "score in 0..1");
console.log(`[2] freedom_score = ${report.freedom_score} (0..1) ✔`);

// === 3. Recommendations are non-empty. ===
assert.ok(report.recommendations.length > 0, "recommendations made");
console.log(`[3] ${report.recommendations.length} recommendations ✔`);

// === 4. EVERY recommendation preserves performance (the mandatory test). ===
assert.ok(report.recommendations.every((r) => r.preserves_performance === true), "all preserve performance");
console.log("[4] every recommendation preserves_performance === true ✔");

// === 5. Tenant isolation — another tenant cannot see the report. ===
assert.equal(engine.get(OTHER, report.id), undefined, "get is tenant-scoped");
assert.equal(engine.list(OTHER).length, 0, "other tenant has no reports");
assert.equal(engine.list(TENANT).length, 1, "this tenant keeps it");
console.log("[5] tenant isolation ✔");

console.log(
  "\nPERSONAL FREEDOM SMOKE OK — a week's hours yield offloadable (editing+approving) hours and a 0..1 freedom score, every recommendation passes the mandatory performance-preserving test, and reports are tenant-scoped.",
);
