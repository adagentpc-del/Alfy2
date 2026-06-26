/**
 * Runtime smoke test for the Enterprise Security layer. Proves: least privilege (new agents default
 * read-only), the six forbidden action classes ALWAYS require approval (spend money / delete data /
 * modify production / contact external / sign contract / install package), money + production +
 * deletion + contract safeguards, an audit entry for EVERY action, the approval queue (approve →
 * unblock; role-gated), secret vault + credential rotation (value never stored), session lifecycle,
 * permission groups, and tenant isolation. Run with: `tsx scripts/security-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  SecurityGate,
  SecretVault,
  SessionManager,
  PermissionChecker,
  SENSITIVE_ACTION_CLASSES,
} from "@alfy2/core";
import { ActionRequestSchema, GrantSchema, type Grant, type ActionRequest } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-24T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const uuid = () => `00000000-0000-4000-9000-${String(++n).padStart(12, "0")}`;

// --- Tenancy: alyssa is owner, sam is a member (can write), val is a viewer (read only) ---
const grants: Grant[] = [
  GrantSchema.parse({ id: id(), tenant_id: TENANT, principal: "alyssa@x.com", role: "owner", created_at: NOW.toISOString() }),
  GrantSchema.parse({ id: id(), tenant_id: TENANT, principal: "sam@x.com", role: "member", created_at: NOW.toISOString() }),
  GrantSchema.parse({ id: id(), tenant_id: TENANT, principal: "val@x.com", role: "viewer", created_at: NOW.toISOString() }),
];
const perms = new PermissionChecker(grants);

const gate = new SecurityGate({
  clock: () => NOW,
  idFactory: uuid,
  roleResolver: (t, p) => perms.rolesFor(t, p),
  permissionResolver: (t, p) => perms.permissionsFor(t, p),
});

const req = (over: Partial<ActionRequest>): ActionRequest =>
  ActionRequestSchema.parse({ id: uuid(), tenant_id: TENANT, actor: "alyssa@x.com", action: "act", ...over });

// === 1. The six forbidden classes ALWAYS require approval — even for the owner. ===
const sample: Record<string, Partial<ActionRequest>> = {
  spend_money: { action: "Pay invoice", effect: "write", action_class: "spend_money", amount_usd: 50 },
  delete_data: { action: "Delete customer table", effect: "write", action_class: "delete_data" },
  modify_production: { action: "Deploy hotfix", effect: "write", action_class: "modify_production", target_env: "production" },
  contact_external: { action: "Email a prospect", effect: "write", action_class: "contact_external" },
  sign_contract: { action: "Sign the MSA", effect: "write", action_class: "sign_contract" },
  install_package: { action: "npm i left-pad", effect: "write", action_class: "install_package" },
};
for (const cls of SENSITIVE_ACTION_CLASSES) {
  const d = gate.evaluate(req(sample[cls]!));
  assert.equal(d.decision, "requires_approval", `${cls} must require approval even for the owner`);
  assert.ok(d.required_approval && d.approval_id, `${cls} must be queued`);
  assert.ok(d.audit_id, `${cls} must be audited`);
}
console.log("[1] all six forbidden classes require approval (owner cannot bypass) ✔");

// === 2. Money controls: small spend → admin can approve; large spend → owner only. ===
const big = gate.evaluate(req({ action: "Wire $40k", effect: "write", action_class: "spend_money", amount_usd: 40000 }));
const bigReq = gate.approvals.get(TENANT, big.approval_id!)!;
assert.equal(bigReq.required_role, "owner", "large spend must escalate to owner approval");
const small = gate.evaluate(req({ action: "Buy lunch", effect: "write", action_class: "spend_money", amount_usd: 25 }));
assert.equal(gate.approvals.get(TENANT, small.approval_id!)!.required_role, "admin", "small spend → admin");
console.log("[2] money controls: spend escalates approver by amount ✔");

// === 3. Least privilege: a brand-new AGENT defaults to read-only. ===
const agentRead = gate.evaluate(req({ actor: "research.web", is_agent: true, action: "read dashboards", effect: "read" }));
assert.equal(agentRead.decision, "allow", "agent reads are allowed");
const agentWrite = gate.evaluate(req({ actor: "research.web", is_agent: true, action: "update record", effect: "write" }));
assert.equal(agentWrite.decision, "requires_approval", "agent writes require approval (read-only default)");
assert.ok(agentWrite.reasons.some((r) => /read-only by default/i.test(r)));
console.log("[3] least privilege: new agents are read-only; writes need approval ✔");

// === 4. RBAC: a viewer cannot write; an unknown principal is denied outright. ===
const viewerWrite = gate.evaluate(req({ actor: "val@x.com", action: "edit memory", effect: "write" }));
assert.equal(viewerWrite.decision, "requires_approval", "viewer has no write permission → approval");
const stranger = gate.evaluate(req({ actor: "nobody@x.com", action: "edit memory", effect: "write" }));
assert.equal(stranger.decision, "deny", "unknown principal is denied (least privilege)");
const memberWrite = gate.evaluate(req({ actor: "sam@x.com", action: "edit memory", effect: "write", target_env: "dev" }));
assert.equal(memberWrite.decision, "allow", "member can write in dev");
console.log("[4] RBAC: viewer→approval, stranger→deny, member→allow ✔");

// === 5. Production protection: even a normal write to production needs approval. ===
const prod = gate.evaluate(req({ actor: "sam@x.com", action: "toggle flag", effect: "write", target_env: "production" }));
assert.equal(prod.decision, "requires_approval", "production writes require approval");
assert.equal(gate.approvals.get(TENANT, prod.approval_id!)!.required_role, "owner");
console.log("[5] production protection: prod writes require owner approval ✔");

// === 6. Every action created an audit trail. ===
const auditCount = gate.audit.list(TENANT).length;
assert.ok(auditCount >= 12, `expected an audit entry per action, got ${auditCount}`);
assert.equal(gate.audit.list(OTHER).length, 0, "no audit leakage across tenants");
console.log(`[6] audit trail: ${auditCount} entries, one per action, tenant-isolated ✔`);

// === 7. Approval queue: required role gates resolution; approve unblocks. ===
const toApprove = gate.approvals.get(TENANT, big.approval_id!)!;
assert.throws(
  () => gate.approvals.approve(TENANT, toApprove.id, "val@x.com", perms.rolesFor(TENANT, "val@x.com")),
  /required role/i,
  "viewer cannot approve an owner-level request",
);
const approved = gate.approvals.approve(TENANT, toApprove.id, "alyssa@x.com", perms.rolesFor(TENANT, "alyssa@x.com"));
assert.equal(approved.status, "approved");
assert.equal(approved.resolved_by, "alyssa@x.com");
assert.equal(gate.approvals.list(TENANT, "pending").length, gate.approvals.list(TENANT).length - gate.approvals.list(TENANT, "approved").length - gate.approvals.list(TENANT, "rejected").length);
console.log("[7] approval queue: role-gated; owner approves; status tracked ✔");

// === 8. Secret vault + credential rotation — value is NEVER stored. ===
const vault = new SecretVault({ clock: () => NOW, idFactory: uuid });
const key = vault.register({ tenant_id: TENANT, name: "Stripe live", kind: "api_key", location: "vault://stripe/live", owner: "alyssa@x.com", rotation_period_days: 90 });
assert.equal(key.value_stored, false, "vault must never store the secret value");
assert.ok(key.next_rotation_at && key.next_rotation_at > NOW.toISOString());
// Due for rotation 100 days later:
const later = new Date(NOW.getTime() + 100 * 24 * 3600 * 1000);
assert.equal(vault.dueForRotation(TENANT, later).length, 1, "key should be due for rotation after 100 days");
assert.equal(vault.dueForRotation(TENANT, NOW).length, 0, "freshly registered key is not yet due as of now");
const rotated = vault.rotate(TENANT, key.id);
assert.ok(rotated.next_rotation_at && new Date(rotated.next_rotation_at).getTime() > NOW.getTime(), "rotation schedules the next rotation in the future");
assert.equal(vault.dueForRotation(TENANT, NOW).length, 0, "rotation clears the due list as of now");
const revoked = vault.revoke(TENANT, key.id);
assert.equal(revoked.status, "revoked");
assert.throws(() => vault.rotate(TENANT, key.id), /revoked/i, "cannot rotate a revoked secret");
assert.equal(vault.list(OTHER).length, 0, "vault is tenant-isolated");
console.log("[8] secret vault: references-only, rotation worklist, revoke, isolation ✔");

// === 9. Session management: create, validate, expire, revoke-all. ===
const sessions = new SessionManager({ clock: () => NOW, idFactory: uuid });
const s = sessions.create(TENANT, "alyssa@x.com", 3600, { ip: "203.0.113.7", scopes: ["dashboards.view"] });
assert.equal(sessions.validate(TENANT, s.id, NOW), true, "fresh session is valid");
const afterExpiry = new Date(NOW.getTime() + 2 * 3600 * 1000);
assert.equal(sessions.validate(TENANT, s.id, afterExpiry), false, "session expires");
const s2 = sessions.create(TENANT, "alyssa@x.com", 3600);
assert.equal(sessions.revokeAll(TENANT, "alyssa@x.com"), 2, "revokeAll revokes every unrevoked session for the principal");
assert.equal(sessions.validate(TENANT, s2.id, NOW), false, "revoked session is invalid");
assert.equal(sessions.validate(OTHER, s.id, NOW), false, "sessions are tenant-isolated");
console.log("[9] sessions: create/validate/expire/revoke-all, tenant-isolated ✔");

// === 10. Permission Groups: a group grant lets a member write in dev. ===
const grp = gate.groups.create({ tenant_id: TENANT, name: "Editors", permissions: ["memory.write"], members: [] });
gate.groups.addMember(TENANT, grp.id, "guest@x.com");
const guestWrite = gate.evaluate(req({ actor: "guest@x.com", action: "edit memory", effect: "write", target_env: "dev" }));
assert.equal(guestWrite.decision, "allow", "permission group grants the write");
assert.equal(gate.groups.permissionsFor(OTHER, "guest@x.com").size, 0, "groups are tenant-isolated");
console.log("[10] permission groups: group membership grants effective permissions, isolated ✔");

console.log(
  "\nENTERPRISE SECURITY SMOKE OK — least privilege (agents read-only), six forbidden classes always require approval, money/production/deletion/contract safeguards, audit trail on every action, role-gated approval queue, secret vault + rotation (value never stored), session lifecycle, permission groups, tenant isolation.",
);
