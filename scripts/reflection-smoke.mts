/**
 * Runtime smoke for the Reflection Engine. Proves dropped follow-ups produce a lesson and a risk, a weak
 * automation (<0.4 success) is flagged to retire, workflow bottlenecks generate both an automation and a
 * new agent to build, next-period priorities are always non-empty, and reflections are recorded per period.
 * Run with: `tsx scripts/reflection-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ReflectionEngine } from "@alfy2/core";
import { ReflectionInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new ReflectionEngine({ clock: () => NOW, idFactory: id });

// === 1. Reflect on a busy month with failures, a weak automation, and bottlenecks. ===
const report = engine.reflect(TENANT, ReflectionInputSchema.parse({
  period: "monthly",
  period_label: "2026-06",
  revenue_created_usd: 12000,
  follow_up_failures: 3,
  opportunities_missed: 2,
  automation_performance: { "stale-lead-nudge": 0.25, "invoice-chaser": 0.85 },
  workflow_bottlenecks: ["manual invoice reconciliation"],
  decision_quality: 0.8,
  goals_progressed: 4,
  goals_total: 5,
}));
console.log("[1] reflected on a monthly period ✔");

// === 2. Dropped follow-ups → a lesson and a risk. ===
assert.ok(report.lessons_learned.some((l) => l.includes("follow-up")), "follow-up failures produce a lesson");
assert.ok(report.risks_to_address.some((r) => r.toLowerCase().includes("follow-up")), "follow-up failures produce a risk");
console.log(`[2] follow_up_failures>0 → lesson + risk ✔`);

// === 3. A low-rate automation (<0.4) is flagged to retire; a healthy one is not. ===
assert.ok(report.workflows_to_retire.some((r) => r.includes("stale-lead-nudge")), "weak automation retired");
assert.ok(!report.workflows_to_retire.some((r) => r.includes("invoice-chaser")), "healthy automation not retired");
console.log("[3] automation <0.4 → workflows_to_retire ✔");

// === 4. Bottlenecks → an automation AND a new agent to build. ===
assert.ok(report.workflows_to_automate.some((a) => a.includes("manual invoice reconciliation")), "bottleneck → automate");
assert.ok(report.new_agents_to_build.some((a) => a.includes("manual invoice reconciliation")), "bottleneck → new agent");
console.log("[4] bottleneck → workflows_to_automate + new_agents_to_build ✔");

// === 5. Priorities are always non-empty. ===
assert.ok(report.next_period_priorities.length > 0, "next-period priorities non-empty");
const calm = engine.reflect(TENANT, ReflectionInputSchema.parse({ period: "weekly", revenue_created_usd: 5000 }));
assert.ok(calm.next_period_priorities.length > 0, "even a quiet period yields priorities");
console.log("[5] next_period_priorities always non-empty ✔");

// === 6. History by period + tenant isolation. ===
assert.equal(engine.history(TENANT, "monthly").length, 1, "one monthly reflection on record");
assert.equal(engine.history(TENANT, "weekly").length, 1, "one weekly reflection on record");
assert.equal(engine.list(OTHER).length, 0, "no cross-tenant reflections");
console.log("[6] history by period + tenant isolation ✔");

console.log(
  "\nREFLECTION ENGINE SMOKE OK — dropped follow-ups yield a lesson + a risk; a weak automation (<0.4) is flagged to retire while a healthy one isn't; bottlenecks generate both an automation and a new agent to build; next-period priorities are always present; reflections are recorded per period and tenant-isolated.",
);
