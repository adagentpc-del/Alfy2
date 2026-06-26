# ADR-0090: Executive Decision Journal

**Status:** Accepted
**Date:** 2026-06-25

## Context

Founders make consequential decisions constantly and almost never go back to check whether the reasoning held up.
The lesson lives only in whether the decision worked out, and even that is rarely tied back to the assumptions and
risks named at the time — so the same misjudgments recur. The leverage is in recording each decision with its real
reasoning, then forcing a review against the actual outcome, so the platform learns from its own track record. This
ADR adds the Executive Decision Journal to record decisions, schedule their reviews, and surface the patterns that
should improve future recommendations.

## Decision

Add a `decision-journal/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It records decisions with their
full reasoning, **schedules 30/90/365-day reviews** to capture the actual outcome and lessons, and surfaces
**recurring decision patterns**.

### Record the decision and its reasoning

Each decision is recorded with its **alternatives, reasoning, data, assumptions, risks, and expected outcome** —
not just what was decided but why, what it rested on, and what could go wrong. This is the honest snapshot a review
needs: a year later the founder can see exactly what was known and assumed at the time, rather than reconstructing
it from memory.

### Scheduled reviews and recurring patterns

The journal **schedules reviews at 30, 90, and 365 days** to record the **actual outcome and the lessons** —
closing the loop the assumptions and expected outcome opened. And across the record it surfaces **recurring
decision patterns**: categories with **two or more decisions** are flagged as patterns, so the platform learns
where the founder repeatedly decides a certain way and how those decisions tend to turn out — feeding back into
better future recommendations. The journal is how the platform stops making the same misjudgment twice.

### Contracts & data

`packages/shared/src/contracts/decision-journal.ts`: `Decision`, `DecisionReview`, `ReviewSchedule`,
`DecisionPattern`, `DecisionJournalResult`. Migrations `0166`/`0167` store decisions, their scheduled reviews,
and recorded outcomes. Smoke `pnpm journal:smoke`.

## Consequences

- Each decision is recorded with alternatives, reasoning, data, assumptions, risks, and expected outcome — the
  real reasoning, not just the verdict.
- Reviews are scheduled at 30 / 90 / 365 days to record the actual outcome and lessons, closing the loop.
- Recurring decision patterns (categories with two or more decisions) are surfaced to improve future
  recommendations.
- Decisions, reviews, and outcomes persist in `0166`/`0167`.
- Phase 2 wires scheduled reviews into the executive rhythm and feeds decision patterns into the Review Board and
  recommendation engines.
