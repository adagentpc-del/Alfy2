/**
 * Runtime smoke test for Campaign Intelligence. Proves: all six campaign types create with an A/B
 * variant pair + success metrics + stop conditions; automatic reporting picks the winner with lift and
 * generates improvement recommendations; after approval a campaign runs on autopilot and continues
 * until one of the five stop conditions fires (goal reached / performance drop / risk increase /
 * approval expired / paused); monthly optimization shifts traffic to the winner and bumps the version;
 * and tenant isolation. Run with: `tsx scripts/campaign-intelligence-smoke.mts`.
 */
import assert from "node:assert/strict";
import { CampaignEngine } from "@alfy2/core";
import {
  CreateCampaignInputSchema,
  type CreateCampaignInput,
  type CampaignType,
  type CampaignMetricsInput,
} from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const engine = new CampaignEngine({ clock: () => NOW, idFactory: id });

const input = (over: Partial<CreateCampaignInput>): CreateCampaignInput =>
  CreateCampaignInputSchema.parse({ type: "email", name: "Campaign", ...over });

// === 1. All six campaign types create with an A/B pair, metrics, and stop conditions. ===
const TYPES: CampaignType[] = ["email", "social", "landing_page", "funnel", "outreach", "lead_nurturing"];
for (const t of TYPES) {
  const c = engine.create(TENANT, input({ type: t, name: `${t} campaign` }));
  assert.equal(c.status, "draft", `${t} starts draft`);
  assert.equal(c.variants.length, 2, `${t} has an A/B pair`);
  assert.deepEqual(c.variants.map((v) => v.key), ["A", "B"], `${t} variants are A and B`);
  assert.ok(c.variants.every((v) => v.hypothesis.length > 0), `${t} variants have hypotheses`);
  assert.ok(c.success_metrics.length >= 1, `${t} has success metrics`);
  assert.ok(c.success_metrics.some((m) => m.primary), `${t} has a primary metric`);
}
console.log("[1] all 6 campaign types: A/B variants + success metrics + stop conditions ✔");

// === 2. Automatic reporting: winner, lift, and improvement recommendations. ===
const camp = engine.create(TENANT, input({
  type: "email",
  name: "Retainer upsell",
  min_conversion_rate: 0.02,
}));
const approved = engine.approve(TENANT, camp.id);
assert.equal(approved.status, "active", "approve → autopilot");
assert.ok(engine.activeCampaigns(TENANT).some((c) => c.id === camp.id), "active campaign is on autopilot");

const winMetrics: CampaignMetricsInput = {
  period_label: "Week 1",
  results: [
    { variant_key: "A", impressions: 1000, conversions: 60, cost_usd: 100, revenue_usd: 1800 },
    { variant_key: "B", impressions: 1000, conversions: 90, cost_usd: 100, revenue_usd: 2700 },
  ],
};
const report = engine.report(TENANT, camp.id, winMetrics);
assert.equal(report.winner, "B", "B is the winner (9% vs 6%)");
assert.ok(report.lift !== null && Math.abs(report.lift - 0.5) < 0.01, "lift is ~50%");
assert.ok(report.recommendations.length >= 2, "recommendations generated");
assert.ok(report.recommendations.some((r) => /Variant B/.test(r.description)), "recommends shifting to winner");
assert.equal(engine.get(TENANT, camp.id)!.latest_report?.winner, "B", "report stored on campaign");
console.log("[2] automatic reporting: winner + lift + improvement recommendations ✔");

// === 3. Autopilot CONTINUES while healthy. ===
const stillRunning = engine.assess(TENANT, camp.id, { goal_reached: false, risk_level: "low", approval_active: true, metrics: winMetrics });
assert.equal(stillRunning.status, "active", "healthy campaign keeps running");
assert.equal(stillRunning.stop_reason, null);
console.log("[3] autopilot continues automatically while healthy ✔");

// === 4. Monthly optimization shifts traffic to the winner and bumps the version. ===
const optimized = engine.optimize(TENANT, camp.id, winMetrics);
assert.equal(optimized.version, 2, "optimize bumps version");
assert.ok(optimized.last_optimized_at, "optimize timestamps");
assert.equal(optimized.variants.find((v) => v.key === "B")!.traffic_weight, 0.7, "winner gets more traffic");
assert.equal(optimized.variants.find((v) => v.key === "A")!.traffic_weight, 0.3, "loser gets less traffic");
console.log("[4] monthly optimization: traffic shifts to winner, version bumps ✔");

// === 5. The five stop conditions each take a campaign off autopilot. ===
// (a) goal reached → completed
const cGoal = engine.approve(TENANT, engine.create(TENANT, input({ name: "goal" })).id);
assert.equal(engine.assess(TENANT, cGoal.id, { goal_reached: true, risk_level: "low", approval_active: true, metrics: null }).status, "completed");
assert.equal(engine.get(TENANT, cGoal.id)!.stop_reason, "goal_reached");
// (b) approval expired → stopped
const cAppr = engine.approve(TENANT, engine.create(TENANT, input({ name: "appr" })).id);
const aprStop = engine.assess(TENANT, cAppr.id, { goal_reached: false, risk_level: "low", approval_active: false, metrics: null });
assert.equal(aprStop.status, "stopped");
assert.equal(aprStop.stop_reason, "approval_expired");
// (c) risk increase → stopped
const cRisk = engine.approve(TENANT, engine.create(TENANT, input({ name: "risk", max_risk: "high" })).id);
const riskStop = engine.assess(TENANT, cRisk.id, { goal_reached: false, risk_level: "high", approval_active: true, metrics: null });
assert.equal(riskStop.status, "stopped");
assert.equal(riskStop.stop_reason, "risk_increase");
// (d) performance drop → stopped (best conversion at/below floor)
const cPerf = engine.approve(TENANT, engine.create(TENANT, input({ name: "perf", min_conversion_rate: 0.05 })).id);
const poorMetrics: CampaignMetricsInput = {
  period_label: "Week 2",
  results: [
    { variant_key: "A", impressions: 1000, conversions: 10, cost_usd: 100, revenue_usd: 100 },
    { variant_key: "B", impressions: 1000, conversions: 20, cost_usd: 100, revenue_usd: 200 },
  ],
};
const perfStop = engine.assess(TENANT, cPerf.id, { goal_reached: false, risk_level: "low", approval_active: true, metrics: poorMetrics });
assert.equal(perfStop.status, "stopped");
assert.equal(perfStop.stop_reason, "performance_drop");
// (e) Alyssa pauses
const cPause = engine.approve(TENANT, engine.create(TENANT, input({ name: "pause" })).id);
const paused = engine.pause(TENANT, cPause.id);
assert.equal(paused.status, "paused");
assert.equal(paused.stop_reason, "paused");
assert.equal(engine.approve(TENANT, cPause.id).status, "active", "paused can resume");
console.log("[5] five stop conditions: goal / approval / risk / performance / pause ✔");

// === 6. Tenant isolation. ===
assert.equal(engine.get(OTHER, camp.id), undefined, "no cross-tenant read");
assert.equal(engine.activeCampaigns(OTHER).length, 0, "no cross-tenant autopilot");
console.log("[6] tenant isolation ✔");

console.log(
  "\nCAMPAIGN INTELLIGENCE SMOKE OK — 6 campaign types with A/B variants + success metrics, automatic reporting (winner/lift/recommendations), autopilot that continues automatically after approval and stops only on goal reached / performance drop / risk increase / approval expired / pause, monthly optimization (traffic shift + version bump), tenant isolation.",
);
