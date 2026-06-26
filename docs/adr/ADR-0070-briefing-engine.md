# ADR-0070: Briefing Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

The intelligence is assembled, the money picture is computed, the day's priorities are ranked — but an executive
reads on a rhythm, not all at once. She wants the right cut of all of it at the right moment: what matters this
morning, what to learn at lunch, what to close out tonight, and where the week is heading. This ADR adds the
Briefing Engine: one engine that produces four time-of-day briefings from labeled inputs, each shaped to its
moment.

## Decision

Add a `briefings/` engine in `@alfy2/core` that produces four briefings — morning, lunch, evening, and weekly —
from labeled inputs. Deterministic, tenant-scoped. One engine, four kinds, each with its own greeting,
section set, and estimated reading time.

### Four briefings, one engine

The **morning** briefing (~5 minutes) runs the day's lanes: **priorities, revenue, follow-ups, blocked items,
calendar, news lanes, and agent recommendations.** The **lunch** briefing is a learning and intelligence
update — **top reads, why they matter, and the action** each implies. The **evening** briefing **closes the
day**: **wins, money, and what didn't move**, followed by **seven questions**, and it **saves the reflections to
Institutional Memory** so the day's lessons are never lost. The **weekly** briefing is a strategic intelligence
report. Each briefing opens with a **greeting** matched to its kind, builds its **sections from labeled
inputs**, and reports an **estimated reading time.**

### Composed from the platform's signals

The Briefing Engine is an assembler, not an oracle: it composes the priorities, revenue, follow-up, and
intelligence signals the rest of the platform already produces, and arranges them per kind. The evening
briefing's write-back to Institutional Memory is the one place a briefing leaves a durable trace — reflections
become permanent record rather than a screen that scrolls away.

### Contracts & data

`packages/shared/src/contracts/briefings.ts`: `BriefingKind`, `BriefingSection`, `Briefing`, `BriefingInput`,
`EveningReflection`. Migrations `0123`/`0124` store generated briefings **append-only**, so each day's briefings
are preserved as a record. Smoke `pnpm briefing:smoke`.

## Consequences

- One engine produces four briefings: morning (the day's lanes, ~5 min), lunch (a learning/intelligence update),
  evening (close the day — wins/money/what-didn't-move plus seven questions), and weekly (strategic
  intelligence).
- Each briefing has a greeting matched to its kind, sections built from labeled inputs, and an estimated reading
  time.
- The evening briefing saves its reflections to Institutional Memory, so the day's lessons become permanent
  record.
- Briefings are append-only (migrations `0123`/`0124`).
- Phase 2 schedules the four briefings on their cadence and pulls the Executive Intelligence Network, finance,
  and priority signals as their labeled inputs.
