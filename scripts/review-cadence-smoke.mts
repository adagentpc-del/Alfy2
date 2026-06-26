/**
 * Runtime smoke for the Executive Review Cadence + Master Docs engine.
 * Proves the cycle: open a monthly_business review → collect 3 department reports →
 * generate the master doc (asserts the EXACT required business sections, an executive
 * summary, decisions_needed, an approval checklist, and an agenda matching monthly_operator)
 * → capture Alyssa's feedback → assert the review moves to "actioned" and that feedback
 * converts into tasks + priorities.
 * Run: `tsx scripts/review-cadence-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ReviewCadenceEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new ReviewCadenceEngine({ clock: () => NOW, idFactory: id });

// 1. Open a monthly business review for "move_mi".
const review = e.openReview(TENANT, {
  level: "monthly_business",
  business_key: "move_mi",
  period: "2026-06",
  meeting_mode: "monthly_operator",
});
assert.equal(review.status, "collecting", "new review starts collecting");
assert.equal(review.business_key, "move_mi", "business_key set");
assert.equal(review.sections.length, 0, "no sections until generated");

// 2. Submit 3 department reports.
e.submitDepartmentReport(TENANT, {
  review_id: review.id,
  department_key: "sales_revenue",
  wins: ["Closed 12 new contracts"],
  failures: ["Lost 2 enterprise deals to pricing"],
  kpis: { revenue: 125000, new_customers: 12 },
  risks: ["Pipeline concentration in one segment"],
  blockers: ["CRM data quality slowing follow-ups"],
  recommendations: ["Introduce tiered pricing"],
  decisions_needed: ["Approve new pricing model?"],
});
e.submitDepartmentReport(TENANT, {
  review_id: review.id,
  department_key: "growth_marketing",
  wins: ["Lead volume up 30%"],
  failures: ["Paid CAC rose above target"],
  kpis: { leads: 480, cac: 240 },
  risks: ["Over-reliance on a single channel"],
  recommendations: ["Diversify acquisition channels"],
  decisions_needed: ["Increase content budget?"],
});
e.submitDepartmentReport(TENANT, {
  review_id: review.id,
  department_key: "product_platform",
  wins: ["Shipped scheduling v2"],
  failures: ["Mobile crash rate spiked"],
  kpis: { uptime: 99.4, releases: 3 },
  blockers: ["Tech debt in booking flow"],
  recommendations: ["Prioritize stability sprint"],
});

const reports = e.listDepartmentReports(TENANT, review.id);
assert.equal(reports.length, 3, "3 department reports collected");

// 3. Generate the master doc.
const doc = e.generateMasterDoc(TENANT, review.id);

// Required monthly_business sections are all present (exact titles).
const REQUIRED_MONTHLY_BUSINESS = [
  "Executive Summary",
  "Current Status",
  "Revenue Activity",
  "Growth Activity",
  "Product / Platform Updates",
  "Campaigns",
  "KPIs",
  "Wins",
  "Losses",
  "Risks",
  "Blockers",
  "Broken Systems",
  "Overdue Follow-Ups",
  "Feedback",
  "Analytics",
  "Financial Notes",
  "Next Priorities",
  "Decisions Needed",
];
const titles = new Set(doc.sections.map((s) => s.title));
for (const t of REQUIRED_MONTHLY_BUSINESS) {
  assert.ok(titles.has(t), `master doc has required section "${t}"`);
}

// Executive summary, decisions_needed, approval checklist, agenda.
assert.ok(doc.executive_summary.length > 0, "executive_summary is populated");
assert.ok(doc.decisions_needed.length >= 1, "decisions_needed rolled up from reports");
assert.ok(doc.approval_checklist.length >= 1, "approval_checklist built");
assert.ok(
  doc.approval_checklist.every((c) => c.checked === false),
  "approval checklist items start unchecked",
);

// Agenda matches the monthly_operator meeting questions.
assert.deepEqual(
  doc.agenda,
  [
    "What happened this month?",
    "What broke?",
    "What made money?",
    "What do we do next?",
  ],
  "agenda matches monthly_operator meeting questions",
);

// KPI tables rolled up.
assert.equal(doc.kpi_tables.length, 3, "one KPI table per reporting department");
assert.equal(doc.status, "sent_for_review", "doc moves to sent_for_review after generation");

// 4. Capture Alyssa's feedback — converts into tasks + priorities, moves to actioned.
const feedback = e.captureFeedback(TENANT, review.id, {
  decisions: ["Approved tiered pricing model"],
  updated_priorities: ["Diversify acquisition channels", "Run a stability sprint"],
  new_tasks: ["Draft tiered pricing page", "Schedule stability sprint"],
  sop_changes: ["Add CRM data hygiene step to weekly ops loop"],
  paused_or_killed: ["Pause the single-channel paid push"],
  next_review_goals: ["Reduce CAC below target"],
});
assert.ok(feedback.new_tasks.length === 2, "feedback captured 2 new tasks");

const actioned = e.getReview(TENANT, review.id);
assert.equal(actioned.status, "actioned", "review status moves to actioned");
assert.ok(
  actioned.follow_up_tasks.includes("Draft tiered pricing page"),
  "feedback converted to follow_up_tasks on the review",
);
assert.ok(
  actioned.priorities.includes("Diversify acquisition channels"),
  "feedback converted to priorities on the review",
);
assert.ok(
  actioned.decisions_needed.includes("Approved tiered pricing model"),
  "feedback decisions appended to the review",
);
assert.equal(e.listFeedback(TENANT, review.id).length, 1, "feedback persisted (append-only)");

// listReviews filter works.
assert.equal(
  e.listReviews(TENANT, { level: "monthly_business", business_key: "move_mi" }).length,
  1,
  "listReviews filters by level + business_key",
);

console.log(
  `REVIEW CADENCE SMOKE OK — monthly_business review for move_mi: 3 dept reports → master doc ` +
    `(${doc.sections.length} sections, ${doc.kpi_tables.length} KPI tables, monthly_operator agenda) ` +
    `→ feedback actioned (${feedback.new_tasks.length} tasks, ${feedback.updated_priorities.length} priorities)`,
);
