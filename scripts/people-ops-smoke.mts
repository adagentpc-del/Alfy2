/**
 * Runtime smoke for the People Operations + Hiring Lifecycle engine. Drives the full lifecycle for an
 * AI/human worker: detect role need → design role → evaluate against the Billion-Dollar Hiring Standard
 * (a VAGUE role FAILS and the post is blocked; a SCOPED role PASSES) → generate job post → add
 * candidates → interview → offer → onboarding docs tracked → access grants → training → nurture →
 * performance → delegation → offboarding (asserts every access grant ends up revoked).
 * Run with: `pnpm tsx scripts/people-ops-smoke.mts`.
 */
import assert from "node:assert/strict";
import { PeopleOpsEngine, PeopleOpsEngineError } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new PeopleOpsEngine({ clock: () => NOW, idFactory: id });

// === 1. Role Need Detection ===
const need = engine.detectRoleNeed(TENANT, {
  description: "I keep doing inbound lead triage every day and it blocks me from selling.",
  frequency_per_week: 6,
  worker_kind: "human",
  founder_work_absorbed: ["lead triage", "first-touch replies"],
});
assert.ok(need.id, "need created");
assert.equal(need.severity, "high", "high frequency → high severity");
assert.equal(need.role_recommended, true, "a role is recommended");
console.log(`[1] role need detected (trigger=${need.trigger}, handler=${need.recommended_handler}) ✔`);

// === 2. A VAGUE role FAILS the Billion-Dollar Hiring Standard, and posting is BLOCKED. ===
const vague = engine.designRole(TENANT, {
  need_id: need.id,
  title: "General helper",
  mission: "",
  responsibilities: [],
  outcomes: [],
  required_skills: [],
  success_metrics: [],
  access_required: [],
});
const vagueEval = engine.evaluateHiringStandard(TENANT, vague.id);
assert.equal(vagueEval.passed, false, "vague role FAILS the standard");
assert.ok(vagueEval.failed_criteria.length > 0, "vague role lists failed criteria");
assert.equal(engine.getRole(TENANT, vague.id).standard_passed, false, "role marked not passed");
assert.throws(
  () => engine.generateJobPost(TENANT, vague.id),
  PeopleOpsEngineError,
  "posting a role that failed the standard MUST throw",
);
console.log(`[2] vague role FAILS (${vagueEval.failed_criteria.length} failed) and job-post is blocked ✔`);

// === 3. A SCOPED role PASSES the standard. ===
const role = engine.designRole(TENANT, {
  need_id: need.id,
  title: "Inbound Sales Development Rep",
  mission: "Own inbound lead triage and first-touch so the founder only sees qualified deals.",
  responsibilities: ["Triage inbound leads", "Send first-touch replies", "Book qualified demos"],
  outcomes: ["Every inbound lead triaged within 1 hour", "Grow qualified pipeline by 20%"],
  required_skills: ["CRM hygiene", "B2B written comms"],
  tools_used: ["HubSpot", "Slack"],
  business_or_project: "Core SaaS business",
  time_commitment: "full_time",
  compensation_range: "$60k-$75k + commission",
  success_metrics: ["lead response time < 1h", "qualified pipeline +20%"],
  access_required: ["email", "slack", "project_mgmt"],
});
const passEval = engine.evaluateHiringStandard(TENANT, role.id);
assert.equal(passEval.passed, true, `scoped role PASSES (failed: ${passEval.failed_criteria.join(", ")})`);
assert.deepEqual(passEval.failed_criteria, [], "no failed criteria");
assert.equal(engine.getRole(TENANT, role.id).standard_passed, true, "role marked passed");
console.log("[3] scoped role PASSES the Billion-Dollar Hiring Standard ✔");

// === 4. Generate job post (only allowed because the role PASSED). ===
const post = engine.generateJobPost(TENANT, role.id);
assert.ok(post.job_description.includes("Inbound Sales Development Rep"), "job description has the title");
assert.ok(post.screening_questions.length > 0, "screening questions generated");
assert.ok(post.scorecard.length > 0, "scorecard generated");
assert.equal(engine.getRole(TENANT, role.id).stage, "job_posted", "role advanced to job_posted");
console.log(`[4] job post generated (${post.screening_questions.length} screening Qs) ✔`);

// === 5. Candidate Pipeline ===
const candA = engine.addCandidate(TENANT, {
  role_id: role.id,
  applicant: "Avery Quinn",
  source: "referral",
  skills: ["CRM hygiene", "B2B written comms"],
  fit_score: 0.82,
});
engine.addCandidate(TENANT, { role_id: role.id, applicant: "Sam Lee", source: "job_board", fit_score: 0.5 });
assert.equal(engine.listCandidates(TENANT, role.id).length, 2, "two candidates in pipeline");
console.log("[5] candidate pipeline has 2 candidates ✔");

// === 6. Interview Process ===
const interview = engine.startInterview(TENANT, role.id, candA.id);
assert.ok(interview.questions.length > 0, "interview questions generated");
assert.ok(interview.reference_check_checklist.length > 0, "reference checklist present");
const interviewDone = engine.recordInterviewOutcome(TENANT, interview.id, true);
assert.equal(interviewDone.recommended, true, "candidate recommended");
assert.equal(engine.getRole(TENANT, role.id).stage, "interviewing", "role at interviewing");
console.log("[6] interview run + candidate recommended ✔");

// === 7. Offer Process ===
const offer = engine.extendOffer(TENANT, role.id, candA.id, {
  compensation_terms: "$70k + commission",
  start_date: "2026-07-15",
});
assert.ok(offer.confidentiality_ip_clauses.length > 0, "offer has IP/confidentiality clauses");
const accepted = engine.acceptOffer(TENANT, offer.id);
assert.equal(accepted.accepted, true, "offer accepted");
assert.equal(engine.advanceCandidate(TENANT, candA.id, "hired").interview_status, "hired", "candidate hired");
console.log("[7] offer extended + accepted ✔");

// === 8. Onboarding Documents tracked ===
const docs = engine.createOnboardingPacket(TENANT, role.id, candA.id);
assert.equal(docs.length, 9, "nine onboarding documents in the packet");
assert.ok(docs.every((d) => d.status === "not_started"), "all docs start not_started");
const nda = docs.find((d) => d.kind === "nda")!;
const ndaSigned = engine.updateOnboardingDoc(TENANT, nda.id, "signed");
assert.equal(ndaSigned.status, "signed", "NDA marked signed");
console.log("[8] onboarding packet (9 docs) tracked; NDA signed ✔");

// === 9. Access Grants ===
const grants = engine.requestAccessGrants(TENANT, role.id, candA.id);
assert.equal(grants.length, 3, "three access grants (email, slack, project_mgmt)");
for (const g of grants) engine.grantAccess(TENANT, g.id);
assert.ok(
  engine.listAccessGrants(TENANT, role.id).every((g) => g.status === "granted"),
  "all access granted",
);
console.log("[9] access grants requested + granted ✔");

// === 10. Training ===
const training = engine.createTrainingPlan(TENANT, role.id, candA.id);
assert.ok(training.first_day_checklist.length > 0, "first day checklist present");
assert.ok(training.quality_standards.length > 0, "quality standards from success metrics");
console.log("[10] training plan created ✔");

// === 11. Nurture ===
const nurture = engine.recordNurtureCheckIn(TENANT, role.id, candA.id, {
  performance: "strong",
  morale: "strong",
  promotion_eligibility: true,
});
assert.equal(nurture.performance, "strong", "nurture records strong performance");
assert.equal(engine.getRole(TENANT, role.id).stage, "active", "role active after first nurture");
console.log("[11] nurture check-in recorded ✔");

// === 12. Performance Management ===
const review = engine.recordPerformanceReview(TENANT, role.id, candA.id, {
  deliverables: "excellent",
  reliability: "strong",
  overall: "strong",
});
assert.equal(review.overall, "strong", "performance review overall = strong");
console.log("[12] performance review recorded ✔");

// === 12b. Delegation Engine ===
const task = engine.delegateTask(TENANT, {
  role_id: role.id,
  candidate_id: candA.id,
  task: "Triage today's 40 inbound leads",
  context: "End-of-quarter surge",
  sop: "SOP: lead triage",
  expected_output: "Qualified shortlist + booked demos",
  quality_checklist: ["All leads tagged", "No lead older than 1h"],
  files_needed: ["lead export.csv"],
  approval_path: ["founder"],
  escalation_rule: "Escalate enterprise leads immediately",
});
assert.equal(task.status, "assigned", "delegated task assigned");
const completedTask = engine.setDelegationStatus(TENANT, task.id, "completed");
assert.equal(completedTask.status, "completed", "delegated task completed");
console.log("[12b] delegation task assigned + completed ✔");

// === 13. Offboarding — access MUST end up revoked. ===
const offboarding = engine.startOffboarding(TENANT, role.id, candA.id, "End of contract");
assert.equal(offboarding.steps.length, 8, "eight offboarding steps");
const offComplete = engine.completeOffboarding(TENANT, offboarding.id);
assert.equal(offComplete.access_revoked, true, "offboarding flags access_revoked");
assert.equal(offComplete.completed, true, "offboarding completed");
assert.ok(
  engine.listAccessGrants(TENANT, role.id).every((g) => g.status === "revoked"),
  "EVERY access grant is revoked after offboarding",
);
assert.equal(engine.getRole(TENANT, role.id).stage, "closed", "role closed");
console.log("[13] offboarding complete — ALL access revoked ✔");

// === 14. Tenant isolation ===
assert.equal(engine.listRoles(OTHER).length, 0, "other tenant sees no roles");
assert.throws(() => engine.getRole(OTHER, role.id), PeopleOpsEngineError, "cross-tenant role access throws");
console.log("[14] tenant isolation holds ✔");

console.log(
  "PEOPLE OPS SMOKE OK — full hiring lifecycle (need→design→standard-gate→post→pipeline→interview→offer→onboard→access→train→nurture→perf→delegate→offboard); vague role FAILS + blocked, scoped role PASSES, access revoked on exit.",
);
