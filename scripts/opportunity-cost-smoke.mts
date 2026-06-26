/**
 * Runtime smoke for the Opportunity Cost Engine. Proves each option gets an expected value and an opportunity
 * cost, the best financial / low-risk / fastest / highest-leverage picks are named, what is NOT chosen is
 * always shown with a reason, a recommendation is made, and comparisons are tenant-scoped. Run with:
 * `tsx scripts/opportunity-cost-smoke.mts`.
 */
import assert from "node:assert/strict";
import { OpportunityCostEngine } from "@alfy2/core";
import { CompareOptionsInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new OpportunityCostEngine({ clock: () => NOW, idFactory });

// === 1. compare evaluates each option with an EV and an opportunity cost. ===
const comparison = engine.compare(
  TENANT,
  CompareOptionsInputSchema.parse({
    question: "Where to invest Q3 capital?",
    options: [
      { label: "A: Build FounderOS feature", expected_upside_usd: 200000, expected_downside_usd: 20000, capital_required_usd: 30000, time_required_days: 60, stress_cost: 0.4, complexity: 0.6, risk: 0.3, confidence: 0.7, future_leverage: 0.9 },
      { label: "B: Quick consulting gig", expected_upside_usd: 40000, expected_downside_usd: 5000, capital_required_usd: 2000, time_required_days: 10, stress_cost: 0.2, complexity: 0.2, risk: 0.1, confidence: 0.9, future_leverage: 0.2 },
      { label: "C: Risky acquisition", expected_upside_usd: 500000, expected_downside_usd: 300000, capital_required_usd: 250000, time_required_days: 120, stress_cost: 0.9, complexity: 0.9, risk: 0.9, confidence: 0.4, future_leverage: 0.6 },
    ],
  }),
);
assert.equal(comparison.evaluated.length, 3, "all three evaluated");
assert.ok(comparison.evaluated.every((e) => typeof e.expected_value_usd === "number" && typeof e.opportunity_cost_usd === "number"), "EV + opportunity cost per option");
console.log("[1] each option has expected_value_usd + opportunity_cost_usd ✔");

// === 2. The best financial / low-risk / fastest / highest-leverage picks are named. ===
assert.ok(comparison.best_financial.length > 0, "best_financial set");
assert.equal(comparison.best_low_risk, "B: Quick consulting gig", "lowest-risk option");
assert.equal(comparison.fastest, "B: Quick consulting gig", "fastest option");
assert.equal(comparison.highest_leverage, "A: Build FounderOS feature", "highest-leverage option");
console.log("[2] best_financial / best_low_risk / fastest / highest_leverage named ✔");

// === 3. What is NOT chosen is always shown, and a recommendation is made. ===
assert.ok(comparison.not_chosen.length > 0, "not_chosen explains the alternatives");
assert.ok(comparison.recommendation.length > 0, "recommendation set");
console.log(`[3] not_chosen (${comparison.not_chosen.length}) + recommendation ✔`);

// === 4. Tenant isolation — another tenant cannot see the comparison. ===
assert.equal(engine.get(OTHER, comparison.id), undefined, "get is tenant-scoped");
assert.equal(engine.list(OTHER).length, 0, "other tenant has none");
assert.equal(engine.list(TENANT).length, 1, "this tenant keeps it");
console.log("[4] tenant isolation ✔");

console.log(
  "\nOPPORTUNITY COST SMOKE OK — each option gets an expected value and opportunity cost, the best financial / low-risk / fastest / highest-leverage picks are named, what is NOT chosen is always shown with a reason, a recommendation is made, and comparisons are tenant-scoped.",
);
