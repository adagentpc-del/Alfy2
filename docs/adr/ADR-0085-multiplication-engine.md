# ADR-0085: Multiplication Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

A founder solves the same class of problem over and over because each solution is built for the one case in front
of them and never offered to the next. The compounding question is narrower than "could this be reused" — it is
"who else does this exact solution help, and what shared form would let it help them?" Solving once and reusing
nowhere is the most common leverage leak there is. This ADR adds the Multiplication Engine to evaluate, for every
solution, how many targets it could help and what shared form would spread it, and to score the multiplication so
the biggest spreads are obvious.

## Decision

Add a `multiplication/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It evaluates whether a solution
helps **nine targets**, recommends **eight shared forms**, and scores **Multiplication** as future uses per 100 —
turning one solution into many uses and many hours saved.

### Never solve once

For every solution the engine asks who else it helps across **nine targets** — the other businesses, teams,
audiences, and surfaces that face the same problem — and refuses to treat a solution as a one-off until it has
checked. The premise is in the name: never solve once. A fix built for today's case is evaluated immediately for
every case it could also cover, so the work is spent once and harvested many times.

### Shared forms and a multiplication score

When a solution helps more than its origin case, the engine recommends one of **eight shared forms** — the
template, component, agent, workflow, or other reusable shape that lets the solution spread — and scores
**Multiplication** as expected future uses per 100. The score is the ranking surface: it surfaces the solutions
where one build yields the most downstream uses, so the founder turns **1 solution into 100 uses into 1000 hours
saved** rather than rebuilding the same fix on demand.

### Contracts & data

`packages/shared/src/contracts/multiplication.ts`: `MultiplicationTarget`, `SharedForm`, `MultiplicationScore`,
`MultiplicationInput`, `MultiplicationResult`. Migrations `0158`/`0159` store multiplication evaluations
**append-only**, preserving the record of what each solution multiplied into. Smoke `pnpm multiplication:smoke`.

## Consequences

- Every solution is evaluated against nine targets for who else it helps — never solve once.
- The engine recommends eight shared forms and scores Multiplication as future uses per 100, surfacing the
  solutions where one build yields the most downstream uses.
- Evaluations are append-only (`0158`/`0159`), preserving the multiplication record.
- The engine turns 1 solution into 100 uses into 1000 hours saved, and feeds the Compounding and Leverage engines.
- Phase 2 auto-evaluates solutions as they land and routes high-multiplication shared forms into the Asset
  Library and Agent Factory.
