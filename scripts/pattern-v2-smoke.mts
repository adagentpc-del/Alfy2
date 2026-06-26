/**
 * Runtime smoke for Pattern Engine v2. Proves the engine observes the expanded signal set (incl.
 * focus/health/calendar/productivity), identifies strengths, repeating mistakes, and successful
 * habits, and emits schedule recommendations — while remaining advisory-only and always explaining.
 * Run with: `tsx scripts/pattern-v2-smoke.mts`.
 */
import assert from "node:assert/strict";
import { PatternEngine } from "@alfy2/core";
import { BehaviorObservationSchema, type BehaviorObservation } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new PatternEngine({ clock: () => NOW, idFactory: id });

const obs: BehaviorObservation[] = [];
const add = (o: Partial<BehaviorObservation> & Pick<BehaviorObservation, "signal">) =>
  obs.push(BehaviorObservationSchema.parse({ at: NOW.toISOString(), ...o }));

// Strength + successful habit: follow-ups land cleanly.
for (let i = 0; i < 6; i += 1) add({ signal: "follow_up", context: { outcome: i < 5 ? "on_time" : "late" } });
// Repeating mistake: launches keep slipping.
for (let i = 0; i < 5; i += 1) add({ signal: "launch", context: { outcome: i < 4 ? "delayed" : "on_time" } });
// Focus peaks in the morning (08:00Z), low in evening (19:00Z) → schedule rec + strength.
for (let i = 0; i < 4; i += 1) add({ signal: "focus", at: "2026-06-20T08:00:00.000Z", measure: 0.85 });
for (let i = 0; i < 4; i += 1) add({ signal: "focus", at: "2026-06-20T19:00:00.000Z", measure: 0.4 });
// Calendar overload in the afternoon.
for (let i = 0; i < 4; i += 1) add({ signal: "meeting", at: "2026-06-20T14:00:00.000Z", context: { outcome: "on_time" } });
// Low health → recovery schedule rec.
for (let i = 0; i < 3; i += 1) add({ signal: "health", measure: 0.35 });
// Productivity strength.
for (let i = 0; i < 3; i += 1) add({ signal: "productivity", measure: 0.8 });

const report = engine.analyze(TENANT, obs);

assert.equal(report.advisory_only, true, "advisory only — never changes behavior");

// strengths
assert.ok(report.strengths.length >= 1, "identified strengths");
assert.ok(report.strengths.every((s) => s.explanation.length > 0), "every strength explained");
assert.ok(report.strengths.some((s) => /Follow-ups|Focus|Productivity/i.test(s.area)), "expected strengths present");
console.log(`[1] strengths identified (${report.strengths.length}), each explained ✔`);

// repeating mistakes
assert.ok(report.repeating_mistakes.some((m) => /Launches/i.test(m.area)), "launch slip flagged as repeating mistake");
assert.ok(report.repeating_mistakes.every((m) => m.occurrences >= 1 && m.explanation.length > 0), "mistakes have occurrences + explanation");
console.log(`[2] repeating mistakes identified (${report.repeating_mistakes.length}) ✔`);

// successful habits
assert.ok(report.successful_habits.some((h) => /follow/i.test(h.habit)), "clean follow-ups recognized as a habit");
assert.ok(report.successful_habits.every((h) => h.consistency >= 0 && h.consistency <= 1), "habit consistency in range");
console.log(`[3] successful habits identified (${report.successful_habits.length}) ✔`);

// schedule recommendations
assert.ok(report.schedule_recommendations.length >= 1, "schedule recommendations generated");
assert.ok(report.schedule_recommendations.some((s) => /deep work/i.test(s.title)), "deep-work window recommended");
assert.ok(report.schedule_recommendations.some((s) => /recovery/i.test(s.title)), "recovery recommended from low health");
assert.ok(report.schedule_recommendations.every((s) => s.explanation.length > 0), "every schedule rec explained");
console.log(`[4] schedule recommendations generated (${report.schedule_recommendations.length}), each explained ✔`);

console.log(
  "\nPATTERN ENGINE v2 SMOKE OK — observes the expanded signals (focus/health/calendar/productivity), identifies strengths / repeating mistakes / successful habits, emits explained schedule recommendations, advisory-only.",
);
