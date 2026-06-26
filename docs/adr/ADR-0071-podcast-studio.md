# ADR-0071: Podcast Studio OS

**Status:** Accepted
**Date:** 2026-06-25

## Context

"Decoded with Alyssa DelTorre" is a real operation, not a hobby — and like any operation it runs better with a
system than with a notes app. The recurring work is the same every week: turn what's happening into episode
ideas, shape each idea into a producible episode, and connect it back to the businesses and to monetization. The
raw material for that already exists inside the platform's intelligence and databases. This ADR adds the Podcast
Studio OS: an engine that manages the show from idea to episode to monetization.

## Decision

Add a `podcast-studio/` engine in `@alfy2/core` that manages "Decoded with Alyssa DelTorre" across its full
lifecycle. Deterministic, tenant-scoped. It runs the show idea → episode → monetization, drawing its inputs from
the rest of the platform.

### From idea to episode to money

Each episode idea is worked up in full: **title, hook, premise, why now, audience, key story, talking points,
guest fit, business tie-in, monetization angle, clips, CTA, related businesses, and assets needed.** That is a
producible brief, not a one-line topic — it names the story, who it's for, why it's timely, how it ties to
Alyssa's businesses, and how it makes money. Each idea then moves through a **six-stage lifecycle** from concept
toward published episode.

### Fed by the platform's intelligence

The Studio does not invent its material in a vacuum. Its inputs come from the **Executive Intelligence Network**
(ADR-0067), from **business updates**, and from the **failure and trends databases** (ADR-0068) — so the show is
sourced from what the platform already knows is happening and what it has learned. The intelligence becomes
episodes; the episodes tie back to the businesses they came from.

### Contracts & data

`packages/shared/src/contracts/podcast-studio.ts`: `EpisodeIdea`, `EpisodeStage`, `EpisodeLifecycle`,
`PodcastInput`, `MonetizationAngle`. Migrations `0125`/`0126` store episode ideas and their lifecycle state.
Smoke `pnpm podcast:smoke`.

## Consequences

- The show runs as a system: each idea becomes a producible brief — title, hook, premise, why now, audience, key
  story, talking points, guest fit, business tie-in, monetization angle, clips, CTA, related businesses, assets
  needed.
- Every idea moves through a six-stage lifecycle from concept to published episode.
- Inputs come from the Executive Intelligence Network, business updates, and the failure/trends databases, so
  episodes are sourced from what the platform already knows.
- Migrations `0125`/`0126` persist ideas and lifecycle state.
- Phase 2 feeds intelligence items into the Studio automatically and hands guest fit to the Podcast Guest
  Booking Agent.
