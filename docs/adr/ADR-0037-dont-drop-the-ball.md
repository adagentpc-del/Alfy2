# ADR-0037: Don't Drop the Ball System

**Status:** Accepted
**Date:** 2026-06-25

## Context

The quiet revenue killer is the dropped ball — a forgotten lead, a missed follow-up, an unfinished
launch, an unpaid invoice, an unsigned contract, an open loop that no one closed. These don't announce
themselves; they just go stale. Alfy² should detect them and put them back in front of Alyssa daily.

## Decision

Add a `dont-drop-ball/` engine in `@alfy2/core` that flags anything past a per-kind staleness threshold,
surfaces it daily, and — once approved — assigns an agent to close the loop. Deterministic. Tenant-scoped.

### Nine kinds, per-kind thresholds

It detects: **forgotten leads, missed follow-ups, unfinished launches, abandoned ideas, stale campaigns,
unpaid invoices, unsigned contracts, open loops, waiting-on responses.** Each kind has a staleness
threshold in days (e.g. missed_follow_up 3, forgotten_lead 7, unpaid_invoice 30). `scan(candidates)`
flags anything whose last activity is older than its threshold; fresh items are left alone. Re-scanning
**upserts by signature**, so the same ball is never flagged twice, and assigned/closed status is kept.

### Surface and close

`surfaceDaily()` returns the open dropped items ranked by value then age. Each carries a recommended
action to close it. `assign(id, agent)` is the approved action — it sets the item assigned to an agent;
`close` and `dismiss` resolve it.

### Contracts & data

`packages/shared/src/contracts/dont-drop-ball.ts`: `DroppedKind`, `DroppedItem`, `BallCandidate`,
`ScanInput`. Migration 0064 adds `dropped_items` + 0065 RLS.

## Consequences

- Nothing valuable goes cold silently — the daily surface is the safety net, ranked so the biggest balls
  get attention first.
- It's approval-gated: detection is automatic, but an agent is only assigned to close a loop once
  approved. It pairs with the Follow-Up Engine (which runs the actual sequence) and feeds the Execution
  Queue. Phase 2 wires `scan` to live data (CRM, inbox, invoicing) and runs it daily.
