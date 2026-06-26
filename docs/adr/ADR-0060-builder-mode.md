# ADR-0060: Builder Mode

**Status:** Accepted
**Date:** 2026-06-25

## Context

"I want to build" is the moment a founder commits to a new venture, and it deserves more than a task list. It
needs the complete operating system of a business worked out in advance — the market, the offer, the model, the
architecture, the legal, the launch — so the founder approves a real plan, not a stub. The Idea Builder
(ADR-0008) works up an idea and the Business Template (ADR-0006) frames a business; Builder Mode composes them
into a full venture build, and keeps the human in command. This ADR adds it.

## Decision

Add a `builder-mode/` engine in `@alfy2/core` that, on the trigger phrase, produces the complete venture
operating system and returns it for approval before anything is built. Deterministic, tenant-scoped.

### The trigger and the eighteen stages

`BUILDER_TRIGGER = "I want to build"` is the phrase that starts it. `build()` produces the **eighteen-stage**
venture operating system: **discovery, market validation, offer design, pricing, business model, brand, product
architecture, technical architecture, database, agent plan, asset checklist, legal, marketing plan, sales plan,
automation plan, launch plan, KPIs,** and **review checkpoints.** Each stage carries a **title, a summary,
items,** and **open questions** — it is the worked-out operating system of the venture, not a list of tasks.

### Human in command

Builder Mode never builds on its own. `build()` always returns **`awaiting_approval`**; **nothing is built until
`approve()`** is called. This is Principle 1 made mechanical — the human remains in command, and the full plan is
presented for a decision before any of it is acted on.

### Composition

It composes the **Idea Builder** (ADR-0008) for the idea workup and the **Business Template** (ADR-0006) for the
business framing, assembling them into the eighteen-stage build rather than reimplementing either.

### Contracts & data

`packages/shared/src/contracts/builder-mode.ts`: `BuildStageKind`, `BuildStage`, `VentureBuild`, `BuildStatus`.
Migrations `0103`/`0104` add the `venture_builds` table + RLS. Smoke `pnpm builder:smoke`.

## Consequences

- The trigger "I want to build" produces the complete eighteen-stage venture operating system — discovery
  through review checkpoints — each stage with a title, summary, items, and open questions, not just tasks.
- Builder Mode is human-in-command: `build()` always returns `awaiting_approval` and nothing is built until
  `approve()`, making Principle 1 mechanical.
- It composes the Idea Builder and Business Template rather than duplicating them.
- Phase 2 wires the trigger into the Executive Inbox and routes an approved build into the execution engines.
