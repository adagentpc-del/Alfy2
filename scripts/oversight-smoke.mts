/**
 * Runtime smoke for the Oversight engine — three cross-cutting quality / visibility gates:
 *   1. Leadership Blind-Spot Detector — surfaces what leadership can't see, each with a reporting fix + cadence.
 *   2. Recursive System Optimizer — same operating questions applied at the 'agent' layer.
 *   3. Billion-Dollar Standard Checker — passes only when all nine criteria are true; otherwise
 *      lists the specific revisions needed (revise before execution).
 * Deterministic. Run: `tsx scripts/oversight-smoke.mts`.
 */
import assert from "node:assert/strict";
import { OversightEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new OversightEngine({ clock: () => NOW, idFactory: id });

// 1. Leadership Blind-Spot Detector — for a department scope.
const blindSpots = e.detectBlindSpots(TENANT, { scope: "growth_marketing" });
assert.ok(blindSpots.length >= 1, "detects at least one blind spot for the department");
assert.ok(
  blindSpots.every((b) => b.scope === "growth_marketing"),
  "all blind spots carry the requested scope",
);
assert.ok(
  blindSpots.every((b) => b.reporting_fix.length > 0),
  "every blind spot has a concrete reporting_fix",
);
assert.ok(
  blindSpots.every((b) => ["daily", "weekly", "monthly"].includes(b.cadence)),
  "every blind spot has a valid cadence",
);
assert.ok(
  blindSpots.every((b) => b.owner.length > 0),
  "every blind spot has an owner",
);
assert.equal(
  e.listBlindSpots(TENANT, "growth_marketing").length,
  blindSpots.length,
  "blind spots are persisted under the scope",
);

// 2. Recursive System Optimizer — at the 'agent' layer.
const diag = e.runRecursiveDiagnosis(TENANT, {
  layer: "agent",
  subject: "Outbound SDR Agent",
  stakeholder: "Prospect",
  objective: "Book qualified meetings without damaging brand.",
  first_impression: "The first outbound message feels personal and relevant.",
  trust_gap: "Generic templated copy reads as spam and breaks trust instantly.",
  conversion_action: "Prospect replies and books a meeting.",
  support_loop: "Follow-ups answer objections and route warm replies to a human.",
  kpi: "qualified_meetings_booked",
  feedback_loop: "Reply sentiment + opt-outs feed back into messaging.",
  retention_loop: "Nurture sequence keeps non-ready prospects warm.",
  root_failure_point: "Over-automation: sending volume that flags the domain as spam.",
});
assert.equal(diag.layer, "agent", "diagnosis recorded at the agent layer");
assert.equal(diag.subject, "Outbound SDR Agent", "diagnosis subject preserved");
assert.equal(diag.kpi, "qualified_meetings_booked", "diagnosis carries the layer KPI");
assert.ok(diag.root_failure_point.length > 0, "diagnosis names a root failure point");
assert.equal(
  e.listDiagnoses(TENANT, "agent").length,
  1,
  "agent-layer diagnosis is persisted",
);

// 3a. Billion-Dollar Standard Checker — all true => passed.
const pass = e.runBillionDollarCheck(TENANT, {
  subject: "New client onboarding flow",
  investor_grade: true,
  client_grade: true,
  legal_grade: true,
  operator_grade: true,
  scales_100x: true,
  protects_brand: true,
  protects_revenue: true,
  protects_trust: true,
  reduces_future_chaos: true,
});
assert.equal(pass.passed, true, "all nine criteria true => passed");
assert.equal(pass.revisions_needed.length, 0, "passed check needs no revisions");

// 3b. One criterion false => not passed + revisions populated.
const fail = e.runBillionDollarCheck(TENANT, {
  subject: "Rushed pricing page",
  investor_grade: true,
  client_grade: true,
  legal_grade: true,
  operator_grade: true,
  scales_100x: true,
  protects_brand: true,
  protects_revenue: false, // the failing check
  protects_trust: true,
  reduces_future_chaos: true,
});
assert.equal(fail.passed, false, "any false criterion => not passed");
assert.ok(fail.revisions_needed.length >= 1, "failing check populates revisions_needed");
assert.ok(
  fail.revisions_needed.includes("Revise before execution."),
  "the enforced rule travels with the failing check",
);
assert.ok(
  fail.revisions_needed.includes("does not protect margin/revenue"),
  "the specific failing check is named",
);

assert.equal(e.listChecks(TENANT, true).length, 1, "one passed check recorded");
assert.equal(e.listChecks(TENANT, false).length, 1, "one failed check recorded");

console.log(
  `OVERSIGHT SMOKE OK — ${blindSpots.length} blind spots (reporting fix + cadence), 1 agent-layer diagnosis, billion-dollar gate passes all-true and blocks any-false`,
);
