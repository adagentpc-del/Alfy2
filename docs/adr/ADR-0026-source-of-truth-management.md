# ADR-0026: Source-of-Truth Management

**Status:** Accepted
**Date:** 2026-06-25

## Context

Not everything Alfy² "knows" is equally true. A verified financial figure, an assumption, an outdated
note, a stated preference, an inferred pattern, and a piece of external research are very different
things — and treating them the same leads to confident wrong answers. The platform needs to distinguish
the *kind* of each piece of knowledge and track its provenance so it knows what to trust and what to
re-check.

## Decision

Add a `source-of-truth/` registry in `@alfy2/core`, a provenance and verification layer over memory.
Deterministic. Tenant-scoped.

### Nine knowledge kinds

Every record is one of: **verified_fact, assumption, outdated, user_preference, inferred_pattern,
external_research, document, contact, financial_data.** `query(kind)` filters by kind, so the system
can tell a verified fact from an assumption.

### Full provenance per record

Every important memory carries **source, confidence, freshness, owner, last_verified_at, and an
update_trigger** (plus an optional link to the Memory Engine record it annotates).

### Freshness from a verification TTL

Each kind has a verification TTL (e.g. verified_fact 365 days, financial_data 30 days, assumption 30
days, outdated 0). `freshness` is derived from how long ago the record was verified: **fresh → aging →
stale → expired**. `refreshAll()` recomputes it as of now; `needsVerification()` surfaces everything
stale or expired; `verify()` re-stamps it fresh (and can bump confidence); `markOutdated()` demotes a
record to `outdated`/`expired` with low confidence.

### Contracts & data

`packages/shared/src/contracts/source-of-truth.ts`: `FactKind`, `Freshness`, `SourceRecord`,
`RecordTruthInput`. Migration 0042 adds `source_records` + 0043 deny-by-default RLS.

## Consequences

- Alfy² can answer with calibrated confidence — it knows whether a claim is a verified fact or an
  assumption, who owns it, where it came from, and when it was last checked.
- Stale knowledge surfaces itself for re-verification instead of quietly going wrong; the update_trigger
  records *what* should prompt a recheck.
- It composes with the Memory Engine (via `memory_id`) and the Decision/Goal engines, which can weight
  inputs by confidence and freshness. Phase 2 runs `refreshAll`/`needsVerification` on a schedule and
  wires update triggers to live events (a price change, a monthly close).
