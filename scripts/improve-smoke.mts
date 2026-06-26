/**
 * Runtime smoke for the Continuous Improvement Engine. Proves health_score is the mean of the six metrics,
 * that >=2 manual steps with slow speed yields an 'automate' recommendation, that a low-value workflow
 * yields a 'remove' recommendation, that recommendations are ranked by impact × confidence, that
 * worstFirst orders by health, and that re-evaluating a workflow upserts (no duplicate).
 * Run with: `tsx scripts/improve-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ContinuousImprovementEngine } from "@alfy2/core";
import { EvaluateWorkflowInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new ContinuousImprovementEngine({ clock: () => NOW, idFactory: id });

const evaluate = (tenant: string, input: Record<string, unknown>) => engine.evaluate(tenant, EvaluateWorkflowInputSchema.parse(input));

// === 1. health_score = mean of the six metrics. ===
const metrics = { speed: 0.3, quality: 0.6, cost_efficiency: 0.9, conversion: 0.6, reliability: 0.6, user_ease: 0.6 };
const mean = (0.3 + 0.6 + 0.9 + 0.6 + 0.6 + 0.6) / 6;
const e1 = evaluate(TENANT, { workflow_name: "Manual Invoicing", metrics, manual_steps: 3, low_value: false });
assert.ok(Math.abs(e1.health_score - mean) < 1e-6, `health_score is the mean (${e1.health_score} ≈ ${mean})`);
console.log(`[1] health_score = mean of 6 metrics (${e1.health_score}) ✔`);

// === 2. >=2 manual steps + slow speed → an 'automate' recommendation. ===
assert.ok(e1.recommendations.some((r) => r.action === "automate"), "automate recommended for slow + manual");
console.log("[2] manual_steps>=2 + slow speed → 'automate' ✔");

// === 3. A low-value workflow → a 'remove' recommendation. ===
const e2 = evaluate(TENANT, {
  workflow_name: "Vanity Report",
  metrics: { speed: 0.5, quality: 0.5, cost_efficiency: 0.5, conversion: 0.5, reliability: 0.5, user_ease: 0.5 },
  low_value: true,
});
assert.ok(e2.recommendations.some((r) => r.action === "remove"), "remove recommended for low-value");
console.log("[3] low_value → 'remove' ✔");

// === 4. Recommendations are ranked by impact × confidence. ===
for (let i = 1; i < e1.recommendations.length; i++) {
  const prev = e1.recommendations[i - 1]!;
  const cur = e1.recommendations[i]!;
  assert.ok(prev.expected_impact * prev.confidence >= cur.expected_impact * cur.confidence, "ranked by impact × confidence");
}
console.log(`[4] recommendations ranked by impact × confidence (${e1.recommendations.length}) ✔`);

// === 5. worstFirst orders by health (worst first). ===
const worst = engine.worstFirst(TENANT);
for (let i = 1; i < worst.length; i++) {
  assert.ok(worst[i - 1]!.health_score <= worst[i]!.health_score, "ordered worst-health first");
}
assert.equal(worst[0]!.workflow_name, "Vanity Report", "the lowest-health workflow (0.5 < 0.6) comes first");
console.log("[5] worstFirst orders by health ✔");

// === 6. Re-evaluating the same workflow upserts (no duplicate). ===
const before = engine.list(TENANT).length;
const reEval = evaluate(TENANT, { workflow_name: "Manual Invoicing", metrics: { ...metrics, speed: 0.9 }, manual_steps: 0, low_value: false });
assert.equal(engine.list(TENANT).length, before, "re-evaluation does not add a duplicate");
assert.equal(reEval.id, e1.id, "the same workflow keeps its id across re-evaluation");
console.log("[6] re-evaluating a workflow upserts (no dup) ✔");

// === 7. Tenant isolation. ===
assert.equal(engine.list(OTHER).length, 0, "no cross-tenant evaluations");
console.log("[7] tenant isolation ✔");

console.log(
  "\nCONTINUOUS IMPROVEMENT SMOKE OK — health_score is the mean of the six metrics; >=2 manual steps with slow speed yields 'automate'; a low-value workflow yields 'remove'; recommendations are ranked by impact × confidence; worstFirst orders by health; re-evaluating a workflow upserts (no duplicate); engine is tenant-isolated.",
);
