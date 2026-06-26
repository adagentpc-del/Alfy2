# ADR-0119: Executive Operating Manual

**Status:** Accepted
**Date:** 2026-06-25

## Context

The enterprise needs one assembled manual that says how Alfy² is run — the rhythm, the rules, the engines, the
gates — and that flags itself when it goes stale. Scattered docs answer "how does X work?"; nothing answers "how is
the whole thing operated, and is that description still true?"

## Decision

Add an `exec-operating-manual/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`assemble()`** composes the
existing **Operating Manual Generator** (ADR-0055) over the OS itself to produce the Executive Operating Manual, and
reports **staleness** — which sections are out of date relative to their source engines. The invariant: **the manual
always declares its own freshness**; an assembled manual that references changed engines is flagged stale rather
than silently wrong. A **read model**.

### Contracts & data

`packages/shared/src/contracts/exec-operating-manual.ts`: `ManualSection`, `ExecutiveOperatingManual`,
`StalenessFlag`. No migration — composes the Operating Manual Generator over a read model. Smoke `pnpm meta:smoke`.

## Consequences

- `assemble()` produces the Executive Operating Manual and flags stale sections.
- Read model — no migration; composes the Operating Manual Generator (ADR-0055).
- Documents the Operating Rhythm (ADR-0118) and the Infinite Loop (ADR-0120); read against the Ultimate Design Rule
  (ADR-0121) to confirm every documented engine still belongs.

## Revision (2026-06-25) — persistence added
- The assembled `ExecutiveOperatingManualDoc` (id / tenant_id / created_at) is now persisted as an **append-only**
  snapshot via migration `0196` (`executive_operating_manuals`), so the manual's history over time is durable. The
  engine stays a read-model over live sources; this only records each assembly. Contracts unchanged. Building on top
  of the existing system rather than replacing it.
