/**
 * Runtime smoke for the Org Health / CODO engine (Chief Organizational Development Officer).
 * Proves: wellness for an overloaded agent flags overloaded + a non-ok recommendation; a poor
 * communication audit scores low + flags issues; a correction trains (not replaces) a struggling
 * agent; the org-health report scores 0-100 with the overloaded agent in bottlenecks; the CEO
 * coaching report carries a recommended focus for next month. Deterministic.
 * Run: `tsx scripts/org-health-smoke.mts`.
 */
import assert from "node:assert/strict";
import { OrgHealthEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new OrgHealthEngine({ clock: () => NOW, idFactory: id });

// 1. Wellness for an overloaded agent → overloaded=true + a non-ok recommendation.
const overloadedAgent = "Social Media Manager";
const w1 = e.recordWellness(TENANT, {
  agent: overloadedAgent,
  workload: 24,
  waiting_tasks: 9,
  avg_response_ms: 42_000,
  approval_delay_ms: 30 * 60 * 1000, // 30 min — well over the 15-min threshold
  failure_rate: 0.45,
  handoff_success: 0.4,
  context_size: 8000,
  cost_per_run: 0.12,
  token_efficiency: 0.35,
});
assert.equal(w1.overloaded, true, "overloaded agent is flagged overloaded");
assert.notEqual(w1.recommendation, "ok", "overloaded agent gets a non-ok recommendation");

// A healthy, lightly-loaded agent → ok.
const w2 = e.recordWellness(TENANT, {
  agent: "Content Strategist",
  workload: 1,
  waiting_tasks: 0,
  avg_response_ms: 3_000,
  approval_delay_ms: 1_000,
  failure_rate: 0.02,
  handoff_success: 0.95,
  context_size: 2000,
  cost_per_run: 0.04,
  token_efficiency: 0.9,
});
assert.equal(w2.overloaded, false, "healthy agent is not overloaded");
assert.equal(w2.recommendation, "ok", "healthy agent is ok");

// 2. Audit a poor communication → low score + issues flagged.
const poor = e.auditCommunication(TENANT, {
  from_agent: "Sales Strategist",
  to_agent: overloadedAgent,
  packet_id: null,
  clarity: 0.3,
  completeness: 0.2,
  context: 0.25,
  resource_availability: 0.4,
  ambiguity: 0.8, // higher = worse
  handoff_quality: 0.3,
  business_awareness: 0.4,
  goal_awareness: 0.3,
  kpi_awareness: 0.2,
  approval_awareness: 0.4,
});
assert.ok(poor.score <= 0.5, "poor communication scores low");
assert.ok(poor.issues.length > 0, "poor communication flags issues");
assert.ok(poor.issues.includes("missing KPI awareness"), "missing KPI awareness flagged");
assert.ok(poor.issues.includes("unclear handoff"), "unclear handoff flagged");

// A strong communication → high score + no issues.
const strong = e.auditCommunication(TENANT, {
  from_agent: "Content Strategist",
  to_agent: "Sales Strategist",
  clarity: 0.95,
  completeness: 0.9,
  context: 0.9,
  resource_availability: 0.95,
  ambiguity: 0.05,
  handoff_quality: 0.9,
  business_awareness: 0.9,
  goal_awareness: 0.9,
  kpi_awareness: 0.85,
  approval_awareness: 0.9,
});
assert.ok(strong.score > 0.5, "strong communication scores high");
assert.equal(strong.issues.length, 0, "strong communication flags no issues");

// 3. Record a correction (train, don't replace).
const correction = e.recordCorrection(TENANT, {
  agent: overloadedAgent,
  failure_diagnosis: "unclear_instructions",
  updates_made: ["instructions", "examples", "qa_checklist"],
  notes: "Tightened instructions and added 3 worked examples — agent retained, not replaced.",
});
assert.equal(correction.agent, overloadedAgent, "correction targets the struggling agent");
assert.ok(correction.updates_made.length > 0, "correction records the training updates made");

// 4. Org health report → score 0-100 + overloaded agent in bottlenecks.
const report = e.generateOrgHealthReport(TENANT, "2026-06");
assert.ok(
  report.org_health_score >= 0 && report.org_health_score <= 100,
  "org health score is within 0-100",
);
assert.ok(
  report.overloaded_agents.includes(overloadedAgent),
  "overloaded agent appears in overloaded_agents",
);
assert.ok(
  report.bottlenecks.some((b) => b.includes(overloadedAgent)),
  "overloaded agent appears in bottlenecks",
);
assert.ok(report.recommendations.length > 0, "report carries recommendations");

// 5. Weekly org review surfaces the overloaded employee + slow approvals.
const review = e.weeklyOrgReview(TENANT);
assert.ok(
  review.overloaded_employees.includes(overloadedAgent),
  "weekly review flags the overloaded employee",
);
assert.ok(
  review.approvals_slowing_things_down.some((a) => a.includes(overloadedAgent)),
  "weekly review flags approvals slowing things down",
);

// 6. CEO coaching report → recommended_focus_next_month present.
const coaching = e.generateCeoCoachingReport(TENANT, "2026-06");
assert.ok(
  coaching.recommended_focus_next_month.length > 0,
  "CEO coaching report has a recommended focus for next month",
);
assert.ok(coaching.ai_should_own.length > 0, "CEO coaching report names what AI should own");

console.log(
  `ORG HEALTH (CODO) SMOKE OK — overloaded "${overloadedAgent}" flagged (${w1.recommendation}), ` +
    `poor comm scored ${poor.score.toFixed(2)} with ${poor.issues.length} issues, ` +
    `correction trained-not-replaced, org_health_score=${report.org_health_score}, ` +
    `${coaching.recommended_focus_next_month.length} CEO focus items`,
);
