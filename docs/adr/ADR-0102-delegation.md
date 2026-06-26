# ADR-0102: Executive Delegation System

**Status:** Accepted
**Date:** 2026-06-25

## Context

The fastest way to give a founder her life back is to stop her doing work she should never touch. A founder's time
is the scarcest capital in the company, and most tasks that reach her are better owned by an agent, a contractor, a
specialist, an automation — or deleted outright. The leverage is to classify every task to its right owner and keep
Alyssa on the few things only she can do: vision, relationships, high-value sales, strategic decisions, creative
insight, and approvals. This ADR adds the Executive Delegation System.

## Decision

Add a `delegation/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`classify()`** assigns
each task an owner and returns a `DelegationDecision`.

### What Alyssa should NOT do herself

Each task is classified to one of **nine owners** — alyssa_only, ai_agent, human_contractor, specialist,
attorney_cpa, assistant, automation, defer, delete — from its founder time cost, skill requirement, risk,
repeatability, delegation readiness, SOP availability, and whether it genuinely needs Alyssa's judgment. The
invariant: **`alyssa_only` is reserved** for work that truly needs her vision / relationships / creativity /
approval; everything repeatable, low-judgment, or specialist is routed away from her by default, so her calendar
fills with the few things only she can do.

### Contracts & data

`packages/shared/src/contracts/delegation.ts`: `TaskOwner`, `ClassifyTaskInput`, `DelegationDecision`. No migration
— deterministic classification. Smoke `pnpm capstone:smoke`.

## Consequences

- Every task is classified to one of **9 owners**, keeping `alyssa_only` for work that genuinely needs her.
- Repeatable, low-judgment, and specialist work is routed away from the founder by default.
- Migration `0179_delegation_decisions.sql` (append-only `delegation_decisions`).
- Phase 2 wires `classify()` into the Cognitive Offloading Engine's Delegate stage.
