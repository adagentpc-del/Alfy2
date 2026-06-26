/**
 * Runtime smoke for the AI Organization / Chain of Command engine.
 * Proves the seed catalog (78 role cards across 12 departments) AND the accountability rules:
 *   - an agent cannot begin work without an accepted delegation packet (startWork THROWS)
 *   - reports flow back, are reviewed, escalations follow the chain of command
 *   - every action produces an accountability record
 *   - validateChainOfCommand passes for the seeded set and flags injected violations
 * Run: `tsx scripts/ai-org-smoke.mts`.
 */
import assert from "node:assert/strict";
import { AiOrgEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new AiOrgEngine({ clock: () => NOW, idFactory: id });

// 1. Seed all 78 role cards.
const cards = e.seedRoleCards(TENANT);
assert.equal(cards.length, 78, "seeds exactly 78 role cards");
assert.equal(e.listRoleCards(TENANT).length, 78, "78 role cards persisted");

// 12 distinct departments.
const departments = new Set(cards.map((c) => c.department_key));
assert.equal(departments.size, 12, "78 role cards span exactly 12 departments");
for (const dk of [
  "executive",
  "revenue",
  "growth",
  "product",
  "engineering",
  "operations",
  "customer_success",
  "finance",
  "legal",
  "data",
  "people_ops",
  "fundraising",
]) {
  assert.ok(departments.has(dk), `department "${dk}" present`);
}

// Layer + leadership sanity.
const execs = e.listRoleCards(TENANT, { org_layer: "executive" });
assert.equal(execs.length, 4, "4 executives");
const leaders = e.listRoleCards(TENANT, { org_layer: "department_leader" });
assert.equal(leaders.length, 11, "11 department leaders");
assert.ok(
  leaders.every((l) => l.is_leader && l.reports_to === "Executive Governor"),
  "department leaders are leaders reporting to the Executive Governor",
);
assert.ok(
  execs.every((x) => x.reports_to === "Alyssa"),
  "executives report to Alyssa",
);

// Spot-check a known card.
const cro = e.getRoleCard(TENANT, "Chief Revenue Officer");
assert.ok(cro, "Chief Revenue Officer seeded");
assert.equal(cro?.department_key, "revenue", "CRO is in revenue");
assert.ok((cro?.kpis.length ?? 0) >= 4, "CRO has KPIs");
assert.ok((cro?.operating_loop.length ?? 0) >= 4, "CRO has an operating loop");

// Idempotent re-seed.
e.seedRoleCards(TENANT);
assert.equal(e.listRoleCards(TENANT).length, 78, "re-seed does not duplicate role cards");

// 2. Issue a delegation packet.
const packet = e.issueDelegationPacket(TENANT, {
  assigning_employee: "Chief Revenue Officer",
  assigned_agent: "Outreach Agent",
  objective: "Prepare a personalized outreach sequence for 10 qualified prospects.",
  business: "Black Flag",
  project: "Q3 pipeline",
  context_stack: ["ICP definition", "prior outreach results"],
  source_of_truth_refs: ["crm://segments/qualified"],
  required_output: "Draft outreach sequence ready for approval",
  allowed_tools: ["Asset Library", "CRM (read)"],
  prohibited_actions: ["sending any external message"],
  approval_required: true,
  priority: "high",
  success_criteria: ["10 personalized drafts", "no unverified claims"],
  reporting_format: "agent report",
  escalation_trigger: "any prospect requires a pricing commitment",
});
assert.equal(packet.status, "issued", "packet issued");

// 3. startWork THROWS without an accepted packet, succeeds with one.
assert.throws(
  () => e.startWork(TENANT, packet.id),
  /cannot begin without an accepted packet|not 'accepted'/,
  "startWork refuses an un-accepted packet (an agent cannot begin without a packet)",
);
assert.throws(
  () => e.startWork(TENANT, "00000000-0000-4000-8000-999999999999"),
  /cannot begin without a packet/,
  "startWork refuses a non-existent packet",
);

const accepted = e.acceptPacket(TENANT, packet.id);
assert.equal(accepted.status, "accepted", "packet accepted");
const started = e.startWork(TENANT, packet.id);
assert.equal(started.status, "in_progress", "startWork succeeds with an accepted packet");

// 4. Submit a report → packet becomes 'reported'.
const report = e.submitReport(TENANT, {
  packet_id: packet.id,
  agent: "Outreach Agent",
  task_completed: true,
  output_produced: "10 personalized outreach drafts",
  sources_used: ["crm://segments/qualified"],
  assumptions: ["prospect data is current as of today"],
  issues: [],
  confidence: 0.82,
  risks: ["one prospect asked about pricing"],
  approval_needed: true,
  recommended_next_step: "Route to CRO for approval before any send.",
  execution_status: "done",
  verification_status: "self_checked",
});
assert.ok(report.id, "report submitted");
assert.equal(e.getPacket(TENANT, packet.id)?.status, "reported", "packet status is reported");

// 5. Review the report — approve.
const reviewed = e.reviewReport(TENANT, report.id, "approve");
assert.equal(reviewed.status, "approved", "approved report marks packet approved");

// 6. Raise an escalation — routes one step up the chain.
const esc = e.raiseEscalation(TENANT, {
  from_layer: "ai_employee",
  reason: "revenue_pricing_contract",
  detail: "A prospect requested a custom price; needs leader sign-off.",
  packet_id: packet.id,
});
assert.equal(esc.from_layer, "ai_employee", "escalation from ai_employee");
assert.equal(esc.to_layer, "department_leader", "escalation routes up to the department leader");
assert.equal(e.getPacket(TENANT, packet.id)?.status, "escalated", "referenced packet marked escalated");

// 7. Record accountability.
const acct = e.recordAccountability(TENANT, {
  requesting_leader: "Chief Revenue Officer",
  responsible_employee: "Outreach Agent",
  executing_agent: "Outreach Agent",
  approving_authority: "Chief Revenue Officer",
  business: "Black Flag",
  task: "Prepare outreach sequence",
  status: "done",
  result: "10 drafts prepared and approved",
  kpi_impact: "outreach drafted +10",
  audit_log: ["issued", "accepted", "in_progress", "reported", "approved"],
});
assert.ok(acct.id, "accountability recorded");
assert.equal(e.listAccountability(TENANT).length, 1, "one accountability record");

// 8. Generate a department report.
const deptReport = e.generateDepartmentReport(TENANT, "revenue", "weekly");
assert.equal(deptReport.department_key, "revenue", "department report keyed to revenue");
assert.equal(deptReport.cadence, "weekly", "weekly cadence");
assert.ok(deptReport.completed_work.length >= 1, "report captures completed work");
assert.ok(deptReport.risks.length >= 1, "report captures the open escalation as a risk");

// 9. Chain of command passes for the seeded set.
const clean = e.validateChainOfCommand(TENANT);
assert.equal(clean.ok, true, "seeded set passes chain-of-command validation");
assert.equal(clean.violations.length, 0, "no chain-of-command violations for the seeded set");
assert.equal(clean.roles_checked, 78, "all 78 roles checked");

// 10. setPermissionScope updates a card.
const scoped = e.setPermissionScope(TENANT, "Outreach Agent", "execute_with_approval");
assert.equal(scoped.permission_scope, "execute_with_approval", "permission scope updated");

// 11. Inject violations and assert they are flagged. Use a fresh engine for a clean baseline.
const bad = new AiOrgEngine({ clock: () => NOW, idFactory: id });
bad.seedRoleCards(TENANT);

// (a) A specialist agent that acted (has an accountability record) without any delegation packet.
const ROGUE = "Rogue Specialist";
bad.addRoleCard(TENANT, {
  name: ROGUE,
  department_key: "engineering",
  org_layer: "specialist_agent",
  reports_to: "Debug Agent",
  mission: "Bespoke specialist that should never act without a packet.",
});
bad.recordAccountability(TENANT, {
  executing_agent: ROGUE,
  task: "Ran a task with no delegation packet",
  status: "done",
  result: "unauthorized output",
});

// (b) A bad card with no department_key and (c) a non-executive with no reports_to.
bad.addRoleCard(TENANT, {
  name: "Orphan Agent",
  department_key: " ", // whitespace-only → "no department"
  org_layer: "ai_employee",
  reports_to: null, // non-executive with no leader
});

const dirty = bad.validateChainOfCommand(TENANT);
assert.equal(dirty.ok, false, "chain-of-command validation fails once violations exist");
assert.ok(
  dirty.violations.some(
    (v) => v.kind === "specialist_acted_without_packet" && v.subject === ROGUE,
  ),
  "specialist acting without a packet is flagged",
);
assert.ok(
  dirty.violations.some(
    (v) => v.kind === "role_without_department" && v.subject === "Orphan Agent",
  ),
  "role without a department is flagged",
);
assert.ok(
  dirty.violations.some(
    (v) => v.kind === "non_executive_without_reports_to" && v.subject === "Orphan Agent",
  ),
  "non-executive with no reports_to is flagged",
);

console.log(
  "AI ORG SMOKE OK — 78 role cards, chain of command + delegation + escalation enforced",
);
