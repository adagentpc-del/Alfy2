# ADR-0074: Story Mining Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

A founder building in public generates stories constantly — a hard call, a customer win, a failure survived, a
number that moved — and almost all of them evaporate unrecorded. Meanwhile the platform already produces
podcasts, PR strategies, and briefings that are starving for raw narrative. The waste is the point: a good story
is leverage that compounds across every channel, yet it is created once, told once, and lost. This ADR adds the
Story Mining Engine, merging the prior Story Mining and Story Intelligence ideas into one engine, so that every
experience becomes a story and no good story is ever lost.

## Decision

Add a `story-mining/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It turns any experience from
**twelve sources** into a fully worked story shaped for **eight channels**, and keeps the catalog of stories so
the rest of the media stack can draw on it.

### Twelve sources in, a complete story out

The engine mines experience from twelve source kinds — the daily work, decisions, wins, failures, customer
conversations, lessons, milestones, and the rest of a founder's lived material — and refuses to let any of it
pass through unexamined. From each experience it produces a single structured story carrying its **hook**,
**conflict**, **lesson**, **emotion**, **transformation**, **why it matters**, **audience**, **business tie-in**,
**CTA**, **proof**, **best channels**, and **urgency**. The story is not a summary; it is the raw experience
turned into something tellable, with the angle, the stakes, and the payoff already worked out.

### Shaped for eight channels, never lost

The same story is cut for **eight channels**, because a story told once on one surface is a story under-used —
the engine names the best channels for each and lets the media stack render it everywhere it earns attention.
The governing rule is that a good story is never lost: every mined story is retained, scored on urgency, and kept
available so a moment that mattered on a Tuesday is still there to be told a month later when the channel is
right.

### Contracts & data

`packages/shared/src/contracts/story-mining.ts`: `StorySource`, `MinedStory`, `StoryChannel`, `StoryMiningInput`,
`StoryMiningResult`. Migrations `0132`/`0133` store mined stories **append-only** — a story is never overwritten,
so the narrative record only grows. Smoke `pnpm story:smoke`.

## Consequences

- Every experience from twelve sources becomes a structured story with hook/conflict/lesson/emotion/
  transformation/why-it-matters/audience/business-tie-in/CTA/proof/best-channels/urgency — narrative is captured,
  not lost.
- Each story is shaped for eight channels and tagged with its best channels and urgency, so the same moment can
  be told everywhere it earns attention.
- Stories are append-only (`0132`/`0133`); the narrative record only grows and a good story is never lost.
- The engine feeds the Media OS, Content Factory, Podcast Studio, and PR stack with raw narrative they no longer
  have to invent.
- Phase 2 wires mined stories into the Media OS and Content Factory automatically, so a worked story flows into
  finished assets behind the standing approval gate.
