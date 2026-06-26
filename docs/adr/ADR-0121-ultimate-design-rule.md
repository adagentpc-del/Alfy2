# ADR-0121: The Ultimate Design Rule

**Status:** Accepted
**Date:** 2026-06-25

## Context

Above the README and the Constitution sits one admission gate: a feature does not belong in Alfy² unless it earns
its place. Without a final rule, the platform accretes features that are merely "nice" — and accretion is the enemy
of an OS whose whole point is to make the founder freer, not busier. The Ultimate Design Rule is the highest gate:
six criteria, and a candidate must satisfy **at least one** or it is rejected.

## Decision

Add an `ultimate-design-rule/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`admit()`** checks a feature
against the **six criteria — increase leverage / reduce friction / compound knowledge / protect trust / generate
measurable value / increase founder freedom** — and admits it only if it satisfies **at least one**, naming which.
The invariant: **a feature satisfying none of the six does not belong in Alfy²** — this gate sits above the README
and the Constitution. A **read model** (a pure admission check).

### Contracts & data

`packages/shared/src/contracts/ultimate-design-rule.ts`: `DesignCriterion`, `AdmissionInput`, `AdmissionVerdict`. No
migration — a pure admission gate. Smoke `pnpm meta:smoke`.

## Consequences

- `admit()` admits a feature only if it satisfies at least one of the six criteria, naming which; otherwise it is
  rejected.
- Read model — no migration; the highest admission gate, above the README and the Constitution (ADR-0051).
- Gates admission to the Infinite Loop (ADR-0120); surfaced as the banner at the top of the repo `README.md`.
