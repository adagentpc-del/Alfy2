# ADR-0094: Life Logistics Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Most of what consumes a founder's attention is not strategy — it is the logistics of life: what to pack, when to
leave, who feeds the pet, the follow-up no one remembered to send. Each item is small; together they are a tax on
the mind. The leverage is to detect a future event and auto-generate its entire preparation so Alyssa never has to
remember any of it. This ADR adds the Life Logistics Engine to turn an event into its checklists, calendar blocks,
reminders, and follow-ups.

## Decision

Add a `life-logistics/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`plan()`** takes a
detected event and produces a `LogisticsPlan` — checklists by category, calendar blocks, scheduled reminders, and
follow-ups — and **`add()`** stores it.

### Event → full preparation

From an event's shape (overnight / travel / networking / has_pet) the engine generates **checklists across up to
nineteen prep categories** (packing, travel, transportation, hotel, pet_care, medication, supplements, clothing,
weather, documents, charging, gifts, business_materials, presentation_materials, networking, reservations,
tickets, follow_up, recovery), **calendar blocks**, and a standing cadence of **reminders** — night-before,
two-hours-before, and after-event — plus **decompression/recovery time** and **follow-ups**. The invariant: a
detected event yields a complete preparation plan, so the event arrives prepared without Alyssa holding any of it.

### Contracts & data

`packages/shared/src/contracts/life-logistics.ts`: `PrepCategory`, `DetectEventInput`, `Checklist`,
`ScheduledReminder`, `LogisticsCalendarBlock`, `LogisticsPlan`. Migration `0173` stores logistics plans
**append-only**. Smoke `pnpm capstone:smoke`.

## Consequences

- A detected event auto-generates checklists (**19 categories**), calendar blocks, a night-before / two-hours-before
  / after-event reminder cadence, decompression time, and follow-ups.
- Logistics that used to live in Alyssa's head are owned by the system — directly serving the L0 directive.
- Plans are append-only (`0173`).
- Phase 2 feeds the Cognitive Offloading Engine's detected events into `plan()` and writes reminders to the calendar.
