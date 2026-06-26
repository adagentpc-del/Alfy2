/**
 * Runtime smoke for the Leverage Engine. Proves a high-leverage option scores into the compounding/
 * generational tier with three top drivers, that compare ranks options descending and recommends the
 * highest-leverage path, and that comparisons are tenant-scoped. Run with: `tsx scripts/leverage-smoke.mts`.
 */
import assert from "node:assert/strict";
import { LeverageEngine } from "@alfy2/core";
import { ScoreLeverageInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new LeverageEngine({ clock: () => NOW, idFactory });

const HIGH = {
  revenue_impact: 0.9, time_saved: 0.9, stress_reduced: 0.9, knowledge_created: 0.9,
  automation_potential: 0.9, businesses_helped: 0.9, assets_created: 0.9, people_helped: 0.9,
  future_reuse: 0.9, founderos_potential: 0.9, brand_value: 0.9, relationship_value: 0.9,
  decision_quality: 0.9, longevity: 0.9,
};
const LOW = {
  revenue_impact: 0.4, time_saved: 0.4, stress_reduced: 0.4, knowledge_created: 0.4,
  automation_potential: 0.4, businesses_helped: 0.4, assets_created: 0.4, people_helped: 0.4,
  future_reuse: 0.4, founderos_potential: 0.4, brand_value: 0.4, relationship_value: 0.4,
  decision_quality: 0.4, longevity: 0.4,
};

// === 1. A high-leverage option scores into the compounding/generational tier. ===
const score = engine.score(ScoreLeverageInputSchema.parse({ option_label: "Build the reusable SOP", inputs: HIGH }));
assert.ok(score.tier === "compounding" || score.tier === "generational", "high inputs → compounding/generational");
console.log(`[1] score → tier '${score.tier}' (${score.score}) ✔`);

// === 2. top_drivers has exactly 3 drivers. ===
assert.equal(score.top_drivers.length, 3, "exactly 3 top drivers");
console.log(`[2] top_drivers length 3: ${score.top_drivers.join(", ")} ✔`);

// === 3. compare ranks descending and recommends the highest-leverage option. ===
const comparison = engine.compare(TENANT, [
  ScoreLeverageInputSchema.parse({ option_label: "Solve it manually", inputs: LOW }),
  ScoreLeverageInputSchema.parse({ option_label: "Build the reusable SOP", inputs: HIGH }),
]);
assert.ok(comparison.ranked[0]!.score >= comparison.ranked[1]!.score, "ranked descending");
assert.equal(comparison.recommended_option, "Build the reusable SOP", "recommends highest leverage");
console.log(`[3] compare ranks desc; recommends '${comparison.recommended_option}' ✔`);

// === 4. get reads the persisted comparison. ===
assert.equal(engine.get(TENANT, comparison.id)!.id, comparison.id, "comparison persisted + readable");
console.log("[4] get reads the comparison ✔");

// === 5. Tenant isolation — another tenant cannot see the comparison. ===
assert.equal(engine.get(OTHER, comparison.id), undefined, "get is tenant-scoped");
assert.equal(engine.list(OTHER).length, 0, "other tenant has none");
assert.equal(engine.list(TENANT).length, 1, "this tenant keeps it");
console.log("[5] tenant isolation ✔");

console.log(
  "\nLEVERAGE SMOKE OK — a high-leverage option scores into the compounding/generational tier with three top drivers, compare ranks options descending and recommends the highest-leverage path (not the fastest), and comparisons are tenant-scoped.",
);
