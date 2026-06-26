# ADR-0077: Content Factory

**Status:** Accepted
**Date:** 2026-06-25

## Context

The Media OS turns one moment into assets, but the deeper waste is structural: a founder records one substantial
piece — a long-form video, a talk, a deep conversation — and then re-creates the derivative content by hand,
piece by piece, channel by channel, as if the source did not already contain all of it. The leverage of a single
source is enormous and almost never captured. This ADR adds the Content Factory: one source becomes a single
linked package of dozens of pieces, produced together, so the work of multiplication happens once.

## Decision

Add a `content-factory/` engine in `@alfy2/core`. Deterministic, tenant-scoped. From one source it produces a
**42-piece linked package** via a fixed **`CONTENT_MULTIPLIER`**, and nothing in that package is ever created
twice.

### One source, a 42-piece package

`CONTENT_MULTIPLIER` is the explicit expansion: one source becomes **1 YouTube long-form, 5 shorts, 5 reels, 10 X
posts, 5 LinkedIn posts, 3 carousels**, and the rest of the package — forty-two pieces in total, each derived
from the same source and each shaped for its surface. The factory does not improvise the count; the multiplier is
a declared recipe, so a source reliably yields the same complete package every time rather than whatever the
founder had energy to make that day.

### One linked package, nothing made twice

The forty-two pieces are not loose outputs — they are a **linked package**, every piece tied back to its source
and to its siblings, so the package can be tracked, approved, scheduled, and reasoned about as one thing. The
governing discipline is that nothing is created twice: a source is expanded once into its package, the package is
retained, and the founder never rebuilds a piece that the multiplier already produced. The Content Factory reads
brand from the Brand DNA engine so every piece in the package is on-brand from the start.

### Contracts & data

`packages/shared/src/contracts/content-factory.ts`: `ContentSource`, `ContentPiece`, `ContentPackage`,
`CONTENT_MULTIPLIER`, `ContentFactoryResult`. Migrations `0138`/`0139` store packages and their linked pieces
**append-only** — a package is a permanent record of what one source became. Smoke `pnpm contentfactory:smoke`.

## Consequences

- One source becomes a 42-piece linked package via `CONTENT_MULTIPLIER` (1 YouTube long, 5 shorts, 5 reels, 10 X,
  5 LinkedIn, 3 carousels, and the rest) — multiplication happens once, reliably, the same way every time.
- The package is linked: every piece ties back to its source and siblings, so it is tracked, approved, and
  scheduled as one unit.
- Nothing is created twice — a source is expanded once and the package is retained; packages are append-only
  (`0138`/`0139`).
- Brand-correctness comes from the Brand DNA engine, so every piece is on-brand from the start.
- Phase 2 routes package pieces into the Production Studio's per-brand pipeline and channel scheduling behind the
  approval gate.
