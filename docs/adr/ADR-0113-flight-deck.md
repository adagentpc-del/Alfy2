# ADR-0113: Executive Flight Deck

**Status:** Accepted
**Date:** 2026-06-25

## Context

A dashboard that shows everything shows nothing — it asks the founder to scan, interpret, and decide what matters,
which is exactly the cognitive load Alfy² exists to remove. The replacement is not a prettier dashboard; it is a
flight deck that shows **only the sections that would change a decision** and stays silent about the rest.

## Decision

Add a `flight-deck/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`assemble()`** builds the Executive
Flight Deck as a **read model**, including a section **only when its content is decision-changing** (a runway
cliff, an approval blocking revenue, a risk crossing threshold) and omitting steady-state sections entirely. The
invariant: **no section appears unless it changes what Alyssa would do today.** It replaces the dashboard concept;
it presents, it never acts.

### Contracts & data

`packages/shared/src/contracts/flight-deck.ts`: `FlightDeckSection`, `FlightDeck`, `AssembleFlightDeckInput`. No
migration — a read model over existing engines. Smoke `pnpm meta:smoke`.

## Consequences

- `assemble()` returns only decision-changing sections; steady-state is omitted, not greyed out.
- Read model — no migration.
- Replaces the dashboard; composes Mission Control (ADR-0058) and the Control Tower (ADR-0027) as inputs, filtering
  their output to the decision-changing minimum.
