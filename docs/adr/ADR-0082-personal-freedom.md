# ADR-0082: Personal Freedom Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

The whole point of this platform is to give Alyssa her freedom back — yet nothing in it actually measures whether
her freedom is increasing or quietly eroding. Founders drift into working more, not less, because each new
obligation looks small and no engine watches the total. And the easy way to buy freedom — cut the work — usually
costs performance, which is not freedom, it is decline. The leverage is in finding the moves that return time
*without* losing output: automation, delegation, agents, better workflows, batching. This ADR adds the Personal
Freedom Engine to measure the work/life balance and recommend only the freedom that preserves performance.

## Decision

Add a `personal-freedom/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It tracks **work vs life
hours**, computes a **freedom score**, and recommends automation, delegation, agent-creation, workflow-improvement,
and batching — where **every recommendation carries `preserves_performance: true`**.

### Track the hours, score the freedom

The engine tracks work hours against life hours and computes a **freedom score** from the balance — a single,
honest number for whether the platform is actually buying Alyssa her life back or just rearranging the work. The
score is the feedback loop: it makes "more freedom" measurable, so a month that felt busy can be checked against
whether freedom actually rose or fell.

### Freedom without losing performance

From the score the engine recommends the specific moves that return time — what to **automate**, what to
**delegate**, where to **create an agent**, which **workflow to improve**, what to **batch**. The non-negotiable
constraint is on every recommendation: **`preserves_performance` is always true**. The engine only proposes
freedom that does not cost output — it will not recommend dropping work that matters, only removing Alyssa from
work a system can do as well. The aim is to maximize life, not minimize effort: more freedom *without* losing
performance.

### Contracts & data

`packages/shared/src/contracts/personal-freedom.ts`: `WorkLifeHours`, `FreedomScore`, `FreedomRecommendation`,
`PersonalFreedomInput`, `PersonalFreedomResult`; every recommendation carries `preserves_performance: true`.
Migrations `0150`/`0151` store freedom scores and recommendations **append-only**, so the freedom trajectory is
preserved. Smoke `pnpm freedom:smoke`.

## Consequences

- The engine tracks work vs life hours and computes a freedom score — whether the platform is buying Alyssa her
  life back becomes a measurable number.
- It recommends automation, delegation, agent-creation, workflow-improvement, and batching, and every
  recommendation carries `preserves_performance: true` — more freedom without losing performance.
- Scores and recommendations are append-only (`0150`/`0151`), preserving the freedom trajectory.
- The engine optimizes for life, not effort, and feeds the Agent Factory, automation, and delegation paths.
- Phase 2 wires real time-tracking signal into the work/life inputs and routes recommendations into the Agent
  Factory.
