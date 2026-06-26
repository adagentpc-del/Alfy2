# ADR-0076: Brand DNA Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alyssa does not run one brand — she runs several, each with its own voice, palette, audience, and promise. The
Media OS can multiply a moment into a dozen assets, but "on-brand" is meaningless until the platform knows which
brand a moment belongs to and what that brand actually is. Without an explicit identity per brand, every produced
asset drifts toward a generic average, and the leverage of automated production turns into the cost of cleaning
up off-brand output. This ADR adds the Brand DNA Engine: a seeded, structured identity for each brand and a
resolver that tells the Media OS which brand any piece of content is for.

## Decision

Add a `brand-dna/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It seeds **nine brands**, each with a
full identity, and exposes **`resolveBrand()`** so the Media OS can auto-detect the brand a moment belongs to
before it produces anything.

### Nine brands, full identity each

The engine ships nine brands seeded with their complete identity — the voice and tone, the visual language, the
audience, the values, the promise, the do's and don'ts that make a brand recognizably itself. This is the source
of truth the rest of the media stack reads from: when the Media OS or Content Factory asks "what does this brand
sound like, look like, stand for," the answer is one structured record rather than a guess. Nine brands are
seeded so the system is useful on day one, not an empty schema waiting to be filled.

### resolveBrand() — auto-detect the brand

**`resolveBrand()`** is the engine's working surface: given a moment, a topic, or a piece of source material, it
detects which of the nine brands the content belongs to. The Media OS calls it first, so an incoming raw moment is
routed to the right identity before a single asset is produced — and every downstream asset inherits that brand's
voice, palette, and promise automatically. The founder does not tag each moment by hand; the engine resolves it.

### Contracts & data

`packages/shared/src/contracts/brand-dna.ts`: `Brand`, `BrandIdentity`, `BrandVoice`, `BrandVisuals`,
`ResolveBrandInput`, `ResolveBrandResult`. Migrations `0136`/`0137` store the nine seeded brand identities and
any tenant-specific overrides. Smoke `pnpm brand:smoke`.

## Consequences

- Nine brands are seeded with full identity — voice, visuals, audience, values, promise — so "on-brand" is a
  concrete record, not a guess.
- `resolveBrand()` auto-detects the brand for any moment, so the Media OS produces every asset under the right
  identity without manual tagging.
- Brand identities persist in `0136`/`0137` with room for tenant overrides.
- The engine is the brand source of truth the Media OS, Content Factory, and Production Studio all read from.
- Phase 2 lets brands evolve their identity from performance signals while keeping the seeded defaults as the
  floor.
