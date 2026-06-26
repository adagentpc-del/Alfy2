# ADR-0032: Conversion Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Revenue is made or lost at the conversion surfaces — landing pages, offers, hooks, CTAs, emails, DMs,
sales calls, decks, proposals, follow-ups, checkout flows. Alyssa needs these tracked and continuously
improved, and — critically — improved for *revenue*, not vanity metrics like raw click or open rate.

## Decision

Add a `conversion/` engine in `@alfy2/core`. It maintains a per-business conversion profile and runs
A/B tests whose winners are decided by **revenue per unit** (conversion × value), not raw conversion.
Deterministic. Tenant-scoped.

### Per-business profile

Each business has a `ConversionProfile`: a baseline (revenue per unit + conversion), active tests,
winning copy, losing copy, objections, best offers, and the next optimization. `revenue_focused` is
always true.

### Tests decided by revenue

`startTest` opens an A/B test on a surface; `recordResult` resolves it. The winner is the variant with
the higher revenue per unit — so a variant that converts *lower* but at far higher value wins. The
winner's copy goes to winning_copy, the loser's to losing_copy, the baseline lifts if beaten, and a
next optimization is set. Offers are ranked by revenue, objections are tracked.

### Contracts & data

`packages/shared/src/contracts/conversion.ts`: `ConversionSurface`, `ConversionTest`,
`ConversionProfile`, `CopySnippet`, `OfferPerf`, `StartTestInput`, `TestResultInput`. Migration 0054
adds `conversion_profiles` + 0055 RLS.

## Consequences

- Optimization is anchored to money: the engine will pick the lower-converting, higher-revenue variant,
  which is the point.
- The profile is a durable, per-business record of what works (winning copy) and what doesn't (losing
  copy) — institutional memory for conversion. Phase 2 feeds results from live channel data.
