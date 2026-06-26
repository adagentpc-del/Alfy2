# ADR-0105: Strategic Exit & Asset Value Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Most of what a founder builds could one day be worth more than the cash it throws off — but only if it is built to
be sellable. An automation, a product, a body of IP each has a latent exit value that is invisible until someone
asks "what would this be worth, and what makes it sellable?" The leverage is to track that exit potential
continuously, with valuation logic and the concrete steps to realize it. This ADR adds the Strategic Exit & Asset
Value Engine.

## Decision

Add a `strategic-exit/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`add()`** records an asset,
**`assess()`** values it against the exit paths, and **`recommendedPaths()`** ranks the routes to value.

### Eight exit paths, valuation, and the steps to sellable

Every business, product, automation, asset, or IP is assessed against **eight exit paths** — cash_flow_business,
saas_product, agency_service, licensing_asset, acquisition_target, joint_venture, sellable_micro_business,
investor_backed_company — each with **valuation logic** and the **concrete steps to make it sellable**. The
invariant: exit value is treated as a first-class, trackable property of every asset, not an afterthought at sale
time — so the founder always knows which assets are closest to being worth real money and what it takes to get them
there.

### Contracts & data

`packages/shared/src/contracts/strategic-exit.ts`: `ExitPath`, `AssessExitInput`, `ExitAssessment`. No migration —
deterministic assessment over a tenant-scoped store. Smoke `pnpm capstone:smoke`.

## Consequences

- Every asset is assessed against **8 exit paths** with valuation logic and the steps to make it sellable.
- Exit value is a trackable, first-class property, and `recommendedPaths()` ranks the routes to realize it.
- Migration `0182_exit_assessments.sql` (append-only `exit_assessments`).
- Phase 2 feeds packageable assets to the Capital Board's `package_founderos` disposition and the Million-Dollar Sprint.
