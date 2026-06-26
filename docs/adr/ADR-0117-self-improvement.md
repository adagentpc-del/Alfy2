# ADR-0117: Enterprise Self-Improvement Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

An operating system that never turns its evaluation on itself decays. Alfy² already evaluates workflows, agents, and
businesses; it must also evaluate **itself** on a regular cadence — finding refactors and tech debt, and choosing
the change that makes the OS **simpler, not bigger**. Compounding software gets smaller per unit of capability, not
larger.

## Decision

Add a `self-improvement/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`selfEvaluate()`** runs a
**monthly OS self-evaluation**, identifying refactors and tech debt and recommending changes ranked so that
**simplification beats expansion** — a change that removes complexity outscores one that adds capability. The
invariant: **the recommended change makes the OS simpler, not bigger.**

### Contracts & data

`packages/shared/src/contracts/self-improvement.ts`: `SelfEvalInput`, `RefactorRecommendation`, `SelfEvalReport`.
Migration `0191` stores self-evaluations **append-only**. Smoke `pnpm meta:smoke`.

## Consequences

- `selfEvaluate()` runs monthly, surfacing refactors + tech debt and preferring simpler over bigger.
- Self-evaluations are append-only (`0191`).
- Composes the Continuous Improvement Engine (ADR-0059) and the Reflection Engine (ADR-0053); consumes Never Again
  (ADR-0116) proposals that target the OS itself.
