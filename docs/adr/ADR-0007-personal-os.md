# ADR-0007 — Personal OS

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
The operator's personal life has the same "don't make me repeat myself" need as the business side:
the system should know the Mercedes dealership's advisor, hours, and preferred contact after being
told once, and prepare it automatically next time. Twelve life modules need this: Vehicles, Travel,
Appointments, Shopping, Pets, Home, Insurance, Bills, Maintenance, Health, Goals, Relationships.

The core behavior the brief specifies: **reuse if known; ask once if not; remember forever unless
updated; auto-prepare next time.**

## Decision
1. **Personal OS is a thin layer over the Memory Engine.** "Remember forever" already exists — it's
   the Memory Engine. Personal OS adds the reuse-or-ask-once orchestration and a catalog of what to
   remember. No new datastore.
2. **A catalog of entity types per module.** A data-only catalog maps each module to its entity types
   (e.g. Vehicles → `vehicle`, `dealership`), each with a memory kind and its required/optional fields.
   The dealership's required fields are exactly `store, phone, advisor, hours, preferred_contact`.
3. **Three operations.** `resolve()` returns `reused` / `partial` / `missing` (and, when something is
   missing, a single `InfoRequest` listing exactly the needed fields — *ask once*). `remember()`
   writes to memory and **upserts** (updates in place, never duplicates) — *remember forever unless
   updated*. `prepare()` assembles everything known into a ready-to-use bundle — *auto-prepare*.
4. **Reads never mutate.** `resolve()` and `prepare()` use the Memory Engine's non-reinforcing `peek`,
   so merely looking something up doesn't change its usage stats. Only `remember()` writes.
5. **Extend memory kinds where honest.** Pets, Travel, and Goals had no good existing memory kind, so
   `pet`, `trip`, and `goal` were added to `MemoryKind` (additive, non-breaking; migration 0007).
   Everything else maps onto existing kinds (the dealership is a `company`, insurance a `contract`,
   bills a `subscription`, relationships a `person`, …).

## Consequences
- **Positive:** the operator is asked for a fact at most once; it's reused everywhere and prepared
  automatically; no duplicate records (upsert keyed on module+type+identity); read paths are
  side-effect-free; the catalog is trivially extensible.
- **Cost:** entity identity matching is exact (same module + type + identity string), so a fact
  remembered under a slightly different label won't be found; the catalog's field lists need curation
  per module. Three new memory kinds slightly grow that enum.
- **Mitigation:** identity is operator-facing and stable; fuzzy/aliased matching can be added behind
  the same `resolve()` API later; the catalog is data, so tuning can't break the contracts.

## Alternatives considered
- **A separate personal datastore:** redundant with the Memory Engine and would split "what Alfy²
  remembers" across two homes. Rejected.
- **Cram pets/trips/goals into existing kinds:** dishonest buckets that hurt retrieval precision.
  Rejected in favor of three additive kinds.
- **Ask every time / store per-use:** defeats the entire purpose. Rejected.
