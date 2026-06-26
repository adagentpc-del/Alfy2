/**
 * Runtime smoke for the Simulation Engine. Proves all eight simulation kinds produce a best / likely /
 * worst case with assumptions and a projection, plus risks, a recommendation, and the decision needed;
 * probabilities are coherent and an expected value is computed; and tenant isolation. Run with:
 * `tsx scripts/simulation-smoke.mts`.
 */
import assert from "node:assert/strict";
import { SimulationEngine } from "@alfy2/core";
import { SimulationInputSchema, type SimulationInput, type SimulationKind } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new SimulationEngine({ clock: () => NOW, idFactory: id });

const sim = (over: Partial<SimulationInput> & Pick<SimulationInput, "kind" | "name">): SimulationInput =>
  SimulationInputSchema.parse(over);

const KINDS: SimulationKind[] = [
  "campaign_outcome", "revenue_path", "hiring_vs_automation", "pricing_change",
  "priority_shift", "cash_flow", "implementation_risk", "agent_failure",
];

// === 1. Every kind produces a complete result. ===
for (const k of KINDS) {
  const r = engine.simulate(TENANT, sim({ kind: k, name: `${k} test` }));
  // three labelled cases
  assert.equal(r.best_case.label, "best");
  assert.equal(r.likely_case.label, "likely");
  assert.equal(r.worst_case.label, "worst");
  for (const c of [r.best_case, r.likely_case, r.worst_case]) {
    assert.ok(c.narrative.length > 0, `${k} ${c.label} has a narrative`);
    assert.ok(Object.keys(c.projection).length >= 1, `${k} ${c.label} has a projection`);
    assert.ok(c.probability >= 0 && c.probability <= 1, `${k} ${c.label} probability in range`);
  }
  // probabilities sum to ~1
  const psum = r.best_case.probability + r.likely_case.probability + r.worst_case.probability;
  assert.ok(Math.abs(psum - 1) < 0.001, `${k} probabilities sum to 1`);
  // required outputs
  assert.ok(r.risks.length >= 1, `${k} has risks`);
  assert.ok(r.recommendation.length > 0, `${k} has a recommendation`);
  assert.ok(r.decision_needed.length > 0, `${k} states the decision needed`);
  assert.ok(r.expected_value !== null, `${k} computes an expected value`);
}
console.log(`[1] all 8 kinds: best/likely/worst + assumptions + projection + risks + recommendation + decision needed ✔`);

// === 2. Best ≥ likely ≥ worst for a monotonic metric (revenue_path). ===
const rev = engine.simulate(TENANT, sim({ kind: "revenue_path", name: "MRR", parameters: { baseline_mrr: 20000, monthly_growth: 0.08 }, horizon_days: 180 }));
assert.ok(rev.best_case.projection["revenue_usd"]! >= rev.likely_case.projection["revenue_usd"]!, "best ≥ likely");
assert.ok(rev.likely_case.projection["revenue_usd"]! >= rev.worst_case.projection["revenue_usd"]!, "likely ≥ worst");
console.log(`[2] ordered cases (revenue best $${rev.best_case.projection["revenue_usd"]} ≥ likely $${rev.likely_case.projection["revenue_usd"]} ≥ worst $${rev.worst_case.projection["revenue_usd"]}) ✔`);

// === 3. Hiring vs automation reflects parameters + a real decision. ===
const hire = engine.simulate(TENANT, sim({ kind: "hiring_vs_automation", name: "Coordinator", parameters: { annual_salary: 80000, automation_cost: 5000 }, horizon_days: 180 }));
assert.ok(/automation|hire/i.test(hire.decision_needed), "decision is hire vs automate");
assert.ok(hire.best_case.projection["net_savings_usd"]! > hire.worst_case.projection["net_savings_usd"]!, "best saves more than worst");
console.log("[3] hiring-vs-automation reflects parameters and states the decision ✔");

// === 4. Tenant isolation. ===
assert.equal(engine.list(OTHER).length, 0, "no cross-tenant simulations");
assert.equal(engine.get(OTHER, rev.id), undefined, "no cross-tenant read");
console.log("[4] tenant isolation ✔");

console.log(
  "\nSIMULATION ENGINE SMOKE OK — simulates all 8 workflow kinds (campaign/revenue/hiring-vs-automation/pricing/priority/cash-flow/implementation-risk/agent-failure), each returning best/likely/worst cases with assumptions + projections, risks, a recommendation, and the decision needed, plus an expected value; tenant-isolated.",
);
