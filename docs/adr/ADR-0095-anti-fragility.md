# ADR-0095: Anti-Fragility Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

A resilient system withstands failure; an anti-fragile one improves *because* of it. The platform already keeps a
Failure Database (ADR-0068) of failures as permanent knowledge — but knowledge that is only stored does not make
the system stronger. The leverage is to treat every failure as the trigger for a concrete improvement: a new
safeguard, automation, agent, SOP, or system redesign that makes the same failure less likely next time. This ADR
adds the Anti-Fragility Engine to convert failures into systemic gains.

## Decision

Add an `anti-fragility/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`analyze()`**
takes a failure and produces an `AntiFragilityCase`: root cause, whether it was preventable, the reusable lesson,
and the new safeguard / automation / agent / SOP / system redesign it implies.

### Improve because of the failure

For each of **nine failure types** (missed_opportunity, failed_launch, security_incident, rejected_proposal,
lost_sale, customer_complaint, agent_failure, workflow_breakdown, model_error) the engine names the **root cause**,
flags **`preventable`**, extracts the **reusable lesson**, and prescribes the concrete improvement. It measures
**`recovery_days`** (speed back to health), **`learning_gained` (0..1)**, and **`future_risk_reduction` (0..1)** —
so the invariant holds: a failure is not closed until it has produced a system change that reduces future risk.

### Composition

It **composes the Failure Database** (ADR-0068): failures recorded there are the input to `analyze()`, and the
safeguards/agents/SOPs it prescribes flow back as permanent knowledge — the database remembers, the Anti-Fragility
Engine acts.

### Contracts & data

`packages/shared/src/contracts/anti-fragility.ts`: `FailureType`, `AnalyzeFailureInput`, `AntiFragilityCase`. No
migration — the engine is deterministic and reads from the Failure Database's store. Smoke `pnpm capstone:smoke`.

## Consequences

- Every failure produces a concrete improvement (safeguard / automation / agent / SOP / redesign), not just a record.
- It measures recovery speed, learning gained, and future risk reduction — making "we got stronger" verifiable.
- It composes the Failure Database (ADR-0068): failures in, system changes out.
- Phase 2 routes failures from the Failure Database into `analyze()` and registers its prescribed agents/SOPs.
