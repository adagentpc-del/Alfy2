# ADR-0051: Constitution of Alfy²

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alfy² has many engines, a doctrine (ADR-0050), a governing plane (ADR-0046), and a security chokepoint
(ADR-0015) — but nothing names the small set of rules that sit *above* all of them and that every agent must
answer to during execution. A platform that acts on a founder's behalf needs a constitution: a short, frozen
catalog of principles that is the highest authority in the system, checkable mechanically, never edited on a
whim. This ADR encodes that constitution as a deterministic engine the rest of the platform references.

## Decision

Add a `constitution/` engine in `@alfy2/core`. It exposes ten principles as a frozen catalog and a `check()`
that returns a per-principle verdict for any proposed action. Deterministic, tenant-scoped. It is the highest
authority — every other engine and every agent defers to it.

### The ten principles

`PRINCIPLES` is the frozen catalog, in order: **1 Human remains in command, 2 Think aggressively, 3 Act
conservatively, 4 Execute with urgency, 5 Finish what was started, 6 Protect trust, 7 Optimize for measurable
outcomes, 8 Reuse before rebuilding, 9 Explain important decisions, 10 Continuously improve.** The catalog is
frozen — it is the constitution, not a config — so there is no migration; it ships as code.

### The check and its hard gates

`check(action)` returns a verdict per principle. Two are **hard gates**. Under **Principle 3 (Act
conservatively)**, an irreversible, financial, legal, or production action taken **without approval** must be
routed for approval and is a **violation until approved** — the conservative default is to stop and ask. Under
**Principle 5 (Finish what was started)**, abandoning approved work **without a documented reason** is a
**violation** — work is finished or its abandonment is explained, never silently dropped. **Principles 7 and 9**
flag softer concerns: a missing measurable outcome (7) and a missing explanation for an important decision (9).
The remaining principles record a verdict without blocking.

### Referenced during execution

Every agent references the Constitution while it executes — it is not an after-the-fact audit but the standing
authority each action is measured against. It composes the AI Center of Excellence (ADR-0022) for standards,
the Security Gate (ADR-0015) for the approval chokepoint, and the Plane registry (ADR-0046) for the
control/execution boundary, sitting above all three as the rule they enforce.

### Contracts & data

`packages/shared/src/contracts/constitution.ts`: `PrincipleId`, `Principle`, `PrincipleVerdict`,
`ConstitutionAction`, `ConstitutionCheck`. There is **no migration** — `PRINCIPLES` is a frozen catalog, static
constitutional metadata, not tenant state. Smoke `pnpm constitution:smoke`.

## Consequences

- The platform has a named highest authority: ten principles, frozen, that every agent and engine answers to.
- The two hard gates make the conservative default mechanical — an unapproved irreversible/financial/legal/
  production action is a violation until approved, and abandoning approved work without a reason is a violation.
- Principles 7 and 9 keep measurable outcomes and explanations visible without blocking, reinforcing the
  doctrine that important decisions are explained and optimized for outcomes.
- Phase 2 wires `check()` ahead of agent execution so the Constitution is consulted on every consequential
  action, and feeds violations into Observability and the Audit Log.
