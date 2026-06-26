# ADR-0044: Follow-Up Autopilot (extends the Follow-Up Execution Engine)

**Status:** Accepted
**Date:** 2026-06-25

## Context

The Follow-Up Execution Engine (ADR-0033) already keeps an approved sequence going until a response
arrives, the goal is reached, the sequence completes, a risk appears, or Alyssa pauses it. The mission
brief for "Follow-Up Autopilot" adds two success outcomes (a meeting booked, a deal closed) and one
operating rule: **escalate only when human judgment is needed.** This is an extension, not a new engine.

## Decision

Extend the existing engine and contract rather than duplicate them.

### New stop signals and the escalation path

`FollowUpSignal` gains `meeting_booked`, `deal_closed`, `needs_human`, and `escalation_reason`. In
`advance()`, the priority order is now: **needs_human → escalated** (hands off to Alyssa with the reason);
then response_received → stopped; **meeting_booked → completed**; **deal_closed → completed**;
goal_reached → completed; risk → stopped; sequence exhausted → completed. Escalation wins over every
other signal — that is the whole point: the autopilot only stops for a human when judgment is genuinely
required, and otherwise keeps going.

A new `escalated` status and `escalation_reason` field record the hand-off, and `escalated()` lists the
follow-ups waiting on Alyssa — the only ones that need her.

### Contracts & data

`packages/shared/src/contracts/follow-up.ts`: `FollowUpStatus` gains `escalated`; `FollowUpStopReason`
gains `meeting_booked`, `deal_closed`, `escalated`; `FollowUp` gains `escalation_reason`; `FollowUpSignal`
gains the four fields above. Migration 0078 alters `follow_ups` (adds `escalation_reason`, widens the
`status` and `stop_reason` CHECK constraints). The Python mirror and the original follow-up test stay
green.

## Consequences

- Alyssa never loses money to dropped follow-up and is interrupted only when her judgment is actually
  needed; booked meetings and closed deals now register as the wins they are.
- The escalation queue feeds the Executive Inbox / Control Tower review surfaces. Phase 2 wires real
  channel signals (replies, calendar bookings, deal-stage changes) into `advance()`.
