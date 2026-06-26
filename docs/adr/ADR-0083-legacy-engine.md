# ADR-0083: Legacy Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

A founder accumulates repeatable knowledge constantly — a process figured out, a framework that works, a lesson
hard-won — and most of it stays trapped as tacit know-how that helps once and is forgotten. The deepest leverage
is to turn that knowledge into forms that endure and compound for decades: an SOP, a FounderOS feature, a course,
a podcast, a keynote, a book chapter, a licensing deal, a consulting framework. Knowledge left tacit dies with the
moment; knowledge turned into IP works for years. This ADR adds the Legacy Engine to convert repeatable knowledge
into enduring legacy forms and to score how much legacy each one builds.

## Decision

Add a `legacy/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It turns repeatable knowledge in **ten
kinds** into **enduring legacy forms** — SOP, FounderOS feature, course, podcast, keynote, book chapter,
licensing, consulting framework — each carrying a **legacy score**.

### Ten kinds of knowledge into enduring forms

The engine takes repeatable knowledge in ten kinds — the processes, frameworks, lessons, methods, and the rest of
what a founder learns once and could teach forever — and proposes the enduring forms it should become: an **SOP**
for the team, a **FounderOS feature** for the product, a **course** or **keynote** or **book chapter** for the
audience, a **licensing** or **consulting framework** to sell. The same piece of knowledge often supports several
forms, and the engine names them, so know-how stops being tacit and becomes IP that compounds.

### A legacy score for what endures

Each proposed form carries a **legacy score** — how much durable, compounding value it builds over time. The score
is the engine's recommendation surface: it ranks the forms so the founder invests in the knowledge-to-IP
conversions that compound hardest over decades, rather than treating every form as equally worth building. The
discipline is to build IP that outlives the moment it came from.

### Contracts & data

`packages/shared/src/contracts/legacy.ts`: `KnowledgeKind`, `LegacyForm`, `LegacyFormKind`, `LegacyScore`,
`LegacyInput`, `LegacyResult`. Migrations `0152`/`0153` store legacy forms and their scores **append-only**, so
the IP record only accumulates. Smoke `pnpm legacy:smoke`.

## Consequences

- Repeatable knowledge in ten kinds becomes enduring legacy forms (SOP / FounderOS feature / course / podcast /
  keynote / book chapter / licensing / consulting framework) — tacit know-how becomes IP that compounds.
- Each form carries a legacy score that ranks the conversions by durable, compounding value over decades.
- Legacy forms and scores are append-only (`0152`/`0153`); the IP record only grows.
- The engine feeds the FounderOS commercialization path, the Asset Library, and the content stack with reusable
  IP.
- Phase 2 routes high-legacy-score forms into the Operating Manual Generator and FounderOS feature pipeline.
