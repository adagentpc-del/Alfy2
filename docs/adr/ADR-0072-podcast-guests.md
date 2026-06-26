# ADR-0072: Podcast Guest Booking Agent

**Status:** Accepted
**Date:** 2026-06-25

## Context

A show is only as good as its guests, and booking them is real work: finding the right people, judging fit,
reaching out, tracking replies, and getting them on the calendar — in both directions, because Alyssa being a
guest on other shows is as valuable as hosting. The one thing that must never happen automatically is the
outreach itself: the platform cannot email a prospective guest in Alyssa's name without her say-so. This ADR
adds the Podcast Guest Booking Agent, which mines and ranks candidates and drafts outreach, but contacts no one
until outreach is approved.

## Decision

Add a `podcast-guests/` engine in `@alfy2/core` that sources, ranks, and books podcast guests in both
directions, with a hard approval gate on contact. Deterministic, tenant-scoped.

### Source, rank, draft, track

The agent mines **contacts and external experts**, then ranks them by a **weighted composite** of
**relevance, credibility, audience fit, and business value.** For the top candidates it **drafts the
outreach**, **tracks replies**, and **schedules** the booking. It runs **both directions** — `inbound_guest`
(bringing a guest onto "Decoded with Alyssa DelTorre") and `outbound_appearance` (booking Alyssa onto someone
else's show) — so the same engine grows the show and grows Alyssa's reach.

### Never contacts without approval

The hard rule: the agent **never contacts anyone until the outreach is approved**, or a persistent approval
already covers it. This is enforced mechanically — **`markContacted` throws** if it is called without that
approval. The agent may research, rank, and draft as aggressively as it likes; the moment of reaching out to a
real person in Alyssa's name is gated, every time.

### Contracts & data

`packages/shared/src/contracts/podcast-guests.ts`: `GuestCandidate`, `BookingDirection`, `OutreachDraft`,
`BookingStatus`, `GuestInput`. Migrations `0127`/`0128` store candidates, rankings, and booking state. Smoke
`pnpm guestbooking:smoke`.

## Consequences

- Guests are sourced from contacts and external experts and ranked by a weighted composite of relevance,
  credibility, audience fit, and business value.
- The agent drafts outreach, tracks replies, and schedules — in both directions (inbound_guest and
  outbound_appearance), growing the show and Alyssa's reach.
- Contact is hard-gated: `markContacted` throws unless the outreach is approved or covered by a persistent
  approval, so the platform never reaches out to a real person without Alyssa's say-so.
- Migrations `0127`/`0128` persist candidates, rankings, and booking state.
- Phase 2 wires guest fit from the Podcast Studio into the agent and routes drafted outreach through the
  approval and persistent-approval flow.
