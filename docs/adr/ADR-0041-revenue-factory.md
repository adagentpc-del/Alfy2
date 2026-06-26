# ADR-0041: Revenue Factory

**Status:** Accepted
**Date:** 2026-06-25

## Context

Goals, assets, contacts, and ideas only matter if they turn into money. Alyssa needs a per-business
cockpit that, every day, answers one question: "what do we do today to make money?"

## Decision

Add a `revenue-factory/` engine in `@alfy2/core`. `report()` takes a per-business snapshot — offers,
pricing, buyers, warm/cold leads, referral sources, proposals, follow-ups, booked calls, revenue — and
computes the daily money directive. Deterministic. Tenant-scoped.

### What it always identifies

- **Fastest path to cash** — the highest expected-value move available now (best proposal by value ×
  probability, or the best warm contact's expected value).
- **Easiest offer to sell** — highest ease, tie-broken by conversion.
- **Offer most likely to convert** — highest historical conversion rate (distinct from easiest).
- **Best warm contact** — warm lead with the highest affinity × potential value.
- **Lowest-effort revenue action** — the follow-up with the least effort.
- **Highest-value follow-up** — the follow-up with the most value at stake.
- **Today's money move** — the single headline answer, the highest-leverage of the above.

It also rolls up warm/cold lead counts, referral-source count, and open proposal value.

### Relationship to the Revenue Command System

The Revenue Command System (ADR-0034) answers the cross-pipeline "where's the money" at the venture
level. The Revenue Factory is the per-business daily cockpit that adds the lead-temperature, warm-contact,
referral-source, and "what do we do today" framing. They compose; the Factory is the daily driver.

### Contracts & data

`packages/shared/src/contracts/revenue-factory.ts`: `FactoryOffer`, `FactoryContact`, `FactoryProposal`,
`FactoryFollowUp`, `RevenueFactoryInput`, `RevenueFactoryReport`. Migration 0072 adds the append-only
`revenue_factory_reports` snapshot table + 0073 RLS (SELECT/INSERT only).

## Consequences

- Every business has one daily directive that points straight at cash, computed from real pipeline data
  rather than vibes.
- It feeds the Execution Queue's revenue tier and the Control Tower's top priorities. Phase 2 sources the
  snapshot from CRM, invoicing, and the Follow-Up engine and runs the report on a daily schedule.
