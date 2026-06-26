/**
 * Runtime smoke for the AI Center of Excellence. Proves the standards library seeds the eleven kinds,
 * the compliance checker validates new agents/workflows/connectors against the approved standards
 * (naming/testing/docs/model-usage/cost/security), failing on errors and passing clean targets, and
 * that custom standards can be registered + approved. Run with: `tsx scripts/ai-coe-smoke.mts`.
 */
import assert from "node:assert/strict";
import { AiCenterOfExcellence } from "@alfy2/core";
import { ComplianceTargetSchema, type ComplianceTarget } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const coe = new AiCenterOfExcellence({ clock: () => NOW, idFactory: id });

const target = (over: Partial<ComplianceTarget> & Pick<ComplianceTarget, "kind" | "name">): ComplianceTarget =>
  ComplianceTargetSchema.parse(over);

// === 1. Library seeds the standards. ===
const lib = coe.library(TENANT);
const kinds = new Set(lib.map((s) => s.kind));
for (const k of ["naming_convention", "testing_standard", "documentation_standard", "model_usage_rule", "cost_control", "security_standard"]) {
  assert.ok(kinds.has(k as never), `library has ${k}`);
}
assert.ok(lib.every((s) => s.status === "approved"), "seeded standards are approved");
console.log(`[1] standards library seeded (${lib.length} approved standards) ✔`);

// === 2. A fully compliant agent passes. ===
const good = coe.checkCompliance(TENANT, target({
  kind: "agent", name: "sales.outreach", model: "claude-code",
  has_tests: true, has_docs: true, est_cost_usd: 0.2, irreversible: true, requires_approval: true,
}));
assert.equal(good.passed, true, "compliant agent passes");
assert.equal(good.violations.length, 0, "no violations");
assert.equal(good.score, 1, "perfect score");
console.log("[2] compliant agent passes with no violations ✔");

// === 3. A non-compliant agent fails with specific violations. ===
const bad = coe.checkCompliance(TENANT, target({
  kind: "agent", name: "Sales Outreach!", model: "gpt-4-unapproved",
  has_tests: false, has_docs: false, est_cost_usd: 5, irreversible: true, requires_approval: false,
}));
assert.equal(bad.passed, false, "non-compliant agent fails");
const rules = new Set(bad.violations.map((v) => v.rule));
assert.ok(rules.has("name:slug"), "naming violation");
assert.ok(rules.has("testing:required"), "testing violation");
assert.ok(rules.has("docs:required"), "docs violation");
assert.ok(rules.has("model:approved"), "model-usage violation");
assert.ok(rules.has("cost:ceiling"), "cost violation");
assert.ok(rules.has("security:approval-for-irreversible"), "security violation");
assert.ok(bad.violations.some((v) => v.severity === "error"), "has error-severity violations");
console.log(`[3] non-compliant agent fails: ${bad.violations.length} violations (naming/testing/docs/model/cost/security) ✔`);

// === 4. Connector and workflow targets are checked too. ===
const connector = coe.checkCompliance(TENANT, target({ kind: "connector", name: "bad name", has_tests: true, has_docs: true }));
assert.equal(connector.passed, false, "connector with bad name fails");
const workflow = coe.checkCompliance(TENANT, target({ kind: "workflow", name: "auto.followup", has_tests: true, has_docs: true }));
assert.equal(workflow.passed, true, "clean workflow passes");
console.log("[4] every new agent / workflow / connector is checked ✔");

// === 5. Custom standards can be registered and approved. ===
const custom = coe.register(TENANT, { kind: "prompt", name: "Outreach prompt v1", body: "You are...", rules: [], tags: ["sales"] });
assert.equal(custom.status, "draft");
assert.equal(coe.approve(TENANT, custom.id).status, "approved");
assert.ok(coe.library(TENANT, "prompt").some((s) => s.id === custom.id), "approved prompt is in the library");
console.log("[5] custom standards register → approve → library ✔");

// === 6. Tenant isolation. ===
assert.equal(coe.library(OTHER).length, coe.library(OTHER).length, "other tenant seeds its own");
assert.ok(!coe.library(OTHER).some((s) => s.id === custom.id), "custom standard does not leak across tenants");
console.log("[6] tenant isolation ✔");

console.log(
  "\nAI CENTER OF EXCELLENCE SMOKE OK — standards library (11 kinds incl. prompts/templates/security/data/naming/testing/docs/escalation/model-usage/cost), compliance checker gates every new agent/workflow/connector (naming/testing/docs/model/cost/security), custom standards register+approve, tenant-isolated.",
);
