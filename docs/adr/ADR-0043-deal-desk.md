# ADR-0043: Deal Desk

**Status:** Accepted
**Date:** 2026-06-25

## Context

The conversion → cash link needs a single place where every live opportunity is tracked with full
context and ranked, so the next money move is never ambiguous and no deal dies from neglect.

## Decision

Add a `deal-desk/` engine in `@alfy2/core`. One record per opportunity, ranked by the chosen axis, with a
desk view that surfaces the next money move, the blocked deals, and the deals likely to die.
Deterministic. Tenant-scoped.

### The deal record and the ranking

A `Deal` carries buyer/contact, business, offer, deal size, probability, stage, next step, deadline,
objections, missing assets, follow-up status, decision maker, relationship notes, risk, days since
activity, projected close date, effort, and strategic value. `rank(by)` orders the open deals by
**probability, revenue, speed, strategic value, or effort** (or a composite that weights expected value
and strategic value and speed against effort and risk). Won/lost deals drop out of the open views.

### The three things it always shows

- **Next money move** — the next step on the top-ranked open deal.
- **Blocked deals** — open deals with missing assets or a standing objection.
- **Deals likely to die without action** — open deals at/above the risk threshold (default 0.6) or idle
  past the threshold (default 14 days).

### Relationship to neighbouring engines

It overlaps the Control Tower's `blocked_deals` and the Revenue Command System's `stuck_deals`, but the
Deal Desk is the dedicated, full-context deal record with the five-axis ranking and explicit dying-deal
detection. The others read summaries; the Desk owns the deals.

### Contracts & data

`packages/shared/src/contracts/deal-desk.ts`: `DealStage`, `Deal`, `CreateDealInput`, `DealRankBy`,
`RankedDeal`, `DealDeskView`. Migration 0076 adds `deals` + 0077 RLS.

## Consequences

- Every opportunity has one record and one obvious next move; nothing valuable goes idle unnoticed.
- It feeds the Execution Queue (next move), the Don't Drop the Ball System (dying deals), and the Control
  Tower. Phase 2 syncs deals from the CRM and recomputes ranking on a schedule.
