# Strategic Portfolio Optimizer

The Strategic Portfolio Optimizer looks at all of Alyssa's businesses together and tells her where to
put her attention. It scores each business across ten dimensions, ranks them, and recommends an action.
Deterministic. Tenant-scoped.

Module: `packages/core/src/portfolio/`. Contracts: `packages/shared/src/contracts/portfolio.ts`
(mirrored in `workers/`). Migrations: `0048_portfolio_reports.sql`, `0049_portfolio_reports_rls.sql`.
ADR: `docs/adr/ADR-0029-strategic-portfolio-optimizer.md`. Smoke: `pnpm portfolio:smoke`.

## The ten dimensions

Each business is scored 0..1 on: **revenue potential, speed to cash, effort required, stress cost,
strategic value, current traction, operational drag, capital required, team dependency, monetization
path.** Five are upside (higher is better); five are cost (lower is better).

## Composite + recommendation

The **composite** = average upside − ½ average drag. Businesses are ranked by composite. The
**recommendation** is rule-based — and the delegate/automate/package calls key off *upside plus the
offending cost dimension* rather than the penalized composite, because a business worth delegating is
exactly one whose upside is real but whose you-dependency is the problem:

| Recommendation | When |
| --- | --- |
| **focus_now** | strong composite with real traction |
| **package_for_sale** | monetizable but off-strategy with little traction |
| **delegate** | real upside but too dependent on you (team/stress/effort) |
| **automate** | usable upside dragged down by operational overhead |
| **kill** | weak across the board |
| **pause** | marginal — revisit when capacity frees up |

`analyze()` returns the ranked assessments and a summary that names what to focus on and what to exit.

## Tenant isolation

Reports are tenant-scoped and stored immutably, matching the RLS on `portfolio_reports`.

## Pairs with the rest

Model a priority shift with the Simulation Engine before acting; the focus_now businesses get the
attention (and Goals). Phase 2 feeds the dimensions from live metrics and runs the analysis on a cadence.
