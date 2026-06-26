# ADR-0099: Capital Allocation Board

**Status:** Accepted
**Date:** 2026-06-25

## Context

A founder allocates far more than money — time, attention, energy, team and agent capacity, technology spend,
relationships, brand equity — and usually allocates it implicitly, by whatever is loudest. The Executive Capital
Allocator (ADR-0088) already picks the highest-value moves across capital kinds and names each pick's trade-off.
The L0 stack needs a complementary instrument that judges a *slate of options* against one another with a payback
and liquidity view and issues an explicit disposition per option. This ADR adds the Capital Allocation Board.

## Decision

Add a `capital-board/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`allocate()`** takes
a set of options, scores each, and returns a `CapitalBoardDecision` with a per-option `BoardOptionVerdict` and a
**disposition**: invest / test / delay / automate / delegate / kill / sell / package_founderos.

### Per-option payback, liquidity, and disposition

For each option the board computes **expected return, risk, payback period (months), liquidity impact, leverage,
compounding value, and opportunity cost**, then issues one of **eight dispositions**. The invariant: every option
leaves with an explicit verdict — nothing sits un-judged — and the disposition follows the numbers, so an option
that ties up liquidity for a long payback is delayed or killed rather than quietly funded.

### Composition

It **complements the Executive Capital Allocator** (ADR-0088): the Allocator finds the highest-value *moves* across
capital kinds and what each depletes; the Board judges a competing *slate* on payback and liquidity and disposes of
each. The Allocator says where capital should go; the Board rules on the options in front of the founder.

### Contracts & data

`packages/shared/src/contracts/capital-board.ts`: `CapitalDisposition`, `BoardOptionInput`, `AllocateBoardInput`,
`BoardOptionVerdict`, `CapitalBoardDecision`. Migration `0176_capital_board_decisions.sql` (append-only `capital_board_decisions`). Smoke `pnpm capstone:smoke`.

## Consequences

- Each option is scored on expected return, risk, payback months, liquidity impact, leverage, compounding, and
  opportunity cost, and receives one of **8 dispositions**.
- Every option leaves with an explicit verdict; payback and liquidity drive the disposition.
- It complements the Executive Capital Allocator (ADR-0088): allocator finds the moves, board disposes of the slate.
- Phase 2 routes competing investment slates through `allocate()`.
