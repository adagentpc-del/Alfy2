# ADR-0125: Vision Builder

**Status:** Accepted
**Date:** 2026-06-25

## Context

"I have an idea…" should open a collaborative thinking session, not a build. The Idea Builder (ADR-0008) already
turns an idea into a structured workup; the Vision Builder is the conversational front of that — it thinks *with*
Alyssa, shapes the idea into plans, and stops at the gate. Like the Idea Builder, it never begins building on its
own.

## Decision

Add a `vision-builder/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`build()`** is triggered by "I have
an idea…" and runs a **collaborative thinking session** that generates plans, **composing the Idea Builder**
(ADR-0008) for the structured workup. The invariant: **`awaiting_approval` is always true** — the session produces
plans, never built artifacts; nothing proceeds until the founder approves.

### Contracts & data

`packages/shared/src/contracts/vision-builder.ts`: `VisionTrigger`, `VisionSession`, `VisionPlan` (with
`awaiting_approval`). Migration `0195` stores `vision_sessions` **append-only**. Smoke `pnpm identity:smoke`.

## Consequences

- `build()` turns "I have an idea…" into collaborative plans; `awaiting_approval` is always true.
- Sessions are append-only (`0195`); composes the Idea Builder (ADR-0008).
- The idea-shaped sibling of the Conversation Engine (ADR-0124); both keep the human in command, nothing built
  without approval.
