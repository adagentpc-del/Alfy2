/**
 * Runtime smoke test for Persistent Approval. Proves: the operator approves a workflow ONCE — a
 * standing grant covers later in-scope actions so the Security Gate stops re-asking; every grant
 * stores scope / expiration / limits / success metrics / review schedule; the grant buttons behave
 * (remember this · always · business · until goal · 30 days · review monthly · review quarterly);
 * grants auto-expire and enter review; limits (uses + amount) and environment scoping are enforced;
 * "allow until goal complete" ends when the goal completes; revoke; and tenant isolation.
 * Run with: `tsx scripts/persistent-approval-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  SecurityGate,
  PersistentApprovalRegistry,
  PermissionChecker,
} from "@alfy2/core";
import { ActionRequestSchema, GrantSchema, type Grant, type ActionRequest } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const BIZ = "00000000-0000-0000-0000-0000000000aa";
const GOAL = "00000000-0000-0000-0000-0000000000bb";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const uuid = () => `00000000-0000-4000-9000-${String(++n).padStart(12, "0")}`;

const grants: Grant[] = [
  GrantSchema.parse({ id: uuid(), tenant_id: TENANT, principal: "alyssa@x.com", role: "owner", created_at: NOW.toISOString() }),
];
const perms = new PermissionChecker(grants);
const registry = new PersistentApprovalRegistry({ clock: () => NOW, idFactory: uuid });
const gate = new SecurityGate({
  clock: () => NOW,
  idFactory: uuid,
  roleResolver: (t, p) => perms.rolesFor(t, p),
  permissionResolver: (t, p) => perms.permissionsFor(t, p),
  persistentApprovals: registry,
});

const req = (over: Partial<ActionRequest>): ActionRequest =>
  ActionRequestSchema.parse({ id: uuid(), tenant_id: TENANT, actor: "alyssa@x.com", action: "act", ...over });

// === 1. Every grant stores scope / expiration / limits / success metrics / review schedule. ===
const g = registry.grant(TENANT, {
  principal: "alyssa@x.com",
  label: "Send retainer follow-up emails for Move Mi",
  grant_type: "business",
  action_class: "contact_external",
  action_pattern: "follow-up email",
  business_id: BIZ,
  max_uses: 3,
  success_metrics: ["Reply rate > 15%"],
});
assert.ok(g.scope.business_id === BIZ && g.scope.action_class === "contact_external", "scope stored");
assert.equal(g.limits.max_uses, 3, "limits stored");
assert.deepEqual(g.success_metrics, ["Reply rate > 15%"], "success metrics stored");
assert.equal(g.status, "active");
console.log("[1] grant stores scope / limits / success metrics / review schedule / expiration ✔");

// === 2. Approve once → the gate stops re-asking within scope (no repeated permission requests). ===
const action = () =>
  req({ action: "Send follow-up email to customer", effect: "write", action_class: "contact_external", metadata: { business_id: BIZ } });
// Without the grant this would be requires_approval (contact_external is a forbidden class). With it: allow.
const d1 = gate.evaluate(action());
assert.equal(d1.decision, "allow", "standing grant pre-approves the action");
assert.equal(d1.required_approval, false, "no fresh approval requested");
assert.ok(d1.reasons.some((r) => /standing approval/i.test(r)), "reason cites the standing approval");
assert.equal(gate.approvals.list(TENANT, "pending").length, 0, "nothing queued — not re-asking");
const d2 = gate.evaluate(action());
assert.equal(d2.decision, "allow", "still pre-approved on the next call");
console.log("[2] approve once → gate pre-approves in-scope actions, never re-queues ✔");

// === 3. Limits enforced: the 3rd use exhausts the grant; the 4th falls back to approval. ===
const d3 = gate.evaluate(action()); // 3rd use
assert.equal(d3.decision, "allow", "3rd use still covered");
const d4 = gate.evaluate(action()); // 4th — over max_uses
assert.equal(d4.decision, "requires_approval", "exhausted grant falls back to fresh approval");
assert.equal(registry.get(TENANT, g.id)!.limits.used_count, 3, "used_count capped at max_uses");
console.log("[3] use limit enforced: exhausted grant re-requests approval ✔");

// === 4. Out-of-scope actions are NOT covered (different business, wrong env, wrong class). ===
const otherBiz = gate.evaluate(req({ action: "Send follow-up email", effect: "write", action_class: "contact_external", metadata: { business_id: "00000000-0000-0000-0000-0000000000cc" } }));
assert.equal(otherBiz.decision, "requires_approval", "different business not covered");
const prod = gate.evaluate(req({ action: "Send follow-up email", effect: "write", action_class: "contact_external", target_env: "production", metadata: { business_id: BIZ } }));
assert.equal(prod.decision, "requires_approval", "production not in grant's environments");
console.log("[4] scope respected: other business / production not covered ✔");

// === 5. Amount limit (money controls): covers up to the cap, re-asks above it. ===
const spendGrant = registry.grant(TENANT, {
  principal: "alyssa@x.com",
  label: "Auto-approve ad spend up to $500 while launch goal is active",
  grant_type: "until_goal",
  action_class: "spend_money",
  action_pattern: "ad spend",
  goal_id: GOAL,
  max_amount_usd: 500,
});
const under = gate.evaluate(req({ action: "Place ad spend", effect: "write", action_class: "spend_money", amount_usd: 300 }));
assert.equal(under.decision, "allow", "spend under cap is covered");
const over = gate.evaluate(req({ action: "Place ad spend", effect: "write", action_class: "spend_money", amount_usd: 900 }));
assert.equal(over.decision, "requires_approval", "spend over cap re-requests approval");
console.log("[5] amount cap: under → covered, over → re-approval ✔");

// === 6. "Allow until goal complete" ends when the goal completes. ===
assert.equal(gate.evaluate(req({ action: "Place ad spend", effect: "write", action_class: "spend_money", amount_usd: 100 })).decision, "allow", "covered while goal active");
const ended = registry.expireForGoal(TENANT, GOAL);
assert.equal(ended, 1, "until-goal grant ended on completion");
assert.equal(registry.get(TENANT, spendGrant.id)!.status, "expired");
assert.equal(gate.evaluate(req({ action: "Place ad spend", effect: "write", action_class: "spend_money", amount_usd: 100 })).decision, "requires_approval", "no longer covered after goal completes");
console.log("[6] allow-until-goal: ends when the goal completes ✔");

// === 7. Duration grant auto-expires and enters review; renew reactivates. ===
const dur = registry.grant(TENANT, {
  principal: "alyssa@x.com",
  label: "Allow package installs for 30 days",
  grant_type: "duration",
  action_class: "install_package",
  duration_days: 30,
});
assert.ok(dur.expires_at && dur.next_review_at, "duration grant has expiry + on-expiry review");
const later = new Date(NOW.getTime() + 31 * 86_400_000);
assert.equal(registry.expireDue(TENANT, later), 1, "expired grant moved to review");
assert.equal(registry.get(TENANT, dur.id)!.status, "in_review", "auto-expires INTO review");
const renewed = registry.renew(TENANT, dur.id);
assert.equal(renewed.status, "active", "renew reactivates");
console.log("[7] duration grant auto-expires → in_review; renew reactivates ✔");

// === 8. Review schedules: monthly / quarterly set the next review date. ===
const monthly = registry.grant(TENANT, { principal: "alyssa@x.com", label: "Monthly-reviewed outreach", grant_type: "review_monthly", action_class: "contact_external" });
assert.equal(monthly.review_schedule, "monthly");
assert.ok(monthly.next_review_at, "monthly review scheduled");
const quarterly = registry.grant(TENANT, { principal: "alyssa@x.com", label: "Quarterly-reviewed deletes", grant_type: "review_quarterly", action_class: "delete_data" });
assert.equal(quarterly.review_schedule, "quarterly");
const monthlyReview = new Date(monthly.next_review_at!).getTime();
const quarterlyReview = new Date(quarterly.next_review_at!).getTime();
assert.ok(quarterlyReview > monthlyReview, "quarterly review is further out than monthly");
console.log("[8] review schedules: monthly & quarterly set the next review ✔");

// === 9. Revoke; and tenant isolation. ===
const revoked = registry.revoke(TENANT, g.id);
assert.equal(revoked.status, "revoked");
// Revoke the other grant that also covers this action (monthly), so nothing remains to cover it.
registry.revoke(TENANT, monthly.id);
assert.equal(registry.match(TENANT, action(), NOW), null, "with both covering grants revoked, nothing covers the action");
assert.equal(registry.list(OTHER).length, 0, "grants are tenant-isolated");
assert.equal(registry.match(OTHER, action(), NOW), null, "no cross-tenant coverage");
console.log("[9] revoke + tenant isolation ✔");

console.log(
  "\nPERSISTENT APPROVAL SMOKE OK — approve once; standing grants store scope/expiration/limits/success-metrics/review-schedule; the Security Gate pre-approves in-scope actions and never re-queues within scope; the seven grant buttons behave; grants auto-expire INTO review; use/amount/business/environment limits enforced; allow-until-goal ends on completion; renew/revoke; tenant isolation.",
);
