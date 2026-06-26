# ADR-0053: Reflection Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alfy² acts continuously, but acting is not the same as learning. Without a standing review the platform repeats
mistakes, lets opportunities slip, and never decides what to automate or retire. The enterprise needs a periodic
reflection — weekly, monthly, quarterly, yearly — that looks back honestly and produces the next period's
priorities. This ADR adds that engine and makes its output the institutional memory of how the platform has
performed over time.

## Decision

Add a `reflection/` engine in `@alfy2/core` that runs a structured review over a period and emits lessons,
improvements, and priorities. Deterministic, tenant-scoped.

### What a review evaluates

A review spans one of four cadences — **weekly, monthly, quarterly, yearly** — and evaluates revenue, missed
opportunities, follow-up failures, automation and agent performance, workflow bottlenecks, time, energy,
decision quality, and goal progress. It is the whole operating picture looked at deliberately rather than in the
moment.

### What a review produces

From that evaluation it generates **lessons**, **improvements**, **workflows to automate or retire**, **new
agents** worth standing up, **risks**, and the **next-period priorities**. The output is not a report to be
filed but a set of decisions for the period ahead — what to fix, what to automate, what to stop.

### Institutional memory over time

Reviews accumulate in `history`. The append-only record of past reviews is how Alfy² remembers its own
trajectory — what it learned each period and whether it acted on it — making reflection cumulative rather than
disposable. It composes the Pattern Engine (behavioral signals) and Workflow ROI Tracking (which workflows earn
their keep) to ground its judgments in observed data.

### Contracts & data

`packages/shared/src/contracts/reflection.ts`: `ReviewCadence`, `ReviewInput`, `ReviewFinding`, `Reflection`,
`ReflectionHistory`. Migrations `0091`/`0092` add the append-only `reflections` table + RLS. Smoke
`pnpm reflection:smoke`.

## Consequences

- The platform has a standing review at four cadences that turns activity into lessons, improvements, and the
  next period's priorities, instead of repeating mistakes silently.
- Reviews are append-only (`history`), so reflection accumulates into institutional memory rather than being
  overwritten each period.
- It composes the Pattern Engine and Workflow ROI Tracking, grounding its findings in observed behavior and
  measured workflow value.
- Phase 2 schedules reflections on their cadence and feeds their priorities into the Goal Engine and Mission
  Control.
