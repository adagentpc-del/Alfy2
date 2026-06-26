# ADR-0033: Follow-Up Execution Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Follow-up is where most revenue leaks: a lead, a warm contact, a deal, a vendor, an investor goes cold
because no one remembered to follow up. Alyssa's follow-up should never depend on her memory or energy.

## Decision

Add a `follow-up/` engine in `@alfy2/core` that tracks everything that needs following up and runs
sequences on autopilot after approval. Deterministic. Tenant-scoped. It mirrors the approval-then-
autopilot pattern of Campaign Intelligence.

### Tracks nine kinds

leads, warm contacts, deals, vendors, investors, clients, partners, unanswered emails, stale
opportunities. `create` builds a follow-up with a default cadence (24h / 3d / 7d / 14d / 30d) if no
sequence is supplied, and starts it **pending approval** (the approval queue).

### Keeps going until a stop fires

After `approve`, `advance(signal)` keeps the sequence running unless a stop condition fires, in priority
order: a **response arrives** (stopped: response_received), the **goal is reached** (completed:
goal_reached), a **risk appears** (stopped: risk), or the **sequence is exhausted** (completed:
sequence_completed). `pause` is Alyssa's stop. `dueForTouch` is the reminders worklist; `pendingApproval`
is the approval queue; `reactivate` restarts a completed follow-up (a reactivation campaign).

### Contracts & data

`packages/shared/src/contracts/follow-up.ts`: `FollowUpEntityKind`, `FollowUp`, `SequenceStep`,
`CreateFollowUpInput`, `FollowUpSignal`. Migration 0056 adds `follow_ups` + 0057 RLS.

## Consequences

- No opportunity goes cold for lack of follow-up — the cadence runs itself, and only stops for the four
  named reasons or a pause.
- It's approval-gated and risk-aware, so it never becomes spammy or runs through a problem. Phase 2 wires
  `advance` to real inbound signals and runs `dueForTouch` on a schedule.
