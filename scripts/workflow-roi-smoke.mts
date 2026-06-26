/**
 * Runtime smoke for Workflow ROI Tracking. Proves every automation's value is weighed against its cost
 * (time saved/revenue/cost reduced vs operating/model/human-time), an ROI is computed, workflows are
 * ranked, and each gets a scale / pause / improve / delete recommendation. Run with:
 * `tsx scripts/workflow-roi-smoke.mts`.
 */
import assert from "node:assert/strict";
import { WorkflowRoiTracker } from "@alfy2/core";
import { TrackWorkflowInputSchema, type WorkflowMetrics } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const roi = new WorkflowRoiTracker({ clock: () => NOW, idFactory: id });

const m = (over: Partial<WorkflowMetrics>): WorkflowMetrics => ({
  time_saved_hours: 0, revenue_generated_usd: 0, cost_reduced_usd: 0, errors_reduced: 0,
  risk_reduced: 0, conversion_improvement: 0, operating_cost_usd: 0, model_tool_cost_usd: 0,
  human_time_required_hours: 0, ...over,
});
const track = (name: string, metrics: WorkflowMetrics, rate = 75) =>
  roi.track(TENANT, TrackWorkflowInputSchema.parse({ workflow_name: name, metrics, human_hourly_rate: rate }));

// === 1. A strong winner → scale. ===
const winner = track("Auto follow-up reminders", m({ time_saved_hours: 20, revenue_generated_usd: 6000, cost_reduced_usd: 500, errors_reduced: 30, operating_cost_usd: 120, model_tool_cost_usd: 40, human_time_required_hours: 2 }));
assert.equal(winner.recommendation, "scale", "high-ROI winner → scale");
assert.ok(winner.roi_score !== null && winner.roi_score >= 2, "ROI computed and high");
assert.ok(winner.net_value_usd > 0 && winner.value_usd > winner.total_cost_usd, "value exceeds cost");
console.log(`[1] strong winner → scale (ROI ${winner.roi_score}x, net $${winner.net_value_usd}) ✔`);

// === 2. A value-destroying automation with no upside → delete. ===
const loser = track("Pointless scraper", m({ operating_cost_usd: 200, model_tool_cost_usd: 100, human_time_required_hours: 1 }));
assert.equal(loser.recommendation, "delete", "no value + cost → delete");
assert.ok(loser.net_value_usd < 0, "net negative");
console.log("[2] value-destroying automation → delete ✔");

// === 3. A modest-but-positive automation → improve. ===
const modest = track("Lead enricher", m({ revenue_generated_usd: 300, operating_cost_usd: 100, model_tool_cost_usd: 150 }));
assert.equal(modest.recommendation, "improve", "thin positive → improve");
console.log("[3] modest positive ROI → improve ✔");

// === 4. A marginal automation → pause. ===
const marginal = track("Marginal summarizer", m({ revenue_generated_usd: 50, cost_reduced_usd: 10, operating_cost_usd: 40, model_tool_cost_usd: 30 }));
assert.equal(marginal.recommendation, "pause", "marginal → pause");
console.log("[4] marginal automation → pause ✔");

// === 5. Ranked by ROI (desc). ===
const ranked = roi.rank(TENANT);
for (let i = 1; i < ranked.length; i += 1) {
  assert.ok((ranked[i - 1]!.roi_score ?? -Infinity) >= (ranked[i]!.roi_score ?? -Infinity), "ranked desc by ROI");
}
assert.equal(ranked[0]!.workflow_name, "Auto follow-up reminders", "winner ranks first");
assert.equal(roi.byRecommendation(TENANT, "scale").length, 1, "byRecommendation filters");
console.log(`[5] ranked by ROI (top: "${ranked[0]!.workflow_name}") ✔`);

// === 6. Re-tracking upserts (no duplicate). ===
const before = roi.rank(TENANT).length;
track("Auto follow-up reminders", m({ revenue_generated_usd: 9000, operating_cost_usd: 120, model_tool_cost_usd: 40 }));
assert.equal(roi.rank(TENANT).length, before, "re-track upserts, no duplicate");

// === 7. Tenant isolation. ===
assert.equal(roi.rank(OTHER).length, 0, "no cross-tenant records");
console.log("[6] re-track upserts; [7] tenant isolation ✔");

console.log(
  "\nWORKFLOW ROI TRACKING SMOKE OK — values each automation (time saved/revenue/cost reduced) against its cost (operating/model/human time), computes ROI, ranks workflows, recommends scale/pause/improve/delete, upserts on re-track, tenant-isolated.",
);
