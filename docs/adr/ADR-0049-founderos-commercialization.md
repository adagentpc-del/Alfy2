# ADR-0049: FounderOS Commercialization Layer

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alfy² runs as **Tenant 001** — one operator's executive OS — but it was tenant-first from ADR-0001 and is
meant to become **FounderOS**, a productized version sold to other founders. The mission asks that the
architecture be *prepared* for that future without activating any of it now: every internal feature should
carry a classification of how it could be commercialized, so that when monetization is a decision rather than
a rewrite, the map already exists. This ADR adds the classification layer. It changes nothing operationally.

## Decision

Add a `commercialization/` registry in `@alfy2/core` that classifies every feature by commercialization tier
and flags SaaS-module candidates. Deterministic, tenant-scoped. **Preparation only.**

### Five tiers

Each feature is classified into one tier: **personal_only** (useful to Tenant 001 alone), **business_reusable**
(reusable across the operator's businesses), **founder_saas_feature** (a feature other founders would pay for),
**agency_service** (delivered as a service), or **enterprise_product** (packaged for larger buyers). Each
feature also carries a flag for whether it is a **SaaS-module candidate**.

### The seed catalog

The registry seeds ten named features with their tiers: **Executive Inbox, Revenue Factory, Conversion War
Room, Agent Factory, Follow-Up Autopilot, Asset Library, Goal Engine, Pattern Engine, Control Tower, and the
Knowledge-to-Money Engine**. This is the starting map of what could become a product surface.

### Preparation, not activation

`commercialized` is **always false**. Nothing is turned on, billed, or exposed. The layer records *how* a
feature could be sold, never that it *is* sold — it prepares the architecture for a future monetization
decision and stops there.

### Contracts & data

`packages/shared/src/contracts/commercialization.ts`: `CommercializationTier`, `FeatureClassification`,
`CommercializationEntry`. Migrations `0085`/`0086` add `commercialization_registry` + RLS. Sits alongside the
Founder Intelligence System tenancy work (ADR-0010), which already made multi-tenancy additive.

## Consequences

- When FounderOS becomes a decision, the tier map and the SaaS-module candidates are already recorded — the
  step is "activate," not "discover and classify."
- Because `commercialized` is pinned false, the layer is inert: it documents intent without changing behavior,
  billing, or exposure for Tenant 001.
- Phase 2 can connect approved candidates to packaging, pricing, and the billing work sketched in the
  FounderOS readiness phase.
