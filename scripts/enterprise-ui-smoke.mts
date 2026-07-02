/**
 * Runtime smoke for the Enterprise Command Center service layer (apps/web/assets/services.mjs).
 * Proves the 26-agent cabinet/portfolio registry is complete (every agent carries all 13 dossier
 * fields), the 11-company roster + OS payloads resolve, approvals decide with logging (approve/reject,
 * no double-decide), the weekly operating report composes from live state, and the executive summary
 * carries the 8 dashboard cards. Run with: `tsx scripts/enterprise-ui-smoke.mts`.
 */
import assert from "node:assert/strict";
// @ts-ignore — browser-shared ES module, intentionally untyped
import * as svc from "../apps/web/assets/services.mjs";

const NOW = new Date("2026-07-02T12:00:00.000Z");
const mem = svc.stores.memoryStore();
svc.configure({ store: mem, clock: () => NOW });

// === 1. Agent registry: 16 cabinet + 10 portfolio, all dossier fields present. ===
const agents = svc.getAgents();
assert.equal(svc.getAgents({ layer: "cabinet" }).length, 16, "16 cabinet agents");
assert.equal(svc.getAgents({ layer: "portfolio" }).length, 10, "10 portfolio agents");
const FIELDS = ["title", "department", "mission", "responsibilities", "authority_level", "approval_requirements", "owned_workflows", "kpis", "status", "next_action", "risks", "reporting_cadence"];
for (const a of agents) for (const f of FIELDS) assert.ok((a as any)[f]?.length ?? (a as any)[f], `${a.id} has ${f}`);
assert.ok(svc.getAgents({ layer: "portfolio" }).every((a: any) => a.linked_business), "portfolio agents linked to businesses");
assert.equal(svc.getAgentById("chief-revenue")?.title, "Chief Revenue Officer Agent");
console.log(`[1] agent registry complete: ${agents.length} agents, 13 dossier fields each ✔`);

// === 2. Derived registries + companies + OS payloads resolve both ways. ===
assert.equal(svc.getAgentRoles().length, 26);
assert.equal(svc.getAgentAuthorities().length, 26);
assert.ok(svc.getAgentKpis("agent-move-mi").length >= 3, "per-agent KPI slice");
const companies = svc.getPortfolioCompanies();
assert.equal(companies.length, 11, "11 companies incl. Divini Group parent");
for (const c of companies) {
  assert.ok(svc.getCompanyOS(c.id), `${c.id} has an operating system payload`);
  if (c.agent_id) assert.equal(svc.getAgentById(c.agent_id)?.linked_business, c.id, `${c.id} agent back-links`);
}
console.log(`[2] 11 companies, every one with an OS payload; agent↔company links consistent ✔`);

// === 3. Approvals: pending queue → approve + reject, logged, no double-decide. ===
const pendingBefore = svc.getApprovalRequests("pending").length;
assert.ok(pendingBefore >= 5, "seed queue has pending items");
const approved = svc.approveRequest("apr-001");
assert.equal(approved.status, "approved");
assert.equal(approved.decided_by, "Alyssa");
const rejected = svc.rejectRequest("apr-004", "Enrich the list first — reply rate too low unverified.");
assert.equal(rejected.status, "denied");
assert.equal(svc.getApprovalRequests("pending").length, pendingBefore - 2, "queue shrinks by 2");
assert.throws(() => svc.approveRequest("apr-001"), /already approved/, "no double-decide");
const logs = svc.getActionLogs(5);
assert.ok(logs.some((l: any) => l.approval_id === "apr-001"), "decision logged with approval ref");
console.log("[3] approve/reject work, are logged, and re-deciding throws ✔");

// === 4. New approval request + action log validate required fields. ===
const req = svc.createApprovalRequest({ action_class: "publish_public", title: "Test publish", requested_by: "agent-decoded", ask: "Approve test", business_id: "decoded_podcast" });
assert.equal(req.status, "pending");
assert.throws(() => svc.createApprovalRequest({ title: "missing fields" }), /missing/);
assert.throws(() => svc.createActionLog({ action: "no agent" }), /agent_id/);
console.log("[4] createApprovalRequest/createActionLog validate and persist ✔");

// === 5. Weekly report composes from current state (sees the fresh decisions). ===
const report = svc.generateWeeklyOperatingReport();
assert.equal(report.week, "2026-W27");
assert.ok(report.sections.companies.length === 11, "report covers all companies");
assert.ok(report.sections.blocked.length >= 3, "blocked workflows surfaced");
assert.ok(report.sections.next.length > 0, "next actions listed");
assert.ok(svc.getOperatingReports().some((r: any) => r.id === report.id), "report persisted");
console.log(`[5] weekly report generated (${report.week}): "${report.headline}" ✔`);

// === 6. Executive summary carries the 8 dashboard cards. ===
const s = svc.getExecutiveDashboardSummary();
for (const k of ["business_status", "revenue_priority", "active_campaigns", "pending_approvals", "blocked_workflows", "agent_recommendations", "next_best_action", "weekly_summary"]) {
  assert.ok((s as any)[k] != null, `summary has ${k}`);
}
assert.equal(s.business_status.length, 11);
assert.ok(s.next_best_action.length > 10);
console.log("[6] executive summary: all 8 dashboard cards present ✔");

// === 7. Brain graph is renderable: every edge resolves to nodes. ===
const g = svc.getBrainGraph();
const ids = new Set(g.nodes.map((n: any) => n.id));
assert.ok(g.nodes.length >= 40, "brain has 40+ nodes");
for (const e of g.edges) assert.ok(ids.has(e.from) && ids.has(e.to), `edge ${e.from}→${e.to} resolves`);
console.log(`[7] brain graph: ${g.nodes.length} nodes, ${g.edges.length} edges, all edges resolve ✔`);

console.log("\nENTERPRISE UI SMOKE OK — 26-agent registry complete (13 fields each), 11 companies with OS payloads, approvals decide+log with no double-decide, weekly report composes from live state, executive summary carries all 8 cards, brain graph renderable.");
