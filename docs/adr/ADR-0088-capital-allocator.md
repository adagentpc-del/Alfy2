# ADR-0088: Executive Capital Allocator

**Status:** Accepted
**Date:** 2026-06-25

## Context

A founder's real job is allocation — deciding where time, money, energy, attention, and a dozen other forms of
capital go each day, week, and quarter. Most allocation happens implicitly and badly: the loudest demand wins, and
the trade-offs go unnamed, so optimizing one resource quietly destroys another. The leverage is in making
allocation explicit across every form of capital, surfacing the highest-value uses and what each one depletes. This
ADR adds the Executive Capital Allocator to allocate intelligently across all capital kinds and to never optimize
one resource while wrecking another.

## Decision

Add a `capital-allocator/` engine in `@alfy2/core`. Deterministic, tenant-scoped. On **daily, weekly, and
quarterly** horizons it computes the highest-value allocation across **twelve capital kinds**, surfaces the
highest-return moves and their trade-offs, and names what to stop.

### Twelve capital kinds, three horizons

The allocator reasons over twelve capital kinds — **time, money, energy, attention, relationships, reputation,
knowledge, technology, assets, employees, agents, automation** — because a founder spends all of them, not just
money. On the daily, weekly, and quarterly horizon it computes where each form of capital is best spent, surfacing
the moves with the highest **ROI**, **leverage**, **compounding**, **strategic**, and **freedom** value. The
allocation is explicit and graded, so the founder sees where capital should flow rather than letting the loudest
demand decide.

### Trade-offs named, and what to stop

Allocation is not free, and the engine says so: for each pick it names the **trade-off** — what that choice
**depletes**, since spending attention here means starving it there. And on the quarterly horizon it names **what
to stop** — the uses of capital that have stopped earning their cost. The governing rule is mechanical in spirit:
never optimize one resource while destroying another. The allocator's whole value is keeping the depletion
visible, so a high-ROI move that quietly burns the founder's energy is flagged, not celebrated.

### Contracts & data

`packages/shared/src/contracts/capital-allocator.ts`: `CapitalKind`, `Allocation`, `AllocationTradeoff`,
`AllocatorHorizon`, `CapitalAllocatorResult`. Migrations `0162`/`0163` store allocations and their trade-offs
**append-only**, so the allocation history is preserved. Smoke `pnpm capital:smoke`.

## Consequences

- The allocator computes daily/weekly/quarterly highest-value allocation across twelve capital kinds (time /
  money / energy / attention / relationships / reputation / knowledge / technology / assets / employees / agents /
  automation), surfacing the highest ROI / leverage / compounding / strategic / freedom moves.
- Every pick names its trade-off — what it depletes — so allocation never optimizes one resource while destroying
  another.
- The quarterly horizon names what to stop — capital uses that no longer earn their cost.
- Allocations and trade-offs are append-only (`0162`/`0163`), preserving the allocation history.
- Phase 2 wires the Leverage tier and Opportunity Cost analysis into the allocation ranking and the executive
  views.
