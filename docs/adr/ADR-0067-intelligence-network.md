# ADR-0067: Executive Intelligence Network

**Status:** Accepted
**Date:** 2026-06-25

## Context

The web does not lack summaries; it lacks judgment. A founder drowning in articles, releases, and posts does not
need another digest — she needs to know which of them actually matters to *her* businesses and goals, what to do
about it, and what it implies later. And she needs the platform to stop re-reading the same developing story
every time it resurfaces. This ADR adds the Executive Intelligence Network: an engine that converts external
information into executive intelligence and folds developing stories into a single living briefing.

## Decision

Add an `intelligence-network/` engine in `@alfy2/core` that turns external information into executive
intelligence — not summaries — and maintains living briefings for developing stories. Deterministic,
tenant-scoped.

### From articles to intelligence

Each incoming article is run through **ten scores** that yield a **classification**: **ignore, interesting,
monitor, research, or immediate_action.** For anything past the noise floor the engine produces an intelligence
item that states **why it matters**, the **businesses and goals affected**, the **agents to notify**, the
**immediate actions**, the **future implications**, a **confidence**, the **sources**, and the **follow-ups.**
The output is decision-shaped: what to do and why, not a paragraph restating the article.

### One living briefing per story

A developing story is not a stream of separate items. When new information extends a story the engine already
tracks, it **rolls into one living briefing** with a **timeline** rather than spawning a fresh item — so Alfy²
**never rereads the same story twice** and Alyssa watches one evolving briefing instead of a dozen near-
duplicates. Items are an append-only record; the living briefings are mutable, because a briefing is meant to
grow.

### Contracts & data

`packages/shared/src/contracts/intelligence-network.ts`: `ArticleScore`, `IntelClassification`, `IntelItem`,
`LivingBriefing`, `BriefingTimelineEntry`, `IntelInput`. Migrations `0115`/`0116` store the intelligence items
**append-only**; migrations `0117`/`0118` store the living briefings as **mutable** records that accumulate a
timeline. Smoke `pnpm ein:smoke`.

## Consequences

- External information becomes executive intelligence: each item names why it matters, the businesses and goals
  affected, agents to notify, immediate actions, future implications, confidence, sources, and follow-ups.
- Ten article scores drive a five-way classification — ignore / interesting / monitor / research /
  immediate_action — so attention goes only where it is earned.
- Developing stories fold into one living briefing with a timeline; the same story is never reread twice.
- Items are append-only (`0115`/`0116`); living briefings are mutable (`0117`/`0118`) so they can grow.
- Phase 2 feeds intelligence items to the briefing engine and the intel lenses, and notifies the named agents
  behind the approval gate.
