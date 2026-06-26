/**
 * Runtime smoke test for the Pattern Engine. Feeds observations with clear patterns and checks
 * detection + bottlenecks + recommendations, AND both invariants: advisory-only (changes nothing)
 * and always-explain (every recommendation carries a non-empty explanation).
 * Run with: `tsx scripts/pattern-engine-smoke.mts`.
 */
import assert from "node:assert/strict";
import { PatternEngine, type BehaviorObservation } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
let n = 0;
const engine = new PatternEngine({
  clock: () => new Date("2026-06-24T12:00:00.000Z"),
  idFactory: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
});

const obs: BehaviorObservation[] = [];
const add = (o: Partial<BehaviorObservation> & Pick<BehaviorObservation, "at" | "signal">) =>
  obs.push({ measure: null, label: "", context: {}, ...o } as BehaviorObservation);

// Performs best in the mornings (high) vs afternoons (low).
for (const d of [16, 17, 18, 19]) {
  add({ at: `2026-06-${d}T09:00:00.000Z`, signal: "performance", measure: 0.88, label: "deep work" });
  add({ at: `2026-06-${d}T15:00:00.000Z`, signal: "performance", measure: 0.52, label: "admin" });
}
// Follow-ups slipping (mostly late) -> bottleneck.
for (const d of [16, 17, 18, 19]) add({ at: `2026-06-${d}T11:00:00.000Z`, signal: "follow_up", context: { outcome: "late" } });
add({ at: "2026-06-20T11:00:00.000Z", signal: "follow_up", context: { outcome: "on_time" } });
// Cold outreach repeatedly avoided.
for (const d of [16, 17, 18, 19]) add({ at: `2026-06-${d}T14:00:00.000Z`, signal: "avoidance", label: "cold outreach" });
// Meetings overrun.
for (const d of [16, 17, 18]) add({ at: `2026-06-${d}T13:00:00.000Z`, signal: "meeting", context: { outcome: "overran" } });

const report = engine.analyze(TENANT, obs);

// --- Patterns detected ---
assert.ok(report.patterns.length >= 2, "should detect multiple patterns");
const perf = report.patterns.find((p) => p.signal === "performance");
assert.ok(perf && perf.direction === "positive", "performance pattern: best in mornings");
assert.ok(/morning/i.test(perf!.summary), "names the morning peak");
const fu = report.patterns.find((p) => p.signal === "follow_up");
assert.ok(fu && fu.direction === "negative", "follow-up pattern is negative");

// --- Bottlenecks ---
const fuBottleneck = report.bottlenecks.find((b) => b.area === "Follow-ups");
assert.ok(fuBottleneck && fuBottleneck.severity === "high", "follow-up bottleneck flagged high");
assert.ok(report.bottlenecks.some((b) => b.area === "Sales outreach"), "avoidance -> sales outreach bottleneck");

// --- Recommendations across all three kinds ---
assert.ok(report.recommended_automations.length > 0, "recommends automations");
assert.ok(report.recommended_agents.some((a) => a.proposed_key === "business.followup"), "recommends a follow-up agent");
assert.ok(report.recommended_agents.some((a) => a.proposed_key === "sales.outreach"), "recommends an outreach agent");
assert.ok(report.workflow_improvements.length > 0, "recommends workflow improvements");

// --- INVARIANT 1: advisory only (never modifies behavior) ---
assert.equal(report.advisory_only, true, "report must be advisory only");
assert.match(report.summary, /never changes your behavior automatically/i, "summary states it changes nothing");

// --- INVARIANT 2: always explain (every recommendation has a non-empty explanation) ---
for (const r of report.recommended_automations) assert.ok(r.explanation.length > 0, "automation explained");
for (const r of report.recommended_agents) assert.ok(r.explanation.length > 0, "agent rec explained");
for (const r of report.workflow_improvements) assert.ok(r.explanation.length > 0, "workflow rec explained");
for (const p of report.patterns) assert.ok(p.detail.length > 0, "pattern explained");
for (const b of report.bottlenecks) assert.ok(b.description.length > 0 && b.impact.length > 0, "bottleneck explained");

console.log("PATTERN ENGINE SMOKE OK — patterns + bottlenecks + recs; advisory-only and every rec explained");
console.log(
  "found:",
  JSON.stringify(
    {
      patterns: report.patterns.map((p) => p.summary),
      bottlenecks: report.bottlenecks.map((b) => `${b.area} (${b.severity})`),
      agents: report.recommended_agents.map((a) => a.proposed_key),
    },
    null,
    2,
  ),
);
