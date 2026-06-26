# ADR-0106: Founder Nervous System Protection

**Status:** Accepted
**Date:** 2026-06-25

## Context

The single point of failure in a solo-founder company is the founder. Burnout is not a wellness footnote — it is an
**enterprise risk**, because when the founder's nervous system overloads, execution stops. The platform optimizes
for freedom and peace of mind, which means it must watch the founder's load as carefully as it watches cash, and
intervene before overload becomes collapse — without slowing execution. This ADR adds Founder Nervous System
Protection.

## Decision

Add a `nervous-system/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`assess()`** reads
the founder's load signals and returns a `NervousSystemReport` with a status and protective recommendations.

### Burnout is an enterprise risk

The engine tracks **cognitive and emotional load, meeting density, decision fatigue, repetitive work, conflict
exposure, sleep/energy, and unresolved stress loops**, computes a status (ok / elevated / high / critical), and
recommends one of **delegate / delay / batch / automate / cancel / simplify / escalate / convert-to-checklist**.
The invariant: it **protects the founder while preserving execution speed** — every recommendation relieves load
without dropping output, treating founder capacity as a resource to defend, not a soft metric to admire.

### Contracts & data

`packages/shared/src/contracts/nervous-system.ts`: `NervousSystemInput`, `NervousAction`, `NervousRecommendation`,
`NervousSystemReport`. Migration `0183_nervous_system_reports.sql` (append-only `nervous_system_reports`). Smoke `pnpm capstone:smoke`.

## Consequences

- Founder load is tracked across cognitive/emotional load, meeting density, decision fatigue, repetitive work,
  conflict, sleep/energy, and stress loops, with an ok / elevated / high / critical status.
- Recommendations relieve load (delegate / delay / batch / automate / cancel / simplify / escalate /
  convert-to-checklist) while preserving execution speed — burnout treated as enterprise risk.
- Migration `0183_nervous_system_reports.sql` (append-only `nervous_system_reports`).
- Phase 2 feeds the report into the Risk Register (health_energy) and the Relaxation Outcome engine.
