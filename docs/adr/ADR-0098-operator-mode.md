# ADR-0098: Billion-Dollar Operator Mode

**Status:** Accepted
**Date:** 2026-06-25

## Context

Small companies accumulate decisions that work at small scale and quietly cap their ceiling — the shortcut that
cannot survive compliance, the manual process that cannot survive growth. The leverage is to hold every major
recommendation to enterprise-level discipline *before* the company is an enterprise, so it is built once to last.
This ADR adds Billion-Dollar Operator Mode: a lens that asks of every recommendation, "would this still make sense
at $100M+/year?" and, if not, recommends the cleaner, scalable version.

## Decision

Add an `operator-mode/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`review()`** scores
a recommendation on twelve enterprise dimensions and returns an `OperatorReview` with a **`hundred_m_fit` (0..1)**
and, when fit is low, the cleaner scalable alternative.

### The $100M+ lens

The engine evaluates scalability, compliance, reputation, financial_upside, downside_risk, delegation_potential,
operational_complexity, cash_impact, customer_trust, legal_exposure, founder_freedom, and
long_term_enterprise_value — each 0..1 — into **`hundred_m_fit`**. The invariant: a recommendation that would not
survive enterprise scale is not passed through unchanged; the engine names *why* it fails the lens and *what* the
scalable version looks like, so the founder builds the version that still works at $100M+.

### Contracts & data

`packages/shared/src/contracts/operator-mode.ts`: `OperatorReviewInput`, `OperatorReview`. No migration —
deterministic scoring. Smoke `pnpm capstone:smoke`.

## Consequences

- Every major recommendation is held to a "would this work at $100M+?" lens via `hundred_m_fit`.
- Low-fit recommendations come back with the cleaner, scalable alternative rather than a silent pass.
- No migration — a pure scorer.
- Phase 2 runs `review()` on major recommendations across the capstone, alongside the Five Immutable Laws checker.
