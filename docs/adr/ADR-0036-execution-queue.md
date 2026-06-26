# ADR-0036: Execution Queue

**Status:** Accepted
**Date:** 2026-06-25

## Context

With many engines surfacing work — ideas, tasks, approvals, money actions, risks — Alyssa needs one
ordered queue that always answers "what do I do next?" without her having to triage. The order must put
revenue and risk ahead of nice-to-haves, and must skip things she can't act on yet.

## Decision

Add an `execution-queue/` engine in `@alfy2/core`. It separates work into eight buckets and ranks it by
a fixed priority order. Deterministic. Tenant-scoped.

### Eight buckets

ideas, tasks, approved actions, blocked actions, waiting on Alyssa, automated workflows, money actions,
risk actions.

### Fixed priority order

Items are ranked by category: **revenue → risk → deadlines → follow-up → operations → personal admin →
nice-to-have.** Within a tier, sooner deadlines come first, then higher value.

### Always knows what to do next

`next()` returns the single highest-priority **actionable, not-done** item — blocked actions and items
waiting on Alyssa are not actionable and are skipped, so the engine never points at something that can't
be acted on. `move` (e.g. unblock → approved), `complete`, `byBucket`, and `waitingOnAlyssa` (the
decision queue) round it out.

### Contracts & data

`packages/shared/src/contracts/execution-queue.ts`: `QueueBucket`, `QueueCategory`, `QueueItem`,
`AddQueueItemInput`. Migration 0062 adds `queue_items` + 0063 RLS.

## Consequences

- There is always a single, defensible "do this next" — revenue and risk first, blocked/waiting items
  filtered out.
- It's the natural sink for everything the other engines produce (a money action from the Revenue
  Command System, a risk from Enterprise Security, a follow-up from the Follow-Up Engine). Phase 2 has
  the engines enqueue directly and feeds `next()` into the Executive Control Tower and Executive Inbox.
