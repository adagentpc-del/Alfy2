# ADR-0038: Business Asset Checklist

**Status:** Accepted
**Date:** 2026-06-25

## Context

A business that's missing its offer, pricing, lead list, or landing page can't make money, but it's easy
to lose track of which of the many foundational assets each venture actually has. Alyssa needs a clear,
per-business view of what's present, what's missing, and what to build next.

## Decision

Add an `asset-checklist/` engine in `@alfy2/core` that tracks the 25 key assets per business, shows
what's missing, and recommends the fastest, highest-leverage asset to create next. Deterministic.
Tenant-scoped.

### 25 assets, completeness, recommendation

`build(present)` computes the missing set (the 25 minus what's present) and a completeness fraction, and
recommends the next asset to create by walking a fixed **priority order** — revenue-critical fundamentals
first (offer, pricing, lead list, follow-up sequence, landing page, one-pager, …), legal and polish last
(contracts, terms, privacy policy, NDA, SOPs, investor deck). The first missing asset in that order is
the recommendation, with a short rationale. `markPresent` advances the recommendation as assets are
added; `showMissing` lists gaps across all businesses.

### Contracts & data

`packages/shared/src/contracts/asset-checklist.ts`: `BusinessAssetKind` (25), `AssetChecklist`,
`BuildChecklistInput`. Migration 0066 adds `asset_checklists` + 0067 RLS.

## Consequences

- Each business has a single completeness score and a clear "build this next" — and the next pick is
  chosen for leverage and speed, not alphabetical order.
- It composes the Sales Asset Generator (which can create the recommended asset) and the Global Asset
  Library (which holds the ones that exist). Phase 2 derives `present` automatically from the Asset
  Library and connectors instead of being supplied.
