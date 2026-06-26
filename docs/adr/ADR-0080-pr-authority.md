# ADR-0080: PR & Authority Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

The PR Department (ADR-0073) gives every business a PR *strategy*, but strategy is not the same as catching the
moment. PR opportunities arrive as events — a launch, a partnership, a funding round, a win, a trend, an
innovation — and the window to pitch them is short. A founder who waits to notice the moment, then drafts a pitch,
then finds the outlets, has usually missed it. The leverage is in detecting the opportunity the instant the
trigger fires and having the pitch and the targets ready. But a pitch sent to the wrong outlet under the founder's
name is a cost, so nothing goes out without approval. This ADR adds the PR & Authority Engine to catch the
moment and build the authority stack — and to never send without sign-off.

## Decision

Add a `pr-authority/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It auto-detects PR opportunities from
**six triggers**, produces a drafted pitch plus target outlets, builds the authority asset stack, and **`markSent`
throws unless approved**. It complements the per-business PR Strategy Generator (ADR-0073).

### Six triggers, a ready pitch

The engine watches for six PR triggers — **launch, partnership, funding, win, trend, innovation** — and when one
fires it does not just flag it: it produces a **drafted pitch** and the **target outlets** to send it to. The
moment a business does something newsworthy, the pitch and the press list already exist, so the short pitching
window is spent sending rather than scrambling. Alongside the pitch the engine builds the **authority asset
stack** — the credibility materials, proof points, and positioning that make the founder a credible source rather
than a cold inbox.

### Pitches never sent without approval

Detection and drafting are aggressive; sending is gated. **`markSent` throws unless the pitch is approved** — the
engine will draft a pitch to a Tier-1 outlet and have it ready, but it cannot mark it sent, and therefore cannot
treat it as sent, until Alyssa has approved it. The mechanical throw is the guarantee: a pitch under her name does
not leave on the engine's judgment alone.

### Contracts & data

`packages/shared/src/contracts/pr-authority.ts`: `PRTrigger`, `PROpportunity`, `DraftedPitch`, `OutletTarget`,
`AuthorityAsset`, `PRAuthorityResult`. Migrations `0146`/`0147` store detected opportunities, drafted pitches, and
their sent/approval state. Smoke `pnpm prauthority:smoke`.

## Consequences

- The engine auto-detects PR opportunities from six triggers (launch / partnership / funding / win / trend /
  innovation) and produces a drafted pitch plus target outlets — the pitch is ready when the window opens.
- It builds the authority asset stack so the founder pitches as a credible source.
- `markSent` throws unless approved — pitches are never sent without Alyssa's sign-off.
- It complements the per-business PR Strategy Generator (ADR-0073): strategy there, moment-catching here.
- Opportunities, pitches, and approval state persist in `0146`/`0147`.
- Phase 2 wires trigger detection to live business events and routes approved pitches into outreach tracking.
