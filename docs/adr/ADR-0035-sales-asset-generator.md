# ADR-0035: Sales Asset Generator

**Status:** Accepted
**Date:** 2026-06-25

## Context

Every business needs a sales kit, and recreating it by hand for each venture is slow and inconsistent.
Alyssa needs the full set generated on demand and filed where the rest of the platform can use it.

## Decision

Add a `sales-asset/` generator in `@alfy2/core` that, for any business, generates the full sales kit and
saves each asset to the Global Asset Library. Deterministic. Tenant-scoped.

### Twelve assets

`generate(input)` produces all twelve: **one-pager, pitch deck, investor deck, sales deck, proposal,
email sequence, DM script, call script, objection handling, FAQ, case study template, onboarding
packet** — each shaped to the supplied offer and audience.

### Saved to the Asset Library

Each generated asset is persisted to the Global Asset Library through an injected `assetSink` (returning
its asset id), so the kit is immediately searchable and reusable alongside everything else. With no sink,
references are synthesized.

### Contracts & data

`packages/shared/src/contracts/sales-asset.ts`: `SalesAssetKind`, `GeneratedSalesAsset`, `SalesAssetPack`,
`GenerateSalesAssetsInput`. Migration 0060 adds `sales_asset_packs` + 0061 RLS.

## Consequences

- A new business gets a complete, consistent sales kit in one call, already filed in the Asset Library.
- The generation is deterministic and templated today; the `assetSink` port lets Phase 2 swap in an AI
  generator (behind the gated AI Gateway) and run the kit through the AI Center of Excellence compliance
  checks without changing the contract.
