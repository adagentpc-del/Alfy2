# ADR-0079: Visibility Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

A business can produce excellent content and still be invisible — to the right audience, the right press, the
right collaborators. Visibility is a measurable property, not a vibe, but most founders track it by gut feel and
discover the gaps too late. The leverage is in measuring it honestly and saying exactly where to show up next, so
attention is spent on the moves that close the biggest gaps rather than the loudest ones. This ADR adds the
Visibility Engine: a per-business Visibility Score from many signals, plus concrete recommendations for where to
become more visible.

## Decision

Add a `visibility/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It computes a per-business
**Visibility Score** from **fourteen signals** and recommends the specific moves that raise it — and it names the
three weakest signals so the founder knows exactly where the gap is.

### A Visibility Score from fourteen signals

The engine scores each business from fourteen visibility signals — presence and engagement across the channels,
search and media footprint, collaboration and event surface, and the rest of what makes a business findable and
followed. The score is one transparent number built from named components, so visibility stops being a feeling
and becomes something the founder can track, compare, and improve.

### Recommends where, what, and when to show up

From the score the engine recommends concrete visibility moves: **where and what and when to post**, which
**collaborators** to work with, which **podcasts to appear on**, which **conferences** to attend, and which
**awards** to pursue. And it names the **three weakest signals** outright — the engine does not bury the gap in a
dashboard, it points at the three places the business is least visible and tells the founder what to do about each.
Outreach and applications that flow from these recommendations go out only with approval; the engine recommends,
the human decides what to pursue.

### Contracts & data

`packages/shared/src/contracts/visibility.ts`: `VisibilitySignal`, `VisibilityScore`, `VisibilityRecommendation`,
`VisibilityInput`, `VisibilityResult`. Migrations `0144`/`0145` store visibility scores and recommendations
**append-only**, so the trajectory of a business's visibility over time is preserved. Smoke `pnpm visibility:smoke`.

## Consequences

- Each business gets a transparent Visibility Score built from fourteen named signals — visibility becomes
  measurable and trackable.
- The engine recommends where/what/when to post, collaborators, podcasts to appear on, conferences, and awards,
  and names the three weakest signals so the gap is explicit.
- Scores and recommendations are append-only (`0144`/`0145`), preserving the visibility trajectory over time.
- Outreach flowing from recommendations is approval-gated; the engine recommends, the human pursues.
- Phase 2 feeds visibility recommendations into the PR & Authority engine and the content schedule.
