# ADR-0123: Philosophy Library

**Status:** Accepted
**Date:** 2026-06-25

## Context

Principles that live only in a founder's head fade under pressure. Alyssa's operating philosophy — the maxims she
runs her life and businesses by — should be captured, revisable, and surfaced back to her so the principles stay
alive rather than forgotten the week after they are written.

## Decision

Add a `philosophy-library/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`add()`** captures a
philosophy, **`revise()`** updates it, and **`pin()`** marks the ones that matter most. **`todaysReminder()`**
returns a **deterministic daily** "Today's Reminder" — the same day always yields the same pinned principle, so the
reminder is a stable ritual, not a random quote. Philosophies are **mutable**. The invariant: **Today's Reminder is
deterministic for a given day.**

### Contracts & data

`packages/shared/src/contracts/philosophy-library.ts`: `Philosophy`, `TodaysReminder`, `AddPhilosophyInput`.
Migration `0193` stores `philosophies` (**mutable** — revised and re-pinned over time). Smoke `pnpm identity:smoke`.

## Consequences

- `add()` / `revise()` / `pin()` manage the library; `todaysReminder()` is deterministic per day.
- `philosophies` is mutable (`0193`).
- Composes the Institutional Memory ledger (ADR-0057) for provenance; surfaced alongside the Identity OS (ADR-0122)
  to keep both identity and principles present in daily use.
