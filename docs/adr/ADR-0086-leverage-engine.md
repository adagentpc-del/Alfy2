# ADR-0086: Leverage Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

The platform produces recommendations everywhere — what to build, what to pursue, what to automate — and the
default human bias is to pick the fastest one. But the fastest path and the highest-leverage path are rarely the
same, and an owner allocating capital and time should choose the move that compounds, not the move that finishes
soonest. There is no single layer that scores recommendations on leverage and picks the path an owner would. This
ADR adds the Leverage Engine to score every recommendation into a leverage tier and to compare paths by leverage
rather than speed.

## Decision

Add a `leverage/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It scores every recommendation on
**fourteen inputs** into a **tier** — low, medium, high, compounding, generational — and **`compare()`**
recommends the highest-leverage path, not the fastest.

### Fourteen inputs into a leverage tier

The engine scores a recommendation from fourteen inputs — the time it costs, the value it returns, how it
compounds, how broadly it applies, how durable its effect is, and the rest of what makes a move leveraged — and
places it in one of five tiers: **low, medium, high, compounding, generational**. The tier is the verdict: a
"generational" move and a "low" move are read at a glance, so leverage stops being intuition and becomes a graded,
explainable score the founder can trust.

### compare() picks leverage, not speed

**`compare()`** is the decision surface: given competing paths it recommends the **highest-leverage** one, even
when it is not the fastest. This is the engine thinking like an owner allocating capital and time — preferring the
move that compounds over decades to the one that ships this afternoon, and saying so explicitly. The `score()`
that produces a tier is a pure function; `compare()` persists its comparisons so the reasoning behind a chosen
path is kept.

### Contracts & data

`packages/shared/src/contracts/leverage.ts`: `LeverageInput`, `LeverageScore`, `LeverageTier`, `LeverageComparison`,
`LeverageResult`. `score()` is pure and holds no state; **`compare()`** persists its comparisons in migrations
`0160`/`0161` **append-only**, so the record of leverage decisions accumulates. Smoke `pnpm leverage:smoke`.

## Consequences

- Every recommendation is scored on fourteen inputs into a leverage tier (low / medium / high / compounding /
  generational) — leverage becomes a graded, explainable verdict.
- `compare()` recommends the highest-leverage path, not the fastest, thinking like an owner allocating capital and
  time.
- `score()` is pure; `compare()` persists comparisons append-only (`0160`/`0161`), keeping the record of leverage
  decisions.
- The engine sits above the platform's recommendations as the tie-breaker that prefers compounding to speed.
- Phase 2 wires the leverage tier into the executive views and the Capital Allocator's allocation ranking.
