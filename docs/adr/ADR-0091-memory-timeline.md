# ADR-0091: Enterprise Memory Timeline

**Status:** Accepted
**Date:** 2026-06-25

## Context

The platform accumulates decisions, lessons, assets, and events across many engines, but they live in separate
stores with no shared chronology. So the two questions a founder actually asks of the past — "when did we first
discuss this?" and "what happened after that decision?" — have no single place to be answered. Institutional
memory without a timeline is a filing cabinet without dates. The leverage is in one chronological history that
links every event to the assets, agents, people, businesses, and lessons it touched. This ADR adds the Enterprise
Memory Timeline to provide that history and answer those two questions directly.

## Decision

Add a `memory-timeline/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It maintains a chronological
history of **thirteen event kinds**, each linking the related assets, agents, people, businesses, and lessons, and
answers **`firstMention`** and **`after`**.

### Thirteen event kinds, fully linked

The timeline records thirteen event kinds — the decisions, launches, lessons, milestones, conversations, and the
rest of what happens in the enterprise — in one chronological history. Each event links the **assets, agents,
people, businesses, and lessons** it relates to, so a point in time is not an isolated entry but a node connected
to everything it touched. The timeline is the spine that ties the platform's separate memories into one ordered
record.

### firstMention and after

The engine answers the two questions the past is actually asked. **`firstMention`** answers "when did we first
discuss this?" — the earliest point a topic appears, with what surrounded it. **`after`** answers "what happened
after that decision?" — the chain of events that followed a given moment. Together they turn the timeline from a
log into something a founder can interrogate: origins and consequences, both retrievable, both linked to the
assets and people involved.

### Contracts & data

`packages/shared/src/contracts/memory-timeline.ts`: `TimelineEvent`, `TimelineEventKind`, `TimelineLink`,
`FirstMentionResult`, `AfterResult`. Migrations `0168`/`0169` store timeline events and their links **append-only**
— the history is never rewritten, only extended. Smoke `pnpm timeline:smoke`.

## Consequences

- The timeline maintains a chronological history of thirteen event kinds, each linking related assets, agents,
  people, businesses, and lessons — one ordered record over the platform's separate memories.
- `firstMention` answers "when did we first discuss this?" and `after` answers "what happened after that
  decision?" — origins and consequences, both retrievable.
- Events and links are append-only (`0168`/`0169`); the history is extended, never rewritten.
- The timeline ties Institutional Memory, the Decision Journal, and the asset/agent stores into one interrogable
  chronology.
- Phase 2 auto-records events from across the engines so the timeline populates itself.
