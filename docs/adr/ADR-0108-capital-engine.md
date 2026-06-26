# ADR-0108: Capital Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Money is only one of the founder's assets, and optimizing for short-term activity quietly spends the others —
knowledge, relationships, reputation, energy — without ever accounting for them. The leverage is to measure *every*
form of capital, optimize for lifetime accumulation rather than this week's output, and make visible how one form
of capital converts into another. This ADR adds the Capital Engine.

## Decision

Add a `capital-engine/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`report()`**
measures how a recommendation changes each form of capital, and **`topByNet()`** ranks recommendations by net
capital gain.

### Ten capital types and conversion paths

The engine accounts for **ten forms of capital** — financial, knowledge, relationship, reputation, operational,
and the rest — reporting for every recommendation **how much of each capital increases or decreases, the
compounding effect, the payoff horizon, and how capital can convert into other forms** (knowledge into product,
reputation into deal flow, relationships into capital). The invariant: the engine optimizes for **lifetime capital
accumulation, not short-term activity** — so a move that spends reputation for a quick financial win is scored on
its net effect across all ten, not just its cash line.

### Contracts & data

`packages/shared/src/contracts/capital-engine.ts`: `CapitalType`, `CapitalDeltas`, `CapitalReportInput`,
`CapitalReport`. Migration `0185_capital_reports.sql` (append-only `capital_reports`). Smoke `pnpm capstone:smoke`.

## Consequences

- Every recommendation is scored across **10 capital types** with compounding effect, payoff horizon, and
  conversion paths between forms.
- It optimizes for lifetime capital accumulation, not short-term activity; `topByNet()` ranks by net capital gain.
- Migration `0185_capital_reports.sql` (append-only `capital_reports`).
- Phase 2 feeds its conversion paths into the Capital Allocation Board and the Strategic Exit engine.
