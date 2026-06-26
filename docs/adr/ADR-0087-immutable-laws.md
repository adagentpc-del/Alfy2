# ADR-0087: The Five Immutable Laws

**Status:** Accepted
**Date:** 2026-06-25

## Context

The platform has a Constitution (ADR-0051) of ten principles for how agents should act, but the leverage-and-media
capstone introduces a different need: a small, frozen set of laws that every feature, agent, workflow, and
recommendation must satisfy by construction — the laws that protect the human and force the platform to compound.
These are not procedural principles checked during execution; they are the bedrock the whole leverage stack is
built to honor. This ADR adds the Five Immutable Laws as a frozen catalog and a checker that holds every major
recommendation to them.

## Decision

Add an `immutable-laws/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It exposes **five frozen laws** and
a checker that validates any feature, agent, workflow, or recommendation against them — with **two hard gates**.

### The five laws

The laws, frozen in order: **1 Protect the Human, 2 Compound Everything, 3 Allocate Capital Intelligently, 4
Prefer Systems Over Heroics, 5 Increase Founder Freedom.** They are the bedrock of the leverage-and-media
capstone — Law 1 keeps the human protected and in command, Law 2 forbids creating once what could compound, Law 3
demands capital go to its highest use, Law 4 prefers a system to a hero, and Law 5 holds the platform to its
purpose of returning Alyssa's freedom. The catalog is frozen — it is law, not config — so it ships as code with
no migration.

### The check and its hard gates

The checker validates any feature, agent, workflow, or recommendation against all five laws and returns a
per-law verdict. **Law 1 (Protect the Human) and Law 4 (Prefer Systems Over Heroics) are hard gates** — a
proposal that violates either is blocked, not merely flagged, because a move that endangers the human or depends
on heroics is disqualified regardless of its upside. And **every major recommendation explains how it satisfies
the laws**: the laws are not a silent filter but a standing accountability the recommendation answers to out loud.

### Contracts & data

`packages/shared/src/contracts/immutable-laws.ts`: `ImmutableLaw`, `LawId`, `LawVerdict`, `LawCheck`,
`LawCheckInput`. There is **no migration** — the five laws are a frozen catalog and the checker is pure, holding
no tenant state. Smoke `pnpm laws:smoke`.

## Consequences

- The platform has five frozen, immutable laws — Protect the Human, Compound Everything, Allocate Capital
  Intelligently, Prefer Systems Over Heroics, Increase Founder Freedom — that every feature, agent, workflow, and
  recommendation must satisfy.
- Law 1 and Law 4 are hard gates: a proposal that endangers the human or relies on heroics is blocked, not
  flagged.
- Every major recommendation explains how it satisfies the laws, making compliance accountable rather than silent.
- There is **no migration** — a frozen catalog plus a pure checker.
- Phase 2 wires the checker ahead of major recommendations across the capstone so the laws are consulted by
  construction.
