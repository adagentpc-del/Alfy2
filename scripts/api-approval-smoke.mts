/**
 * Runtime smoke for the API Approval Gate — the central, persisted gate the API enforces.
 * Proves the NON-NEGOTIABLE rule: externally-visible / irreversible actions are gated (move_money
 * requires approval, risk critical) while internal_action is not; a gated action persists a pending
 * request; the operator's decision flips it to approved with who/when; and tenants are isolated.
 * Deterministic (injected clock + idFactory). Run: `tsx scripts/api-approval-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ApprovalGateService, InMemoryApprovalRequestRepository } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const gate = new ApprovalGateService(new InMemoryApprovalRequestRepository(), {
  clock: () => NOW,
  idFactory: id,
});

// 1. classify(): move_money is gated + critical; internal_action is not gated + low.
const money = gate.classify("move_money");
assert.equal(money.requires_approval, true, "move_money requires approval");
assert.equal(money.risk, "critical", "move_money is critical risk");

const internal = gate.classify("internal_action");
assert.equal(internal.requires_approval, false, "internal_action does not require approval");
assert.equal(internal.risk, "low", "internal_action is low risk");

// 2. requireApproval persists a pending request with the classified gating/risk.
const req = await gate.requireApproval(TENANT, {
  action_class: "move_money",
  method: "POST",
  route: "/v1/payouts",
  summary: "Send a $2,000 vendor payout.",
  payload: { amount_usd: 2000, vendor: "A3 Visual" },
  requested_by: "agent:finance",
});
assert.equal(req.status, "pending", "new request is pending");
assert.equal(req.requires_approval, true, "request is gated");
assert.equal(req.risk, "critical", "request carries critical risk");
assert.equal(req.created_at, NOW.toISOString(), "created_at stamped from injected clock");
assert.equal(req.decided_by, null, "no decider yet");

// 3. list returns the pending request for the tenant.
const pending = await gate.list(TENANT, { statuses: ["pending"] });
assert.equal(pending.length, 1, "one pending request listed");
assert.equal(pending[0]?.id, req.id, "listed request matches the persisted one");

// 4. decide(approved) flips status + sets decided_by / decided_at.
await gate.decide(TENANT, req.id, { status: "approved", decided_by: "alyssa", reason: "ok to pay" });
const decided = await gate.get(TENANT, req.id);
assert.ok(decided, "decided request still retrievable");
assert.equal(decided.status, "approved", "status flipped to approved");
assert.equal(decided.decided_by, "alyssa", "decided_by recorded");
assert.equal(decided.decision_reason, "ok to pay", "decision_reason recorded");
assert.equal(decided.decided_at, NOW.toISOString(), "decided_at stamped from injected clock");

// 5. Tenant isolation — a second tenant sees nothing and cannot read the first tenant's request.
assert.equal((await gate.list(OTHER)).length, 0, "other tenant sees no requests");
assert.equal(await gate.get(OTHER, req.id), null, "other tenant cannot read the request by id");

console.log(
  "API APPROVAL SMOKE OK — move_money gated (critical), internal_action open, " +
    "pending persisted, approved by operator, tenant-isolated",
);
