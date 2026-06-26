/**
 * Runtime smoke for the Legacy Engine. Proves capturing repeatable, strategically valuable knowledge scores
 * it (~0.75 for 0.8/0.7) and recommends enduring forms, the byKind / topByLegacy views work, and items are
 * tenant-scoped. Run with: `tsx scripts/legacy-smoke.mts`.
 */
import assert from "node:assert/strict";
import { LegacyEngine } from "@alfy2/core";
import { CaptureLegacyInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new LegacyEngine({ clock: () => NOW, idFactory });

// === 1. capture scores legacy (0.8*0.5 + 0.7*0.5 = 0.75) and recommends forms. ===
const item = engine.capture(
  TENANT,
  CaptureLegacyInputSchema.parse({ kind: "framework", title: "The Compounding Loop", repeatability: 0.8, strategic_value: 0.7 }),
);
assert.ok(Math.abs(item.legacy_score - 0.75) < 1e-9, "legacy_score ≈ 0.75");
assert.ok(item.recommended_forms.length > 0, "recommended forms non-empty");
console.log(`[1] capture → legacy_score = ${item.legacy_score}; ${item.recommended_forms.length} forms ✔`);

// === 2. byKind filters to the captured kind. ===
engine.capture(TENANT, CaptureLegacyInputSchema.parse({ kind: "podcast_lesson", title: "Lesson from Ep 9", repeatability: 0.4, strategic_value: 0.3 }));
const frameworks = engine.byKind(TENANT, "framework");
assert.equal(frameworks.length, 1, "one framework");
assert.equal(frameworks[0]!.id, item.id, "right item");
console.log(`[2] byKind('framework') returns ${frameworks.length} ✔`);

// === 3. topByLegacy ranks by long-term legacy value (descending). ===
const top = engine.topByLegacy(TENANT, 2);
assert.equal(top.length, 2, "honors the limit");
assert.equal(top[0]!.id, item.id, "highest legacy_score first");
console.log("[3] topByLegacy ranks descending ✔");

// === 4. Tenant isolation — another tenant cannot see the items. ===
assert.equal(engine.list(OTHER).length, 0, "other tenant has none");
assert.equal(engine.list(TENANT).length, 2, "this tenant keeps both");
console.log("[4] tenant isolation ✔");

console.log(
  "\nLEGACY SMOKE OK — capturing repeatable, strategically valuable knowledge scores it (≈0.75 for 0.8/0.7) and recommends enduring forms, byKind / topByLegacy views work, and items are tenant-scoped.",
);
