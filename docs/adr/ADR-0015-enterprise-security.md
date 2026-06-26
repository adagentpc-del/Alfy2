# ADR-0015: Enterprise Security

**Status:** Accepted
**Date:** 2026-06-24

## Context

Alfy² takes irreversible, money-moving, and production-touching actions on behalf of a founder
across many businesses. Several pieces of safety machinery already existed in scattered form — the
Phase-1 Approval Gate, the tenancy `PermissionChecker`, agent permission defaults, append-only event
logs. What was missing was a single, named, enforced security layer that makes the guarantees
explicit and centralizes them at one chokepoint.

The requirement: everything follows least privilege; new agents default to read-only; six classes of
action may **never** happen without explicit approval — spend money, delete data, modify production,
contact external users, sign contracts, install packages — and **every** action must create an audit
trail.

## Decision

Add a `security/` engine in `@alfy2/core` built around a **Security Gate** — the one chokepoint every
proposed action passes through — plus tenant-scoped supporting services. All of it is deterministic
(no AI); decisions are explainable.

### Components

- **Security Gate** (`gate.ts`) — `evaluate(ActionRequest) → SecurityDecision`. Resolves the actor's
  authority, runs the policy, **writes an audit entry for every action**, and queues an approval when
  one is required. Engines must refuse to execute unless the gate returned `allow`.
- **Policy** (`policy.ts`) — the deterministic rules. The six sensitive classes always resolve to
  `requires_approval`. Money controls escalate the approver to owner above a threshold. Production
  protection requires approval for any write to a protected env. Least privilege governs the rest:
  agents default read-only (their writes always need approval); a human write needs an elevated role
  or a write-bearing permission; an ungranted principal is denied outright.
- **Audit Log** (`audit.ts`) — append-only trail; one entry per evaluation. Backing table
  `security_audit` has no UPDATE/DELETE RLS policy, so entries are immutable.
- **Approval Queue** (`approvals.ts`) — pending → approved/rejected; resolution is role-gated.
- **Secret Vault** (`vault.ts`) — RBAC over API keys/credentials as **references** plus rotation
  metadata. The value is never stored (`value_stored` is the literal `false`, enforced by a DB CHECK);
  encryption lives in the store/KMS the `location` points at. Supports credential rotation and a
  due-for-rotation worklist.
- **Session Manager** (`sessions.ts`) — create/validate/expire/revoke, including revoke-all-for-principal.
- **Permission Groups** (`groups.ts`) — named permission bundles layered on top of role grants.

### Contracts

`ActionRequest`, `SecurityDecision`, `AuditEntry`, `ApprovalRequest`, `PermissionGroup`, `SecretRef`,
`Session`, and the `SensitiveActionClass` enum (the six). Mirrored in Pydantic; `value_stored:
Literal[false]` proves the vault-never-stores-value guarantee in both runtimes.

### Data

Migration 0018 adds `security_audit` (append-only), `approval_requests`, `permission_groups`,
`secrets`, `sessions`; 0019 enables deny-by-default RLS. `secrets.value_stored = false` is a CHECK
constraint; `security_audit` gets INSERT+SELECT policies only.

## Consequences

- There is one, auditable answer to "can this action happen?" — and a trail for every action.
- The six forbidden classes cannot be bypassed, even by the owner: they are queued for explicit
  approval, never auto-executed.
- The vault is structurally incapable of leaking a secret value — it only ever holds references.
- The gate reuses the existing tenancy `PermissionChecker` via injected resolvers; no engine had to
  change. Wiring engines to actually call the gate before executing is Phase 2 work.
- Least privilege is the default everywhere: a brand-new agent can read but not write.
