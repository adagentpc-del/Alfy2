/**
 * Wave 3 (governance, monitoring, reuse) smoke. Verifies the decision-quality guard rails:
 * Future Me flags regret, Optionality prefers preserved choices, the Thought Partner never auto-agrees,
 * the Capability Monitor surfaces high-impact tools, the Stack Evaluator refuses novelty-only change,
 * and Build Once packages reusable builds. Run: pnpm governance:smoke
 */
import assert from "node:assert/strict";
import {
  FutureMeEngine,
  OptionalityEngine,
  ExecutiveThoughtPartner,
  CapabilityMonitor,
  TechStackEvaluator,
  BuildOnceReuseEngine,
} from "@alfy2/core";

const T = "00000000-0000-0000-0000-0000000000cc";
let n = 0;
const idFactory = () => `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`;

// 1. Future Me: heavy tech debt + low optionality → regret + a better path.
const fm = new FutureMeEngine({ idFactory });
const regret = fm.assess(T, {
  decision: "Hard-code a one-off integration",
  signals: { future_thanks: 0.2, reduces_future_stress: 0.2, increases_future_opportunity: 0.2, creates_technical_debt: 0.9, creates_reusable_infrastructure: 0.1, preserves_optionality: 0.1 },
});
assert.equal(regret.verdict, "future_alyssa_regrets");
assert.ok(regret.better_path);

// 2. Optionality: prefer the path that preserves choices on an EV tie.
const opt = new OptionalityEngine({ idFactory });
const oa = opt.assess(T, {
  decision: "Pick a data layer",
  paths: [
    { path: "proprietary lock-in", expected_value: 0.6, opportunities_created: 1, opportunities_eliminated: 3, flexibility: 0.2, reusable_assets: 0.2, strategic_options: 0.2, lock_in: 0.9 },
    { path: "open standard", expected_value: 0.6, opportunities_created: 4, opportunities_eliminated: 0, flexibility: 0.9, reusable_assets: 0.8, strategic_options: 0.9, lock_in: 0.1 },
  ],
});
assert.equal(oa.recommended_path, "open standard");

// 3. Thought Partner: never auto-agrees; settled + no new evidence → refine execution.
const tp = new ExecutiveThoughtPartner({ idFactory });
assert.equal(tp.consult(T, { proposition: "Launch in Q3" }).stance, "challenge");
assert.equal(tp.consult(T, { proposition: "Use Supabase", decision_is_settled: true, new_material_evidence: false }).stance, "refine_execution");
assert.equal(tp.consult(T, { proposition: "Choose a host", options: ["Render", "Fly", "Vercel"] }).stance, "compare_options");

// 4. Capability Monitor: a tool-eliminating capability is priority now.
const cap = new CapabilityMonitor({ idFactory });
const rep = cap.assess(T, { capability: "native transcription", source: "model", impact: { replaces_workflow: 0.8, simplifies_architecture: 0.6, improves_founder_freedom: 0.5, reduces_cost: 0.7, improves_security: 0.3, eliminates_third_party_tool: 0.8, creates_product_opportunity: 0.4 } });
assert.equal(rep.priority, "now");

// 5. Stack Evaluator: no measurable benefit → never change for novelty.
const stack = new TechStackEvaluator({ idFactory });
assert.equal(stack.evaluate(T, { component: "shiny-new-orm", category: "open_source", signals: { measurable_benefit: 0.1, current_pain: 0.1, switching_cost: 0.5, risk: 0.5, maturity: 0.6 } }).disposition, "ignore");
assert.equal(stack.evaluate(T, { component: "supabase", category: "supabase", signals: { measurable_benefit: 0.8, current_pain: 0.6, switching_cost: 0.2, risk: 0.2, maturity: 0.9 } }).disposition, "replace");

// 6. Build Once: a generic build with targets gets packaged for reuse.
const reuse = new BuildOnceReuseEngine({ idFactory });
const ra = reuse.assess(T, { module: "ship-gate", generality: 0.9, targets: ["founderos", "another_business"] });
assert.equal(ra.reusable, true);
assert.ok(ra.package_as.includes("agent")); // generality >= 0.85

console.log("✓ governance smoke passed (6 engines; regret/optionality/never-auto-agree/measurable-benefit guards hold)");
