# ADR-0089: Opportunity Cost Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Every choice a founder makes forecloses others, and the cost of a decision is not what it takes but what it gives
up — the best alternative not chosen. That opportunity cost is the most ignored number in executive judgment
because it is invisible by default: the road not taken leaves no receipt. The leverage is in making it explicit —
comparing the real options on the dimensions that matter and naming, for each, what choosing it costs against the
best alternative. This ADR adds the Opportunity Cost Engine to compare options and always show what is not chosen
and why.

## Decision

Add an `opportunity-cost/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It compares **two to four
options** on nine dimensions, computes each option's **opportunity cost** versus the best alternative, and names
the best choice on several axes — always showing what is **not** chosen and why.

### Compare options on nine dimensions

The engine takes two to four options and scores each on nine dimensions — **upside, downside, capital, time,
stress, complexity, risk, confidence, and leverage** — so the comparison is multi-dimensional rather than a single
gut number. This is the honest accounting a real decision needs: an option that looks best on upside may be worst
on stress and risk, and the engine lays all nine side by side.

### Opportunity cost, and what is not chosen

For each option the engine computes its **opportunity cost** — the value of the best alternative given up by
choosing it — and then names the best choice on several axes: best **financial**, **strategic**, **long-term**,
**low-risk**, **fastest**, and **highest-leverage**. Critically, it always shows **what is not chosen and why**:
the engine never reports a single winner without naming the alternatives forgone, so the founder decides with the
road not taken made visible rather than ignored.

### Contracts & data

`packages/shared/src/contracts/opportunity-cost.ts`: `DecisionOption`, `OptionDimensions`, `OpportunityCost`,
`OpportunityCostInput`, `OpportunityCostResult`. Migrations `0164`/`0165` store comparisons and computed
opportunity costs **append-only**, preserving the record of decisions and their forgone alternatives. Smoke
`pnpm oppcost:smoke`.

## Consequences

- The engine compares two to four options on nine dimensions (upside / downside / capital / time / stress /
  complexity / risk / confidence / leverage) — decisions get multi-dimensional accounting.
- It computes each option's opportunity cost versus the best alternative and names the best financial / strategic
  / long-term / low-risk / fastest / highest-leverage choice.
- It always shows what is not chosen and why, making the road not taken visible.
- Comparisons and opportunity costs are append-only (`0164`/`0165`).
- Phase 2 feeds opportunity-cost analysis into the Capital Allocator and the Decision Journal so chosen paths
  carry their forgone alternatives.
