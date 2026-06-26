# ADR-0101: Revenue Truth System

**Status:** Accepted
**Date:** 2026-06-25

## Context

The most expensive lie a founder tells is to herself: mistaking activity for revenue. Booked calls and busy
pipelines feel like progress, but only cash collected is cash. A dashboard that elevates activity to the top
manufactures false confidence and hides the deals that have quietly died. The leverage is an honest ladder that
ranks commitment from idea to cash and refuses to treat motion as money. This ADR adds the Revenue Truth System.

## Decision

Add a `revenue-truth/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`report()`** places
every deal on a nine-rung honest ladder and returns a `RevenueTruthReport` that prioritizes cash first.

### The honest ladder — cash first

The ladder runs weakest → strongest commitment: **idea, lead, warm_lead, qualified, proposal, verbal_yes, signed,
invoice_sent, cash_collected.** The dashboard prioritizes **cash collected, then signed contracts, then invoices
sent, then qualified pipeline, then booked calls** — never the other way around. The invariant: **activity is not
revenue.** A deal idle past `stalled_after_days` is flagged as stalled, so the report distinguishes real momentum
from a pipeline that only looks busy.

### Contracts & data

`packages/shared/src/contracts/revenue-truth.ts`: `RevenueStage`, `TruthDeal`, `RevenueTruthInput`,
`RevenueTruthReport`. Migration `0178_revenue_truth_reports.sql` (append-only `revenue_truth_reports`). Smoke `pnpm capstone:smoke`.

## Consequences

- Deals sit on a **9-rung honest ladder**; the report prioritizes cash collected over signed over invoiced over
  qualified over booked.
- Activity is never counted as revenue, and idle deals are flagged as stalled.
- Migration `0178_revenue_truth_reports.sql` (append-only `revenue_truth_reports`).
- Phase 2 feeds the report into the Million-Dollar Sprint Engine and the Board Packet's cash section.
