/**
 * Runtime smoke for the Business Simulation Engine. Proves the A-vs-B comparator projects each option into
 * best/likely/worst with revenue/risk/time/stress and recommends the stronger one. Run with: `tsx scripts/business-simulation-smoke.mts`.
 */
import assert from "node:assert/strict";
import { BusinessSimulationEngine } from "@alfy2/core";
import { SimulateDecisionInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const sim = new BusinessSimulationEngine({ clock: () => NOW, idFactory: id });

// === 1. Lower risk/stress/time wins even with slightly lower revenue. ===
const focus = sim.simulate(TENANT, SimulateDecisionInputSchema.parse({
  kind: "focus_choice",
  question: "Move Mi or Divini Procure?",
  option_a: { label: "Move Mi", projected_revenue_usd: 100000, probability: 0.6, time_cost_days: 20, stress_cost: 0.4, risk: 0.3 },
  option_b: { label: "Divini Procure", projected_revenue_usd: 150000, probability: 0.45, time_cost_days: 45, stress_cost: 0.7, risk: 0.6 },
}));
assert.equal(focus.recommendation, "Move Mi", "lower risk/stress/time wins the composite");
assert.ok(focus.a.best_case_usd > focus.a.likely_case_usd && focus.a.likely_case_usd > focus.a.worst_case_usd, "best > likely > worst");
assert.ok(focus.a.expected_value_usd === 60000, "EV = revenue × probability");
assert.ok(focus.reason.includes("Move Mi wins"), "reason explains the win");
console.log(`[1] A-vs-B: recommends ${focus.recommendation} (lower risk/stress/time) ✔`);

// === 2. Much higher expected value overrides modestly higher risk. ===
const price = sim.simulate(TENANT, SimulateDecisionInputSchema.parse({
  kind: "pricing_choice",
  question: "Premium vs discount?",
  option_a: { label: "Premium", projected_revenue_usd: 200000, probability: 0.5, time_cost_days: 15, stress_cost: 0.3, risk: 0.35 },
  option_b: { label: "Discount", projected_revenue_usd: 60000, probability: 0.7, time_cost_days: 15, stress_cost: 0.3, risk: 0.2 },
}));
assert.equal(price.recommendation, "Premium", "much higher EV wins");
console.log("[2] higher expected value overrides modestly higher risk ✔");

// === 3. All six decision kinds accepted. ===
for (const kind of ["focus_choice", "campaign_choice", "hire_vs_automate", "pricing_choice", "lead_focus", "build_vs_sell"] as const) {
  const s = sim.simulate(TENANT, SimulateDecisionInputSchema.parse({ kind, option_a: { label: "A", projected_revenue_usd: 1000, probability: 0.5, time_cost_days: 1, stress_cost: 0.1, risk: 0.1 }, option_b: { label: "B", projected_revenue_usd: 500, probability: 0.5, time_cost_days: 1, stress_cost: 0.1, risk: 0.1 } }));
  assert.equal(s.kind, kind);
}
console.log("[3] all 6 decision kinds accepted ✔");

// === 4. Tenant isolation. ===
assert.equal(sim.list(OTHER).length, 0, "no cross-tenant simulations");
console.log("[4] tenant isolation ✔");

console.log(
  "\nBUSINESS SIMULATION SMOKE OK — A-vs-B comparator across 6 decision kinds, projects each option to best/likely/worst with expected value, and recommends the stronger option on a composite that weights EV against risk, stress, and time cost.",
);
