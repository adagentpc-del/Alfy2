# ADR-0031: Knowledge-to-Action Converter

**Status:** Accepted
**Date:** 2026-06-25

## Context

Ingested knowledge still isn't worth anything until it's *done*. The failure mode is a library of great
ideas that never get executed. The platform should take every useful idea and convert it into a
concrete, owned, testable action — and decide whether it's worth doing now, later, or at all — while
capturing the result as reusable IP.

## Decision

Add a `knowledge-to-action/` converter in `@alfy2/core`. For an idea it produces a complete action and a
disposition. Deterministic. Tenant-scoped.

### Ten fields per idea

`convert(input)` builds all ten elements the request lists: an **action item**, a **business use case**,
an **implementation plan**, a **revenue hypothesis**, the **required assets**, the **required agents**, a
**test plan**, an **owner**, a **deadline**, and a **dashboard card** — plus an **operating manual**, the
reusable IP that lets the same workflow be applied wherever the situation recurs.

### Disposition

Each idea is routed: **use now**, **save for later**, **ignore**, or **convert into a campaign** — decided
from a 0..1 value signal and whether the idea is campaign-shaped (a campaign-shaped, strong idea routes
to convert_to_campaign and pulls in the marketing agent).

### Contracts & data

`packages/shared/src/contracts/knowledge-to-action.ts`: `ActionDisposition`, `KnowledgeAction`,
`ConvertIdeaInput`. Migration 0052 adds `knowledge_actions` + 0053 deny-by-default RLS.

## Consequences

- Knowledge stops sitting unused — every useful idea leaves as an owned, testable action with a deadline
  and a dashboard card.
- The operating manual makes each converted workflow reusable IP, compounding over time.
- It closes the loop with the rest of the platform: convert_to_campaign hands off to Campaign
  Intelligence, required_agents reference the Agent Factory, required_assets the Asset Library, and the
  action's deadline/owner feed the Executive Control Tower. Phase 2 auto-converts ingested items and
  files the actions into the inbox/dashboard.
