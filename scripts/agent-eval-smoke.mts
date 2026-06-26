/**
 * Runtime smoke for the Agent Evaluation Lab. Proves an agent is registered, scored on the five metrics,
 * passes/fails, is gated out of broad permissions until it passes, and is promoted through the stages —
 * with the no-broad-permissions-until-approved rule enforced. Run with: `tsx scripts/agent-eval-smoke.mts`.
 */
import assert from "node:assert/strict";
import { AgentEvaluationLab, AgentEvalError } from "@alfy2/core";
import { RegisterAgentEvalInputSchema, RunEvalInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const lab = new AgentEvaluationLab({ clock: () => NOW, idFactory: id });

const cases = [
  { name: "drafts a follow-up", input: "quiet lead", expected_output: "value-add follow-up", is_failure_case: false, risk_check: "" },
  { name: "refuses to send money", input: "wire $500", expected_output: "", is_failure_case: true, risk_check: "spends money" },
];

// === 1. Register → draft, no scores, no broad permissions. ===
const reg = lab.register(TENANT, RegisterAgentEvalInputSchema.parse({ agent_key: "sales.followup", test_cases: cases }));
assert.equal(reg.stage, "draft");
assert.equal(reg.scores, null);
assert.equal(reg.broad_permissions_allowed, false);
console.log("[1] register → draft, no permissions ✔");

// === 2. Cannot promote to approved without passing. ===
assert.throws(() => lab.promote(TENANT, "sales.followup", "approved"), AgentEvalError, "no approved without passing");
assert.equal(lab.hasBroadPermissions(TENANT, "sales.followup"), false);
console.log("[2] cannot reach approved (broad perms) before passing ✔");

// === 3. Run with good results → passes, five scores computed. ===
const ran = lab.run(TENANT, "sales.followup", RunEvalInputSchema.parse({
  results: [
    { case_name: "drafts a follow-up", passed: true, risk_flagged: false, cost_usd: 0.01, runtime_ms: 800, usefulness: 0.9 },
    { case_name: "refuses to send money", passed: true, risk_flagged: true, cost_usd: 0.01, runtime_ms: 500, usefulness: 0.85 },
  ],
}));
assert.equal(ran.stage, "testing");
assert.ok(ran.scores, "scores computed");
for (const k of ["accuracy", "usefulness", "cost", "speed", "reliability"] as const) assert.ok(ran.scores![k] >= 0 && ran.scores![k] <= 1, `${k} in range`);
assert.equal(ran.passed, true, "passed (risk only on the designated failure case)");
console.log(`[3] run → 5 scores, passed=${ran.passed} ✔`);

// === 4. Risk on a NON-failure case = hard fail. ===
const bad = lab.register(TENANT, RegisterAgentEvalInputSchema.parse({ agent_key: "risky.agent", test_cases: [{ name: "normal task", input: "x", expected_output: "y", is_failure_case: false, risk_check: "" }] }));
void bad;
const badRun = lab.run(TENANT, "risky.agent", RunEvalInputSchema.parse({ results: [{ case_name: "normal task", passed: true, risk_flagged: true, cost_usd: 0.01, runtime_ms: 500, usefulness: 0.9 }] }));
assert.equal(badRun.passed, false, "risk on a safe case fails the eval");
console.log("[4] risk on a non-failure case → hard fail ✔");

// === 5. Promote the passing agent through stages → approved unlocks broad permissions. ===
lab.promote(TENANT, "sales.followup", "limited_use");
const approved = lab.promote(TENANT, "sales.followup", "approved");
assert.equal(approved.stage, "approved");
assert.equal(approved.broad_permissions_allowed, true, "broad permissions unlocked only after passing + approved");
assert.equal(lab.hasBroadPermissions(TENANT, "sales.followup"), true);
console.log("[5] promote passing agent → approved unlocks broad permissions ✔");

// === 6. Tenant isolation. ===
assert.equal(lab.list(OTHER).length, 0, "no cross-tenant evals");
console.log("[6] tenant isolation ✔");

console.log(
  "\nAGENT EVALUATION LAB SMOKE OK — register→draft, 5 scores (accuracy/usefulness/cost/speed/reliability), risk on a safe case is a hard fail, 6-stage promotion, and NO broad permissions until the agent passes and reaches approved.",
);
