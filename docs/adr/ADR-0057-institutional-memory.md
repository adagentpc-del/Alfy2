# ADR-0057: Institutional Memory

**Status:** Accepted
**Date:** 2026-06-25

## Context

Most of what an enterprise learns is lost: why a decision was made, which idea was rejected and why, how an
experiment turned out, what a vendor was actually like to work with. Without a durable record the platform
re-litigates settled questions and forgets hard-won lessons. The Memory Engine holds working context and the
Reflection Engine reviews periods; what is missing is an append-only ledger of the enterprise's consequential
history. This ADR adds it.

## Decision

Add an `institutional-memory/` ledger in `@alfy2/core` that records the enterprise's consequential history as
append-only entries. Deterministic, tenant-scoped.

### The nine record kinds

The ledger captures **nine record kinds**: **decision rationale, rejected idea, failed experiment, successful
experiment, negotiation outcome, lesson learned, vendor experience, client preference,** and **implementation
history**. Between them they cover the decisions, the dead ends, the experiments, the deals, and the lessons
that an enterprise otherwise forgets.

### Append-only

The ledger is **append-only** — records are **never edited or deleted**. A correction is a new record, not an
overwrite. This is what makes it trustworthy as memory: it reflects what was actually known and decided at the
time, not a tidied-up later version.

### Decision rationale and the question it answers

A `decision_rationale` record **must** record both **what_we_knew** and **why_chosen** — it exists to answer the
question "what did we know at the time, and why did we choose this?" A rationale missing either half is not a
rationale. `rationaleFor` returns the recorded rationale for a decision, so that question can always be
answered from the ledger.

### Relationship to neighbours

The ledger **complements** the **Memory Engine**, which holds live working context, and the **Reflection
Engine**, which reviews periods and emits lessons — institutional memory is the durable, append-only substrate
those lessons and decisions are written into and read back from.

### Contracts & data

`packages/shared/src/contracts/institutional-memory.ts`: `RecordKind`, `MemoryRecord`, `DecisionRationale`,
`MemoryQuery`. Migrations `0099`/`0100` add the append-only `institutional_memory` table + RLS. Smoke
`pnpm institutional:smoke`.

## Consequences

- The enterprise's consequential history is captured across nine record kinds and never lost — decisions,
  rejected ideas, experiments, negotiations, lessons, vendor and client experience, implementation history.
- The ledger is append-only: never edited or deleted, so it reflects what was actually known and decided.
- Every `decision_rationale` records what_we_knew and why_chosen, and `rationaleFor` answers "what did we know
  at the time, and why did we choose this?" on demand.
- It complements the Memory Engine and the Reflection Engine as the durable substrate they write into.
- Phase 2 writes rationale at decision points and surfaces `rationaleFor` in the Control Tower and Mission
  Control.
