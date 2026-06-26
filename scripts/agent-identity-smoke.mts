/**
 * Runtime smoke for Agent Identity & Zero Trust. Proves every agent gets a unique, scoped, revocable
 * identity that starts deny-by-default / read-only (no money, no external messages, no production, no
 * deletion, no tools), that grants open specific capabilities within limits, that access is evaluated
 * per request (zero trust), and that revocation kills everything. Run with:
 * `tsx scripts/agent-identity-smoke.mts`.
 */
import assert from "node:assert/strict";
import { AgentIdentityRegistry } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const reg = new AgentIdentityRegistry({ clock: () => NOW, idFactory: id });

// === 1. New identity is deny-by-default / read-only. ===
const a = reg.issue(TENANT, { agent_key: "sales.outreach", display_name: "Sales Outreach", scope: ["biz:move-mi"] });
assert.equal(a.capabilities.can_write, false, "no write by default");
assert.equal(a.capabilities.can_spend, false, "no money by default");
assert.equal(a.capabilities.can_external_comm, false, "no external comms by default");
assert.equal(a.capabilities.can_modify_production, false, "no production by default");
assert.equal(a.capabilities.can_delete, false, "no deletion by default");
assert.equal(a.spending_limit_usd, 0, "zero spend limit");
assert.equal(a.external_comm_daily_limit, 0, "zero external limit");
assert.equal(a.requires_approval_for.length, 6, "all six sensitive classes require approval");
console.log("[1] new identity is deny-by-default / read-only (no money/external/prod/delete) ✔");

// === 2. Reads allowed; every restricted action denied by default. ===
assert.equal(reg.evaluate(TENANT, { agent_key: "sales.outreach", action: "read" }).decision, "allow", "read allowed");
for (const action of ["write", "spend", "external_comm", "modify_production", "delete"] as const) {
  const d = reg.evaluate(TENANT, { agent_key: "sales.outreach", action });
  assert.equal(d.decision, "deny", `${action} denied by default`);
}
console.log("[2] zero trust: reads allowed, all restricted actions denied by default ✔");

// === 3. Grants open specific capabilities within limits. ===
reg.grant(TENANT, "sales.outreach", {
  capabilities: { can_write: true, can_external_comm: true },
  tool_access: ["gmail.draft"],
  data_boundaries: ["biz:move-mi:crm"],
  external_comm_daily_limit: 50,
});
assert.equal(reg.evaluate(TENANT, { agent_key: "sales.outreach", action: "write", data_namespace: "biz:move-mi:crm" }).decision, "allow", "granted write within boundary");
assert.equal(reg.evaluate(TENANT, { agent_key: "sales.outreach", action: "external_comm" }).decision, "allow", "external comms now allowed");
assert.equal(reg.evaluate(TENANT, { agent_key: "sales.outreach", action: "use_tool", tool: "gmail.draft" }).decision, "allow", "granted tool allowed");
assert.equal(reg.evaluate(TENANT, { agent_key: "sales.outreach", action: "use_tool", tool: "stripe.charge" }).decision, "deny", "ungranted tool denied");
assert.equal(reg.evaluate(TENANT, { agent_key: "sales.outreach", action: "write", data_namespace: "biz:other:crm" }).decision, "deny", "write outside data boundary denied");
console.log("[3] grants open specific capabilities, tools, and data boundaries ✔");

// === 4. Spending limit + approval requirement enforced. ===
reg.grant(TENANT, "sales.outreach", { capabilities: { can_spend: true }, spending_limit_usd: 100 });
const underCap = reg.evaluate(TENANT, { agent_key: "sales.outreach", action: "spend", amount_usd: 50, action_class: "spend_money" });
assert.equal(underCap.decision, "needs_approval", "spend within cap but sensitive → needs approval");
const overCap = reg.evaluate(TENANT, { agent_key: "sales.outreach", action: "spend", amount_usd: 500, action_class: "spend_money" });
assert.equal(overCap.decision, "deny", "spend over cap denied");
console.log("[4] spend limit + approval requirement enforced (within cap → needs_approval, over → deny) ✔");

// === 5. Suspend and revoke. ===
reg.suspend(TENANT, "sales.outreach");
assert.equal(reg.evaluate(TENANT, { agent_key: "sales.outreach", action: "read" }).decision, "deny", "suspended denies reads");
reg.grant(TENANT, "sales.outreach", {}); // no-op grant keeps it; re-activate via... use a fresh identity instead
const b = reg.issue(TENANT, { agent_key: "ops.sync", display_name: "Ops Sync" });
reg.revoke(TENANT, "ops.sync");
assert.equal(reg.evaluate(TENANT, { agent_key: "ops.sync", action: "read" }).decision, "deny", "revoked denies everything");
assert.throws(() => reg.revoke(TENANT, "ops.sync"), /revoked/i, "cannot transition a revoked identity");
console.log("[5] suspend + revoke kill access ✔");

// === 6. Unique keys + tenant isolation. ===
assert.throws(() => reg.issue(TENANT, { agent_key: "sales.outreach", display_name: "dup" }), /already exists/i, "agent keys are unique per tenant");
assert.equal(reg.get(OTHER, "sales.outreach"), undefined, "no cross-tenant identity");
assert.equal(reg.evaluate(OTHER, { agent_key: "sales.outreach", action: "read" }).decision, "deny", "no cross-tenant access");
console.log("[6] unique identities + tenant isolation ✔");

console.log(
  "\nAGENT IDENTITY & ZERO TRUST SMOKE OK — unique scoped revocable identities, deny-by-default/read-only (no money/external/prod/delete), per-request zero-trust evaluation, grants open capabilities/tools/data-boundaries within limits, spend caps + approval requirements, suspend/revoke, tenant-isolated.",
);
