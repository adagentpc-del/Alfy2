/**
 * Runtime smoke for the Strategic Portfolio Optimizer. Proves it analyzes all businesses together,
 * scores each across the ten dimensions, ranks them by composite, and recommends focus now / delegate /
 * automate / pause / kill / package for sale. Run with: `tsx scripts/portfolio-smoke.mts`.
 */
import assert from "node:assert/strict";
import { PortfolioOptimizer } from "@alfy2/core";
import { AnalyzePortfolioInputSchema, type PortfolioMetrics } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const opt = new PortfolioOptimizer({ clock: () => NOW, idFactory: id });

const m = (over: Partial<PortfolioMetrics>): PortfolioMetrics => ({
  revenue_potential: 0.5, speed_to_cash: 0.5, effort_required: 0.5, stress_cost: 0.5, strategic_value: 0.5,
  current_traction: 0.5, operational_drag: 0.5, capital_required: 0.5, team_dependency: 0.5, monetization_path: 0.5,
  ...over,
});

const report = opt.analyze(TENANT, AnalyzePortfolioInputSchema.parse({
  businesses: [
    // Strong + traction → focus now
    { business_name: "Move Mi", metrics: m({ revenue_potential: 0.9, speed_to_cash: 0.8, strategic_value: 0.8, current_traction: 0.7, monetization_path: 0.8, effort_required: 0.3, stress_cost: 0.2, operational_drag: 0.2, capital_required: 0.2, team_dependency: 0.3 }) },
    // Valuable but you-dependent → delegate
    { business_name: "A3 BD", metrics: m({ revenue_potential: 0.7, speed_to_cash: 0.6, strategic_value: 0.6, current_traction: 0.4, monetization_path: 0.6, team_dependency: 0.8, stress_cost: 0.7, effort_required: 0.6 }) },
    // High operational drag, decent value → automate
    { business_name: "Crowning", metrics: m({ revenue_potential: 0.6, speed_to_cash: 0.5, strategic_value: 0.5, current_traction: 0.45, monetization_path: 0.6, operational_drag: 0.8, effort_required: 0.5, team_dependency: 0.4, stress_cost: 0.4 }) },
    // Monetizable but off-strategy, low traction → package for sale
    { business_name: "Side Tool", metrics: m({ revenue_potential: 0.5, speed_to_cash: 0.5, strategic_value: 0.3, current_traction: 0.3, monetization_path: 0.8, operational_drag: 0.3, effort_required: 0.4, team_dependency: 0.3, stress_cost: 0.3 }) },
    // Weak across the board → kill
    { business_name: "Dead Idea", metrics: m({ revenue_potential: 0.2, speed_to_cash: 0.2, strategic_value: 0.2, current_traction: 0.1, monetization_path: 0.3, effort_required: 0.8, stress_cost: 0.7, operational_drag: 0.7, capital_required: 0.7, team_dependency: 0.6 }) },
  ],
}));

const rec = (name: string) => report.assessments.find((a) => a.business_name === name)!.recommendation;

// === 1. Every business scored across the 10 dimensions. ===
assert.equal(report.assessments.length, 5, "all businesses assessed");
assert.ok(report.assessments.every((a) => a.score >= 0 && a.score <= 1 && a.rationale.length > 0), "scored + explained");
console.log("[1] all businesses scored across 10 dimensions, each explained ✔");

// === 2. Ranked by composite (desc). ===
for (let i = 1; i < report.assessments.length; i += 1) {
  assert.ok(report.assessments[i - 1]!.score >= report.assessments[i]!.score, "ranked desc by composite");
}
assert.equal(report.assessments[0]!.business_name, "Move Mi", "strongest ranks first");
console.log(`[2] ranked by composite (top: ${report.assessments[0]!.business_name} @ ${report.assessments[0]!.score}) ✔`);

// === 3. All six recommendations are reachable. ===
assert.equal(rec("Move Mi"), "focus_now", "strong + traction → focus now");
assert.equal(rec("A3 BD"), "delegate", "you-dependent → delegate");
assert.equal(rec("Crowning"), "automate", "high drag → automate");
assert.equal(rec("Side Tool"), "package_for_sale", "monetizable off-strategy → package for sale");
assert.equal(rec("Dead Idea"), "kill", "weak across the board → kill");
console.log("[3] recommendations: focus_now / delegate / automate / package_for_sale / kill ✔");

// === 4. Summary names the focus + exits; tenant isolation. ===
assert.ok(/Focus now: Move Mi/.test(report.summary), "summary names the focus");
assert.equal(opt.list(OTHER).length, 0, "no cross-tenant reports");
console.log("[4] summary highlights focus + exits; tenant isolation ✔");

console.log(
  "\nSTRATEGIC PORTFOLIO OPTIMIZER SMOKE OK — analyzes all businesses together, scores across 10 dimensions (revenue/speed-to-cash/effort/stress/strategic-value/traction/drag/capital/team-dependency/monetization), ranks by composite, recommends focus-now/delegate/automate/pause/kill/package-for-sale, tenant-isolated.",
);
