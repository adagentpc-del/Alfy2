# ADR-0116: Never Again Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Every recurring frustration is a missing piece of infrastructure. When the founder hits the same annoyance twice —
re-explaining the same thing, redoing the same manual step, chasing the same dropped ball — the right response is
not patience but permanence: build the safeguard, automation, agent, or SOP that makes the frustration impossible
to recur.

## Decision

Add a `never-again/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`capture()`** takes a logged
frustration and proposes the **permanent infrastructure** that retires it (automation / agent / SOP / safeguard /
redesign), with the trigger that would have caught it. The invariant: **a frustration resolves into permanent
infrastructure, never a one-off fix** — "never again" is the contract.

### Contracts & data

`packages/shared/src/contracts/never-again.ts`: `Frustration`, `PermanentFix`, `NeverAgainRecord`. Migration `0190`
stores records **append-only**. Smoke `pnpm meta:smoke`.

## Consequences

- `capture()` turns each frustration into a proposed permanent fix (automation / agent / SOP / safeguard / redesign).
- Records are append-only (`0190`).
- Composes the Anti-Fragility Engine (ADR-0095) and the Agent Factory (ADR-0005); its proposals feed the
  Self-Improvement Engine (ADR-0117) when the fix is to the OS itself.
