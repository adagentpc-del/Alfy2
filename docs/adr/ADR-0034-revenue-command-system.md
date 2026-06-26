# ADR-0034: Revenue Command System

**Status:** Accepted
**Date:** 2026-06-25

## Context

Across many ventures, the question Alyssa needs answered constantly is "where's the money, and what's
the next money move?" The data exists — offers, pricing, pipeline, leads, conversion rates, campaigns,
cash opportunities, revenue goals — but it has to be turned into a clear answer.

## Decision

Add a `revenue/` command system in `@alfy2/core` that takes a business's revenue snapshot and computes
the things Alfy² must always know. Deterministic. Tenant-scoped.

### What it always knows

`intel(snapshot)` computes:

- **fastest path to cash** — the deal or cash opportunity with the highest expected value *per day*
  (value × probability ÷ days)
- **easiest offer to sell** — the highest-conversion offer
- **best lead source** — the highest conversion × volume
- **highest-ROI campaign** — the campaign with the top measured ROI
- **stuck deals** — deals idle beyond the threshold, largest first
- **next money action** — pull the fastest cash forward, or unstick the biggest stuck deal, or build pipeline

plus the weighted pipeline value against the revenue goal.

### Contracts & data

`packages/shared/src/contracts/revenue.ts`: `RevenueOffer`, `PipelineDeal`, `LeadSource`,
`RevenueCampaignPerf`, `CashOpportunity`, `RevenueProfileInput`, `RevenueIntel`. Migration 0058 adds the
immutable `revenue_intel` table (INSERT + SELECT) + 0059 RLS.

## Consequences

- "What's the next money move?" has a single computed answer per business, ranked by cash velocity, not
  gut feel.
- It composes the Conversion Engine (offer conversion), Campaign Intelligence (ROI), and the Follow-Up
  Engine (open follow-ups), and feeds the Executive Control Tower. Phase 2 sources the snapshot from live
  pipeline/CRM data and runs it on a cadence.
