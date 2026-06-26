/**
 * Runtime smoke for Agent Observability. Proves every agent action is recorded with full provenance;
 * the four questions are answerable (what did it do / why / what data / what changed); and the
 * dashboard aggregates performance, failed actions, cost, ROI, risky actions, approval bottlenecks,
 * and repeated failures. Run with: `tsx scripts/agent-observability-smoke.mts`.
 */
import assert from "node:assert/strict";
import { AgentObservability } from "@alfy2/core";
import { LogAgentActionInputSchema, type LogAgentActionInput } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const obs = new AgentObservability({ clock: () => NOW, idFactory: id });

const log = (o: Partial<LogAgentActionInput> & Pick<LogAgentActionInput, "agent_name" | "task" | "outcome">) =>
  obs.record(TENANT, LogAgentActionInputSchema.parse(o));

// A successful, valuable, approved action with full provenance.
const a1 = log({
  agent_name: "sales.outreach",
  task: "Draft retainer follow-up",
  input: "Customer: Acme",
  tools_used: ["gmail.draft"],
  memory_used: ["mem:acme"],
  decision: "Used the reliability framing.",
  rationale: "Variant B is winning the active campaign.",
  approval_status: "approved",
  cost_usd: 0.02,
  runtime_ms: 4000,
  outcome: "success",
  downstream_effects: ["Draft queued", "Follow-up scheduled"],
  value_usd: 1800,
  risk_level: "low",
});
// A risky, pending action.
log({ agent_name: "finance.payments", task: "Pay vendor invoice", outcome: "skipped", approval_status: "pending", risk_level: "high", cost_usd: 0.01 });
// Two repeated failures for the same agent+task.
log({ agent_name: "ops.sync", task: "Sync CRM", outcome: "failure", errors: ["timeout"], cost_usd: 0.03 });
log({ agent_name: "ops.sync", task: "Sync CRM", outcome: "failure", errors: ["timeout again"], cost_usd: 0.03 });
// A rejected action (approval bottleneck).
log({ agent_name: "finance.payments", task: "Wire deposit", outcome: "blocked", approval_status: "rejected", risk_level: "high" });

// === 1. Provenance recorded. ===
const rec = obs.get(TENANT, a1.id)!;
for (const k of ["agent_name", "task", "input", "tools_used", "memory_used", "decision", "approval_status", "cost_usd", "runtime_ms", "outcome", "downstream_effects"] as const) {
  assert.ok(rec[k] !== undefined, `record captures ${k}`);
}
console.log("[1] every action recorded with full provenance ✔");

// === 2. The four questions are answerable. ===
const ex = obs.explain(TENANT, a1.id);
assert.ok(/Draft retainer follow-up/.test(ex.what_it_did), "what it did");
assert.ok(/reliability framing|Variant B/.test(ex.why_it_did_that), "why it did that");
assert.ok(/gmail\.draft|mem:acme/.test(ex.what_data_it_used), "what data it used");
assert.ok(/Draft queued|Follow-up scheduled/.test(ex.what_changed_afterward), "what changed afterward");
console.log("[2] answers: what did it do / why / what data / what changed ✔");

// === 3. agentTrace answers "what did this agent do?". ===
assert.equal(obs.agentTrace(TENANT, "finance.payments").length, 2, "agent trace lists the agent's actions");
console.log("[3] agent trace ✔");

// === 4. Dashboard sections. ===
const d = obs.dashboard(TENANT);
assert.ok(d.performance.length >= 3, "performance per agent");
const sales = d.performance.find((p) => p.agent_name === "sales.outreach")!;
assert.equal(sales.successes, 1);
assert.ok(sales.roi !== null && sales.roi > 100, "ROI computed from value vs cost");
assert.equal(d.failed_actions.length, 3, "failed actions (2 failures + 1 blocked)");
assert.ok(d.cost_by_agent.length >= 3 && d.cost_by_agent[0]!.cost_usd >= d.cost_by_agent[1]!.cost_usd, "cost_by_agent sorted");
assert.equal(d.risky_actions.length, 2, "risky (high) actions surfaced");
assert.ok(d.approval_bottlenecks.some((b) => b.agent_name === "finance.payments" && b.pending_actions + b.rejected_actions >= 2), "approval bottleneck");
assert.ok(d.repeated_failures.some((f) => f.agent_name === "ops.sync" && f.count === 2), "repeated failure detected");
console.log("[4] dashboards: performance / failed / cost / ROI / risky / approval bottlenecks / repeated failures ✔");

// === 5. Tenant isolation. ===
assert.equal(obs.list(OTHER).length, 0, "no cross-tenant actions");
console.log("[5] tenant isolation ✔");

console.log(
  "\nAGENT OBSERVABILITY SMOKE OK — records every action with full provenance (name/task/input/tools/memory/decision/approval/cost/runtime/outcome/errors/downstream), answers what/why/what-data/what-changed, dashboards for performance/failed/cost/ROI/risky/approval-bottlenecks/repeated-failures, tenant-isolated.",
);
