# Persistent Approval

Persistent Approval lets the operator approve a workflow **once**. Instead of being asked to approve
the same recurring, already-trusted action every time, she grants a bounded *standing approval*, and
the Security Gate honors it — pre-approving in-scope actions and never re-asking within that scope. It
sits on top of Enterprise Security and is fully additive: with no standing grants, the gate behaves
exactly as before.

Module: `packages/core/src/persistent-approval/`. Contracts:
`packages/shared/src/contracts/persistent-approval.ts` (mirrored in `workers/`). Migrations:
`0022_persistent_approvals.sql`, `0023_persistent_approvals_rls.sql`. ADR:
`docs/adr/ADR-0017-persistent-approval.md`. Smoke: `pnpm approval:smoke`.

## What every grant stores

- **scope** — what the grant covers: an action class, an action-label substring, a business, a goal,
  and the environments it applies to (production is opt-in, excluded by default)
- **expiration** — when it lapses (none, a fixed date, or tied to a goal)
- **limits** — a maximum number of uses and a maximum per-action spend
- **success metrics** — what success looks like for the approved workflow
- **review schedule** — none / monthly / quarterly / on-expiry

## The grant buttons

| Button | Behavior |
| --- | --- |
| **Remember this** | Approve this specific action signature; no expiry |
| **Always allow** | Standing approval with no expiry |
| **Allow for this business** | Scoped to one business |
| **Allow until goal complete** | Ends automatically when the goal completes |
| **Allow for 30 days** | Expires after N days (default 30), reviewed on expiry |
| **Review monthly** | Stays active but returns to review every 30 days |
| **Review quarterly** | Stays active but returns to review every 90 days |

## How the gate uses it

When the security policy would queue a fresh approval, the gate first asks the registry to
`authorize` the action. If a **live, in-scope, within-limits** grant covers it, the action is
pre-approved (`allow`), one use is recorded, and the audit entry references the grant — **nothing is
queued, and the operator is not re-asked.** If no grant covers it, the gate falls back to requesting a
fresh approval as usual.

A grant covers an action only when *all* of these hold: it is live (active, not expired, not due for
review); every set scope facet matches (class, label substring, business, environment); and it is
within limits (uses remaining, spend under the cap). So "allow up to $500 of ad spend for this goal"
covers a $300 charge but not a $900 one, and a dev/staging grant never silently covers production.

## Auto-expire into review

Grants do not silently lapse or silently run forever. `expireDue(now)` moves any grant past its expiry
or scheduled review into **`in_review`** — it automatically expires *and enters review*. `renew`
reactivates a reviewed grant and reschedules it; `revoke` ends it; `expireForGoal` ends
"allow until goal complete" grants the moment their goal completes.

## Tenant isolation

Grants are tenant-scoped and never cross tenants, matching the RLS on `persistent_approvals`.

## Wiring (Phase 2)

The registry is in-memory today. Phase 2 persists grants to `persistent_approvals`, runs `expireDue`
on a schedule so reviews fire on time, and calls `expireForGoal` from the Goal Engine when a goal
completes.
