# ADR-0058: Executive Mission Control

**Status:** Accepted
**Date:** 2026-06-25

## Context

The Control Tower (ADR-0027) gives the operator a faithful snapshot of where things stand. But the executive
question is narrower and sharper: on one screen, is the enterprise healthy, what needs me, and what is the one
thing that matters most right now? That needs a composite that goes beyond the operator snapshot — adding
system and automation health, AI cost and ROI, and a single computed headline. This ADR adds Mission Control as
that one-screen executive view.

## Decision

Add a `mission-control/` engine in `@alfy2/core` that assembles the one-screen executive dashboard as a read
model. Deterministic, tenant-scoped.

### What the screen shows

Mission Control assembles **enterprise and company health** (scored, with labels), **revenue, pipeline, cash,
runway, goals, blocked items, risks, approvals, top opportunities**, **agent / automation / system health**,
**AI costs, ROI**, and **daily priorities**. It is the whole executive picture composited onto one screen.

### The single headline

From all of that it computes **one headline** by a fixed priority: **urgent runway → approvals → risks →
blocked → today's first priority.** Whatever is most pressing under that order becomes the single line the
executive reads first. The headline is the point of the screen — one computed answer to "what matters most right
now."

### A read model, and its relationship to the Control Tower

Mission Control is a **read model** — it composites existing state and computes the headline; it holds no state
of its own, so there is **no migration**. It composes the **Control Tower** (ADR-0027), the **Cost CFO**
(ADR-0047), and **Agent Observability** (ADR-0020). The distinction from the Tower is deliberate: the **Tower is
the operator snapshot**; **Mission Control is the one-screen executive composite** that adds system and
automation health, AI cost, and the single computed headline on top of it.

### Contracts & data

`packages/shared/src/contracts/mission-control.ts`: `HealthScore`, `MissionControlInput`, `MissionControlView`,
`Headline`. There is **no migration** — it is a read model that composites existing state. Smoke
`pnpm mission:smoke`.

## Consequences

- The executive has one screen: enterprise and company health, revenue, pipeline, cash, runway, goals, blocked
  items, risks, approvals, opportunities, agent/automation/system health, AI cost and ROI, and daily priorities.
- A single headline is computed by a fixed order — urgent runway → approvals → risks → blocked → today's first
  priority — so the most pressing thing is always the first line read.
- It is a read model composing the Control Tower, Cost CFO, and Agent Observability, and adds no migration.
- It is distinct from the Control Tower: the Tower is the operator snapshot, Mission Control the executive
  composite with system/automation health, AI cost, and the headline.
- Phase 2 renders Mission Control as the default executive landing screen.
