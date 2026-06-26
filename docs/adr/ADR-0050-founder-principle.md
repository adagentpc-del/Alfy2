# ADR-0050: Founder Operating Principle

**Status:** Accepted
**Date:** 2026-06-25

## Context

Everything Alfy² does serves one doctrine: **convert speed of thought into speed of execution, and never let
an idea die in notes.** The platform has many engines, but it needs one principle that governs all of them —
a rule that guarantees an idea always becomes *something*, that every business always knows its next moves,
and that the whole system shares one priority order. This ADR encodes that doctrine as a small, deterministic
engine the rest of the platform serves.

## Decision

Add a `founder-principle/` engine in `@alfy2/core`. It routes ideas to dispositions, guarantees a standing set
of next actions per business, and publishes the system-wide priority order. Deterministic, tenant-scoped.

### Routing — nothing stays in notes

`route()` resolves **every** idea to exactly one of eight dispositions: **task, asset, campaign, offer, agent,
workflow, parked_idea, or killed_idea**. It always returns one. An idea can be parked or killed — but those
are decisions, not the absence of one. Nothing sits unresolved in notes, which is the entire point of the
principle.

### Guaranteed next actions

`nextActions()` guarantees that every business always has its **five next actions** — a **money** action, a
**risk** action, a **follow-up** action, an **asset** action, and a **conversion** action. Where the business
has not supplied one, the engine fills the blank with a sensible default, so no business is ever without a
concrete answer to "what's next."

### The optimization order

`OPTIMIZATION_ORDER` is the system-wide priority every engine defers to:
**cash > conversion > follow_up > risk_control > execution_speed > founder_energy > reusable_ip.** When two
things compete, this order decides. It is the doctrine made into a list.

### Contracts & data

`packages/shared/src/contracts/founder-principle.ts`: `IdeaDisposition`, `IdeaRouting`, `NextActionKind`,
`NextAction`, `OptimizationPriority`. Migrations `0087`/`0088` add `idea_routings` + RLS.

## Consequences

- The platform has an explicit operating doctrine: ideas always resolve, businesses always have five next
  moves, and one priority order arbitrates conflicts everywhere.
- It is the principle the other engines serve — the Revenue Factory, the War Room, Follow-Up Autopilot, the
  Deal Desk and the rest all line up behind cash → conversion → follow-up → risk → speed → energy → IP.
- Phase 2 wires `route()` into the Executive Inbox so every captured thought is dispositioned on entry, and
  `nextActions()` into the Control Tower so the five moves are always on the dashboard.
