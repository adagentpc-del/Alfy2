# Enterprise Security

The security layer is the capstone safety system for Alfy². It centralizes, at one chokepoint, the
guarantees the platform needs to act on a founder's behalf across many businesses: **least privilege
everywhere, new agents default to read-only, six classes of action can never happen without explicit
approval, and every action creates an audit trail.** It is deterministic — no AI is involved in a
security decision, and every decision is explainable.

Module: `packages/core/src/security/`. Contracts: `packages/shared/src/contracts/security.ts`
(mirrored in `workers/`). Migrations: `0018_enterprise_security.sql`, `0019_enterprise_security_rls.sql`.
ADR: `docs/adr/ADR-0015-enterprise-security.md`. Smoke: `pnpm security:smoke`.

## The Security Gate

`SecurityGate.evaluate(ActionRequest) → SecurityDecision` is the single point every proposed action
passes through. For each request it:

1. Resolves the actor's authority (roles + permission-group permissions; agents get no implicit roles).
2. Runs the deterministic policy.
3. **Writes an audit entry — always**, whatever the outcome.
4. Queues an approval when one is required, returning its id.

The decision is `allow`, `deny`, or `requires_approval`, with human-readable `reasons`. Engines are
expected to refuse to execute unless the gate returned `allow`.

## What can never happen without approval

These six **action classes** always resolve to `requires_approval` — even for the owner. They are
queued, never auto-executed:

| Class | Safeguard |
| --- | --- |
| `spend_money` | Money controls — large spend escalates to **owner** approval |
| `delete_data` | Deletion safeguard |
| `modify_production` | Production protection |
| `contact_external` | No unattended outreach to external users |
| `sign_contract` | Contract safeguard |
| `install_package` | No unattended dependency installation |

On top of these, **any** write to a protected environment (`production`) requires approval, regardless
of class.

## Least privilege

- **New agents default to read-only.** An agent may read, but any agent *write* requires explicit
  approval — there is no implicit write trust for automation.
- A **human** write needs an elevated role (owner/admin) or a write-bearing permission
  (`*.write` / `*.manage` / `approve.irreversible`); a viewer's write is queued for approval.
- A principal with **no grant at all** is denied outright.

## RBAC and Permission Groups

Roles (owner/admin/member/viewer) come from the tenancy `PermissionChecker`, injected into the gate as
resolvers — so the gate reuses existing tenancy logic rather than reimplementing it. **Permission
Groups** are named permission bundles assignable to principals, layered on top of role grants; a
principal's effective permissions are the union of role-derived and group permissions.

## Audit trail

Every evaluation appends one immutable `AuditEntry` (actor, action, class, resource, env, decision,
outcome). The backing `security_audit` table is append-only — it has INSERT + SELECT RLS policies and
no UPDATE/DELETE — so the trail cannot be rewritten.

## Approval queue

Required approvals become pending `ApprovalRequest`s. Resolution is **role-gated**: the approver's role
must meet or exceed the request's required role (owner for production/large spend/contracts, admin for
the rest). Approve or reject; status and resolver are recorded.

## Secret vault & credential rotation

The vault stores **references** to secrets (a `location` pointer into the encrypted store / KMS) plus
rotation metadata — it **never stores the value**. `value_stored` is the literal `false` in the
contract and a CHECK constraint in the database, in both the TypeScript and Python runtimes. It
supports registration, **credential rotation** (records the rotation and schedules the next),
revocation, and a due-for-rotation worklist.

## Sessions

Tenant-scoped sessions with create / validate (expiry + revocation) / touch / revoke / revoke-all-for-
principal (e.g. on credential compromise).

## Tenant isolation

Every service is tenant-scoped: audit, approvals, secrets, sessions, and groups never cross tenants,
matching the RLS that protects the tables.

## Wiring (Phase 2)

The gate, queue, vault, sessions, and groups are in-memory engines today. Phase 2 wires them to the
Supabase tables and makes every executing engine call `gate.evaluate(...)` before acting — the point
at which least-privilege and the six safeguards become enforced at runtime rather than available.
