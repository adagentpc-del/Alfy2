# ADR-0063: Entity Structure Optimizer

**Status:** Accepted
**Date:** 2026-06-25

## Context

"Should this business be an LLC, an S Corp, a C Corp, a subsidiary, or sit under a holding company?" is one of
the highest-leverage structural questions a founder faces, and the right answer turns on a handful of facts —
whether she is raising, where the IP and liability sit, what the profit and payroll look like. It is also a
question with legal and tax consequences that only an attorney and a CPA can sign off. This ADR adds the Entity
Structure Optimizer: a transparent rule-based recommendation with real alternatives, designed to be argued out
with professionals, never to form an entity on its own.

## Decision

Add an `entity-structure/` engine in `@alfy2/core` that recommends a legal entity structure from a small set of
rules and lays out the alternatives. Deterministic, tenant-scoped. It recommends; an attorney and a CPA decide
and execute.

### The rule and its alternatives

The recommendation is **rule-based and legible**: **raise or exit intent → C Corp**; **IP, SaaS, or liability
concentration → holding company**; **profit ≥ 60k with payroll → LLC taxed as S Corp**; **otherwise → LLC.**
Whatever the rule selects, the engine also presents the **alternatives**, each with its **pros, cons, tax
treatment, and legal treatment**, so the recommendation is a starting point for a decision rather than a verdict.
Alongside it the engine emits the **questions for the CPA and the attorney** and an **action checklist** of what
forming or converting would actually involve.

### Recommend, never form

`requires_professional_review` is **always `true`**. The Optimizer never opens an entity, never files a
formation or conversion, and never signs anything — those are forbidden money/legal actions reserved for
Alyssa's approval and professional execution. It produces the analysis and the advisor questions; the attorney
and CPA make and carry out the call. This is structural planning for review, not legal advice.

### Contracts & data

`packages/shared/src/contracts/entity-structure.ts`: `EntityType`, `EntityRecommendation`, `EntityAlternative`,
`EntityStructureInput`, `EntityStructureAnalysis`. Migrations `0109`/`0110` store analyses **append-only**, so
each structural recommendation is a dated record for the professionals reviewing it. Smoke `pnpm entity:smoke`.

## Consequences

- The entity question gets a transparent answer: a single rule (raise/exit → C Corp; IP/SaaS/liability → holding
  company; profit ≥ 60k + payroll → LLC/S Corp; else LLC) plus every alternative with pros, cons, and tax/legal
  treatment.
- Each recommendation ships with CPA and attorney questions and an action checklist, shaped as a brief for
  professionals.
- `requires_professional_review` is always true; the engine never forms, converts, files, or signs — those stay
  with Alyssa's approval and professional execution.
- Analyses are append-only (migrations `0109`/`0110`), giving a dated record of every structural recommendation.
- Phase 2 feeds the advisor questions into the professional-review queue; entity actions never bypass it.
