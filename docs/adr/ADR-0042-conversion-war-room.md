# ADR-0042: Conversion War Room

**Status:** Accepted
**Date:** 2026-06-25

## Context

The conversation → conversion link in the mission chain is where copy is optimized: cold email, social
posts, landing pages, DMs, sales scripts, decks, proposals, checkout flows, and follow-up sequences. The
trap is optimizing for vanity metrics — opens and clicks — instead of money.

## Decision

Add a `war-room/` engine in `@alfy2/core`. It runs A/B tests on the nine surfaces, tracking the full
funnel, and recommends winners decided on revenue — never opens or clicks. Deterministic. Tenant-scoped.

### Full funnel, revenue-first winner

Each variant carries `FunnelMetrics`: sent, opens, replies, clicks, booked calls, qualified leads,
closes, negative replies, revenue, cash collected, time-to-conversion. The engine derives a `RateCard`
(open/reply/click/booked-call/close/negative-reply rates, revenue per send) — but the rates are read-outs,
not the decision. The winner is chosen by **revenue per send, then booked-call rate, then qualified-lead
rate**, and only once each variant has at least `MIN_SENDS_FOR_WINNER` (30) sends. A variant with a higher
open rate but lower revenue loses — proven in the smoke. Objections are logged per surface.

### Relationship to the Conversion Engine

The Conversion Engine (ADR-0032) decides A/B winners by revenue-per-unit and maintains per-business
conversion profiles. The War Room is the channel-level operations room that adds the full funnel-rate
stack (open/reply/click/booked/close, time-to-conversion, negative replies) and cross-surface winner
recommendations. Same revenue-first principle, different altitude.

### Contracts & data

`packages/shared/src/contracts/war-room.ts`: `WarRoomSurface` (9), `FunnelMetrics`, `RateCard`,
`WarRoomTest`, `StartWarRoomTestInput`, `RecordFunnelInput`. Migration 0074 adds `war_room_tests` + 0075
RLS.

## Consequences

- Copy is optimized for booked calls, qualified leads, and cash collected — the things that become
  revenue — with an explicit guard against vanity-metric winners.
- Decided tests feed the Sales Asset Generator (ship the winner) and the Revenue Factory. Phase 2 wires
  real channel analytics into `recordFunnel` and schedules the readout.
