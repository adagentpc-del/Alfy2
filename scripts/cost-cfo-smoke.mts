/**
 * Runtime smoke for the Cost & Token CFO. Proves per-workflow cost decomposition, per-unit costs, ROI,
 * break-even, and recommendations (cheaper/local model, batch, pause, upgrade). Run with: `tsx scripts/cost-cfo-smoke.mts`.
 */
import assert from "node:assert/strict";
import { CostCfo } from "@alfy2/core";
import { WorkflowCostInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
const cfo = new CostCfo({ clock: () => NOW });

// === 1. Per-unit costs + ROI + break-even, model-heavy + high volume → cheaper/local/batch/upgrade. ===
const good = cfo.analyze(TENANT, WorkflowCostInputSchema.parse({
  workflow_name: "Cold email outbound",
  costs: { model: 90, api: 10, automation: 8, tool_subscription: 5, compute: 5, storage: 2.5 },
  human_time_saved_hours: 100, human_hourly_rate_usd: 75, revenue_created_usd: 900,
  tasks: 500, leads: 30, booked_calls: 6, sales: 2,
}));
assert.equal(good.total_cost_usd, 120.5, "total = sum of categories");
assert.equal(good.value_usd, 8400, "value = revenue + time saved×rate");
assert.equal(good.cost_per_task, 0.241, "cost per task");
assert.equal(good.cost_per_sale, 60.25, "cost per sale");
assert.ok(good.roi! > 60, "strong ROI");
assert.equal(good.break_even_revenue_usd, 120.5, "break-even = total cost");
assert.equal(good.largest_cost_category, "model", "model dominates");
assert.ok(good.recommendations.includes("cheaper_model") && good.recommendations.includes("local_model"), "model-heavy → cheaper/local");
assert.ok(good.recommendations.includes("batch_processing"), "high volume → batch");
assert.ok(good.recommendations.includes("upgrade_when_roi_supports"), "strong ROI → upgrade");
console.log("[1] decomposition + per-unit + ROI + break-even + model recs ✔");

// === 2. Negative ROI → pause. ===
const bad = cfo.analyze(TENANT, WorkflowCostInputSchema.parse({
  workflow_name: "Expensive experiment",
  costs: { model: 200, api: 50, automation: 0, tool_subscription: 0, compute: 0, storage: 0 },
  human_time_saved_hours: 0, revenue_created_usd: 50, tasks: 10,
}));
assert.ok(bad.roi! < 0, "negative ROI");
assert.ok(bad.recommendations.includes("pause_expensive_agent"), "negative ROI → pause");
console.log("[2] negative ROI → pause ✔");

// === 3. Per-unit null when denominator is zero. ===
const noLeads = cfo.analyze(TENANT, WorkflowCostInputSchema.parse({ workflow_name: "No leads yet", costs: { model: 10, api: 0, automation: 0, tool_subscription: 0, compute: 0, storage: 0 }, tasks: 5, leads: 0, booked_calls: 0, sales: 0 }));
assert.equal(noLeads.cost_per_lead, null, "no leads → null per-lead");
assert.equal(noLeads.cost_per_task, 2, "tasks still computed");
console.log("[3] per-unit null when denominator is zero ✔");

console.log(
  "\nCOST & TOKEN CFO SMOKE OK — decomposes 6 cost categories, computes cost per task/lead/booked-call/sale, ROI and break-even, and recommends cheaper/local model + batch + upgrade (strong ROI) or pause (negative ROI).",
);
