/**
 * Runtime smoke for the Multiplication Engine. Proves a solution's future-use estimate (targets ×
 * uses-per-target) drives the multiplication score and a share recommendation with shared forms, and that
 * evaluations are tenant-scoped. Run with: `tsx scripts/multiplication-smoke.mts`.
 */
import assert from "node:assert/strict";
import { MultiplicationEngine } from "@alfy2/core";
import { EvaluateMultiplicationInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new MultiplicationEngine({ clock: () => NOW, idFactory });

// === 1. estimated_future_uses = helps.length × uses-per-target = 4 × 30 = 120. ===
const evaluation = engine.evaluate(
  TENANT,
  EvaluateMultiplicationInputSchema.parse({
    solution_title: "Reusable onboarding workflow",
    helps: ["another_business", "another_department", "another_agent", "clients"],
    estimated_uses_per_target: 30,
  }),
);
assert.equal(evaluation.estimated_future_uses, 120, "4 targets × 30 = 120 future uses");
console.log(`[1] estimated_future_uses = ${evaluation.estimated_future_uses} ✔`);

// === 2. multiplication_score caps at 1 (120/100 → 1). ===
assert.equal(evaluation.multiplication_score, 1, "score caps at 1");
console.log(`[2] multiplication_score = ${evaluation.multiplication_score} ✔`);

// === 3. recommend_share true; recommended_shared_forms non-empty. ===
assert.equal(evaluation.recommend_share, true, "≥5 future uses → share it");
assert.ok(evaluation.recommended_shared_forms.length > 0, "shared forms recommended");
console.log(`[3] recommend_share=true; ${evaluation.recommended_shared_forms.length} shared forms ✔`);

// === 4. topByMultiplication ranks evaluations by leverage. ===
engine.evaluate(TENANT, EvaluateMultiplicationInputSchema.parse({ solution_title: "Niche fix", helps: ["another_workflow"], estimated_uses_per_target: 2 }));
const ranked = engine.topByMultiplication(TENANT);
assert.equal(ranked[0]!.id, evaluation.id, "biggest force-multiplier first");
console.log("[4] topByMultiplication ranks descending ✔");

// === 5. Tenant isolation — another tenant cannot see the evaluation. ===
assert.equal(engine.get(OTHER, evaluation.id), undefined, "get is tenant-scoped");
assert.equal(engine.list(OTHER).length, 0, "other tenant has none");
console.log("[5] tenant isolation ✔");

console.log(
  "\nMULTIPLICATION SMOKE OK — a solution's future-use estimate (targets × uses-per-target) drives the multiplication score and a share recommendation with shared forms, ranking surfaces the biggest force-multipliers, and evaluations are tenant-scoped.",
);
