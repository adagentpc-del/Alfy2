/**
 * Runtime smoke for the Control / Execution Plane registry. Proves the catalog classifies engines into
 * the two planes and that the guard blocks any execution-plane action that tries to bypass the Control
 * Plane (missing identity, policy, permissions, or a required approval). Run with: `tsx scripts/planes-smoke.mts`.
 */
import assert from "node:assert/strict";
import { PlaneRegistry, PLANE_CATALOG } from "@alfy2/core";
import { ExecutionRequestSchema } from "@alfy2/shared";

const reg = new PlaneRegistry();

// === 1. Catalog classifies both planes. ===
assert.ok(PLANE_CATALOG.length >= 18, "catalog populated");
assert.equal(reg.planeOf("Security Gate"), "control");
assert.equal(reg.planeOf("Agent Evaluation Lab"), "control");
assert.equal(reg.planeOf("Campaign Intelligence"), "execution");
assert.equal(reg.planeOf("agent-factory"), "execution", "lookup by engine module too");
assert.ok(reg.byPlane("control").length >= 10 && reg.byPlane("execution").length >= 8, "both planes populated");
console.log("[1] catalog classifies control vs execution planes ✔");

// === 2. A fully-gated execution action is allowed. ===
const ok = reg.guard(ExecutionRequestSchema.parse({ capability: "send campaign", concern: "campaigns", identity_verified: true, policy_checked: true, permitted: true, approved: true }));
assert.equal(ok.allowed, true);
assert.equal(ok.bypass_attempt, false);
console.log("[2] fully-gated execution action allowed ✔");

// === 3. Missing a Control Plane gate = bypass attempt, denied. ===
const bypass = reg.guard(ExecutionRequestSchema.parse({ capability: "send campaign", concern: "campaigns", identity_verified: false, policy_checked: true, permitted: true, approved: false }));
assert.equal(bypass.allowed, false);
assert.equal(bypass.bypass_attempt, true);
assert.deepEqual(bypass.missing_gates, ["identity", "approval"], "names the missing gates");
assert.ok(bypass.reason.includes("bypass the Control Plane"));
console.log(`[3] bypass attempt denied (missing: ${bypass.missing_gates.join(", ")}) ✔`);

// === 4. Approval not required (null) doesn't block. ===
const noApproval = reg.guard(ExecutionRequestSchema.parse({ capability: "generate content", concern: "content_generation", identity_verified: true, policy_checked: true, permitted: true, approved: null }));
assert.equal(noApproval.allowed, true, "approval=null means not required");
console.log("[4] approval-not-required (null) passes ✔");

// === 5. No permission → denied. ===
const noPerm = reg.guard(ExecutionRequestSchema.parse({ capability: "delete repo", concern: "repo_actions", identity_verified: true, policy_checked: true, permitted: false, approved: true }));
assert.equal(noPerm.allowed, false);
assert.ok(noPerm.missing_gates.includes("permissions"));
console.log("[5] missing permission → denied ✔");

console.log(
  "\nCONTROL/EXECUTION PLANE SMOKE OK — catalog tags every engine control vs execution; the guard allows execution only when identity + policy + permissions (and any required approval) clear the Control Plane, and flags everything else as a bypass attempt. No agent may bypass the Control Plane.",
);
