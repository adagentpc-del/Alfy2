# ADR-0110: The Alfy² Pyramid

**Status:** Accepted
**Date:** 2026-06-25

## Context

Without a shared yardstick, features drift toward the easy levels — capturing and organizing — and never climb to
the ones that actually return the founder's life: executing, compounding, multiplying, freedom. The
cognitive-offloading capstone needs a single value pyramid that names where any feature or output sits and insists
it move up. This ADR adds the Alfy² Pyramid as that yardstick and the capstone's organizing principle.

## Decision

Add a `pyramid/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`classify()`** places a
feature or output on the pyramid and recommends the next level up.

### Capture → … → Freedom

The pyramid has **eight levels, lowest → highest: Capture → Organize → Understand → Recommend → Execute → Compound
→ Multiply → Freedom.** `classify()` returns a `PyramidPlacement` naming the current level and the recommended next
level. The invariant: **every feature must move up the pyramid** — a capability that only captures or organizes is
flagged with the path to understanding, recommending, executing, and ultimately freedom, so the whole platform is
pulled toward the L0 directive of giving Alyssa her life back rather than settling at the bottom.

### Contracts & data

`packages/shared/src/contracts/pyramid.ts`: `PyramidLevel`, `ClassifyPyramidInput`, `PyramidPlacement`. No
migration — deterministic classification. Smoke `pnpm capstone:smoke`.

## Consequences

- Every feature/output is placed on the **8-level pyramid** (Capture → Organize → Understand → Recommend → Execute
  → Compound → Multiply → Freedom) with a recommended next level.
- The invariant "every feature must move up the pyramid" pulls the platform toward Freedom — the L0 directive.
- No migration — a pure classifier.
- Phase 2 runs `classify()` over engine outputs to keep the capstone climbing.
