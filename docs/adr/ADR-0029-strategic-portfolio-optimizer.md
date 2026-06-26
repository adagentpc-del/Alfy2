# ADR-0029: Strategic Portfolio Optimizer

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alyssa runs many ventures at once, and the scarce resource is her attention. She needs to look at the
whole portfolio together and get a clear, defensible call on each business: where to pour energy, what
to hand off, what to automate, what to pause, what to end, and what to sell.

## Decision

Add a `portfolio/` optimizer in `@alfy2/core` that analyzes all businesses together and recommends an
action per business. Deterministic. Tenant-scoped.

### Ten dimensions

Each business is scored 0..1 on the ten dimensions the request lists: **revenue potential, speed to
cash, effort required, stress cost, strategic value, current traction, operational drag, capital
required, team dependency, and monetization path.** Five are upside (higher is better) and five are cost
(lower is better).

### Composite + recommendation

The **composite** is the average upside minus half the average drag. Businesses are ranked by composite.
The **recommendation** is rule-based and — importantly — the delegate/automate/package calls key off
*upside plus the offending cost dimension*, not the penalized composite, because a business worth
delegating is precisely one whose upside is real but whose you-dependency is the problem:

- **focus_now** — strong composite with real traction
- **package_for_sale** — monetizable but off-strategy with little traction
- **delegate** — real upside but too dependent on you (team/stress/effort)
- **automate** — usable upside dragged down by operational overhead
- **kill** — weak across the board (low composite, low revenue and strategic value)
- **pause** — marginal; revisit when capacity frees up

### Contracts & data

`packages/shared/src/contracts/portfolio.ts`: `PortfolioMetrics`, `PortfolioRecommendation`,
`BusinessAssessment`, `PortfolioReport`, `AnalyzePortfolioInput`. Migration 0048 adds the immutable
`portfolio_reports` table (INSERT + SELECT only) + 0049 RLS.

## Consequences

- Attention gets allocated by evidence — the portfolio is ranked and each business carries a one-line
  rationale for its recommendation.
- All six recommendations are reachable, so the optimizer can say "kill" or "sell," not just "focus."
- It pairs with the Simulation Engine (model a priority shift first) and the Goal Engine (focus_now
  businesses get the goals). Phase 2 feeds the dimensions from live metrics and runs it on a cadence.
