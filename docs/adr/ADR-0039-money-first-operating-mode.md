# ADR-0039: Money-First Operating Mode

**Status:** Accepted
**Date:** 2026-06-25

## Context

When cash is the priority, the founder's energy needs to go to the things that move money — not
branding polish, perfectionism, or research that never turns into action. Alyssa wants a mode she can
flip on that makes the whole system bias toward cash.

## Decision

Add a `money-first/` mode in `@alfy2/core`. When activated for a tenant, it classifies work items and
reorders work so cash-moving activities rise and non-money work sinks; when off, it passes work through
unchanged. Deterministic. Tenant-scoped.

### Prioritize / deprioritize

When active, it **prioritizes** the nine money-aligned focuses — cash collection, sales, follow-up,
booked calls, proposals, invoices, high-conversion content, warm relationships, low-friction offers —
and **deprioritizes** the five drains — perfection, branding polish, unnecessary features,
low-conversion ideas, research without action. `classify(item)` matches a work item's title/category
against keyword lexicons and returns `prioritize`, `deprioritize`, or `neutral` with the matched
category and a reason.

### Reorder, with a pass-through when off

`prioritize(items)` reorders a work list as **prioritize → neutral → deprioritize** when the mode is
active. When the mode is off, it returns the items unchanged (a pass-through) — the mode only reshapes
priority while it's switched on.

### Contracts & data

`packages/shared/src/contracts/money-first.ts`: `MoneyFocus`, `MoneyDepriority`, `MoneyClassification`,
`MoneyFirstState`, `WorkItem`, `ClassifiedItem`. Migration 0068 adds `money_first_mode` (one state row
per tenant) + 0069 RLS.

## Consequences

- A single switch reshapes the whole system's priorities toward cash, with an explicit, explainable rule
  for why each item rises or sinks — and a clean off-state that changes nothing.
- It's the natural front-end to the Execution Queue: in money-first mode, the queue's revenue and
  follow-up tiers dominate. Phase 2 wires the mode into the queue's ranking and the Control Tower's
  top-priorities so activating it visibly reshuffles what Alfy² puts in front of Alyssa.
