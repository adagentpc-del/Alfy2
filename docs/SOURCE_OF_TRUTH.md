# Source-of-Truth Management

Not everything Alfy² knows is equally true. Source-of-Truth Management is the provenance and
verification layer over memory: it distinguishes the *kind* of each piece of knowledge and tracks where
it came from, how confident it is, how fresh it is, who owns it, when it was last verified, and what
should trigger a re-check. Deterministic. Tenant-scoped.

Module: `packages/core/src/source-of-truth/`. Contracts:
`packages/shared/src/contracts/source-of-truth.ts` (mirrored in `workers/`). Migrations:
`0042_source_records.sql`, `0043_source_records_rls.sql`. ADR:
`docs/adr/ADR-0026-source-of-truth-management.md`. Smoke: `pnpm truth:smoke`.

## The nine knowledge kinds

**verified_fact · assumption · outdated · user_preference · inferred_pattern · external_research ·
document · contact · financial_data.** `query(kind)` filters by kind, so a verified fact is never
confused with an assumption.

## Provenance on every record

Each important memory carries:

- **source** — where it came from (a person, document, connector, research source)
- **confidence** — 0..1
- **freshness** — fresh / aging / stale / expired
- **owner** — who's accountable for it
- **last_verified_at** — when it was last checked
- **update_trigger** — what should prompt a re-check (e.g. "monthly close", "on price change")

plus an optional `memory_id` link to the Memory Engine record it annotates.

## Freshness from a verification TTL

Each kind has a verification TTL (verified_fact 365 days, financial_data 30, assumption 30, contact 180,
outdated 0, …). Freshness is derived from how long ago the record was verified and decays **fresh →
aging → stale → expired**:

- `record()` stamps freshness on entry (and an `outdated` kind is expired immediately)
- `refreshAll()` recomputes freshness as of now
- `needsVerification()` surfaces everything stale or expired
- `verify()` re-stamps a record fresh and can bump confidence
- `markOutdated()` demotes a record to `outdated`/`expired` with low confidence

## Tenant isolation

Records are tenant-scoped, matching the RLS on `source_records`.

## Composes with the rest

It annotates Memory Engine records (via `memory_id`) and gives the Decision and Goal engines a way to
weight inputs by confidence and freshness. Phase 2 runs `refreshAll`/`needsVerification` on a schedule
and wires update triggers to live events.
