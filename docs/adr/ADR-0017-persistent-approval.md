# ADR-0017: Persistent Approval

**Status:** Accepted
**Date:** 2026-06-25

## Context

Enterprise Security (ADR-0015) requires explicit approval for the six sensitive action classes and for
production writes. That is correct for one-off actions, but it makes recurring, already-trusted
workflows painful: the operator would be asked to approve "send the retainer follow-up email" or
"place the ad spend" every single time. The operator should be able to **approve a workflow once** and
have the system stop asking — within bounds she sets.

## Decision

Add a `persistent-approval/` registry in `@alfy2/core` and consult it from the Security Gate. A
**persistent approval** is a bounded standing grant. Every grant stores, exactly as required, a
**scope**, an **expiration**, **limits**, **success metrics**, and a **review schedule**.

### Grant buttons → derived lifecycle

The seven buttons map to a `grant_type`, from which the engine derives expiry and review schedule:

| Button | grant_type | Expiry | Review |
| --- | --- | --- | --- |
| Remember this | `remember_this` | none | none |
| Always allow | `always` | none | none |
| Allow for this business | `business` | none | optional |
| Allow until goal complete | `until_goal` | ends when the goal completes | — |
| Allow for 30 days | `duration` | now + N days | on expiry |
| Review monthly | `review_monthly` | none | every 30 days |
| Review quarterly | `review_quarterly` | none | every 90 days |

### Scope & limits

A grant's **scope** can pin an action class, an action-label substring, a business, a goal, and the
environments it covers (production is opt-in, excluded by default). **Limits** cap the number of uses
and the per-action spend. An action is covered only if the grant is live AND every set scope facet
matches AND it stays within limits.

### Gate integration (additive)

`SecurityGate` gains an optional `persistentApprovals` registry. When the policy would queue a fresh
approval, the gate first calls `registry.authorize(...)`. If a covering grant exists, the action is
**pre-approved** (`allow`), one use is recorded, and the audit entry references the grant — **nothing is
queued**. With no registry, the gate behaves exactly as before, so Enterprise Security is unchanged.

### Auto-expire into review

`expireDue(now)` moves grants past their expiry or scheduled review into `in_review` — they
automatically expire and enter review rather than silently lapsing or silently continuing. `renew`
reactivates a reviewed grant; `revoke` ends it; `expireForGoal` ends "until goal complete" grants when
their goal completes.

### Contracts & data

`packages/shared/src/contracts/persistent-approval.ts`: `GrantType`, `ReviewSchedule`,
`ApprovalLifecycleStatus`, `ApprovalScope`, `ApprovalLimits`, `PersistentApproval`,
`CreatePersistentApprovalInput`. Mirrored in Pydantic. Migration 0022 adds `persistent_approvals`
(scope/limits as `jsonb`) + 0023 deny-by-default RLS.

## Consequences

- The operator approves a workflow once; the gate stops re-asking within the approved scope, which is
  the explicit requirement ("Do not repeatedly request permission within the approved scope").
- Standing approval is always bounded — by scope, amount, use count, environment, expiry, and a review
  cadence — so "approve once" never becomes "approve forever, unbounded."
- The integration is additive: Enterprise Security's guarantees are intact, and a grant simply turns a
  would-be `requires_approval` into an audited `allow`.
- Grants self-retire into review on schedule, so standing trust is revisited rather than accumulating.
- Wiring goal completion to call `expireForGoal`, and running `expireDue` on a schedule, is Phase 2.
