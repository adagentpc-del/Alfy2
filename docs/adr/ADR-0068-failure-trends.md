# ADR-0068: Failure Database + Future Trends Lab

**Status:** Accepted
**Date:** 2026-06-25

## Context

Two kinds of knowledge protect a founder that nothing else does: a permanent memory of how things have failed,
and an early read on where the world is going. Most operations forget their failures within a quarter and react
to trends only once everyone else has. This ADR adds two companion engines — the Failure Database, which makes
failure permanent institutional knowledge, and the Future Trends Lab, which prepares Alyssa for what is coming
before her peers see it.

## Decision

Add a `failure-database/` engine and a `future-trends/` engine in `@alfy2/core`. Deterministic, tenant-scoped.
One remembers what went wrong so it is never repeated; the other watches what is coming so Alyssa is ready
first.

### Failure Database — failure as permanent knowledge

The Failure Database tracks **nine failure kinds** as permanent institutional knowledge. Each record captures
**what happened**, the **timeline**, **why**, the **root cause**, the **warning signs**, the **lessons**, and
**how Alfy² avoids repeating it.** The point is not a post-mortem filed and forgotten — it is a standing memory
the platform consults so the same mistake, with the same warning signs, is caught the next time it begins to
form. Records are append-only: a failure is never edited away.

### Future Trends Lab — ready before everyone else

The Future Trends Lab tracks trends across a **six-month to ten-year** horizon. Each trend carries a
**likelihood**, an **impact**, the **affected industries and businesses**, the **preparation steps**, the
**skills and technology needed**, the **investments**, the **threats**, and a **readiness score** computed as
**likelihood × impact.** The readiness score sorts the noise: it pushes the high-likelihood, high-impact trends
to the front so preparation starts early. Trends are mutable, because a trend's likelihood and impact change as
the world does.

### Contracts & data

`packages/shared/src/contracts/failure-trends.ts`: `FailureKind`, `FailureRecord`, `Trend`, `TrendHorizon`,
`ReadinessScore`, `FailureInput`, `TrendInput`. Migrations `0119`/`0120` store failures **append-only**;
migrations `0121`/`0122` store trends as **mutable** records. Smoke `pnpm failuredb:smoke` and
`pnpm trends:smoke`.

## Consequences

- Failure becomes permanent institutional knowledge: nine failure kinds, each with what happened, timeline, why,
  root cause, warning signs, lessons, and how Alfy² avoids repeating it.
- Trends are tracked over six months to ten years with likelihood, impact, affected industries/businesses,
  preparation steps, skills/tech needed, investments, threats, and a readiness score (likelihood × impact) that
  ranks them.
- Failures are append-only (`0119`/`0120`); trends are mutable (`0121`/`0122`) because they evolve.
- Together they give Alyssa a memory of the past and a head start on the future — repeating no mistake and
  preparing before everyone else.
- Phase 2 feeds failure warning-signs into risk scoring and trend readiness into the briefing engine and
  intelligence lenses.
