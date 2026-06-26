# ADR-0122: Identity OS

**Status:** Accepted
**Date:** 2026-06-25

## Context

Optimization is amoral: left alone, it will recommend the most efficient path even when that path violates who the
founder is. Alyssa's identity — her values, her non-negotiables, what she will and will not do — must sit above the
optimizer, not beside it. When the two conflict, identity wins, every time.

## Decision

Add an `identity-os/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`setAnchor()`** records an identity
anchor (a value, boundary, or non-negotiable); **`check()`** tests a proposed action against the anchors and, on
conflict, returns a verdict in which **identity OVERRIDES optimization**. Anchors are **mutable** — identity
evolves, so they can be revised. The invariant: **on any identity↔optimization conflict, identity wins.**

### Contracts & data

`packages/shared/src/contracts/identity-os.ts`: `IdentityAnchor`, `IdentityCheckInput`, `IdentityVerdict`. Migration
`0192` stores `identity_anchors` (**mutable** — anchors are revised as identity evolves). Smoke `pnpm identity:smoke`.

## Consequences

- `setAnchor()` records anchors; `check()` overrides optimization with identity on conflict.
- `identity_anchors` is mutable (`0192`) — identity is revisable, not frozen.
- Sits above the Constitution (ADR-0051) and the Five Immutable Laws (ADR-0087) for the founder's personal
  non-negotiables; read by the Conversation Engine (ADR-0124) before anything is proposed.
