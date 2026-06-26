# ADR-0075: Media Operating System

**Status:** Accepted
**Date:** 2026-06-25

## Context

The platform can mine stories, but a founder still spends hours turning one raw moment — a voice note, a clip, a
screenshot — into the dozen finished, on-brand assets the channels actually want. That conversion is repetitive,
brand-sensitive, and exactly the kind of work that should not consume Alyssa's day. The leverage is obvious: one
captured moment should become many finished assets without her producing each by hand. But media goes out under
her name, so nothing can publish without her. This ADR adds the Media Operating System to do the production and
stop at the approval line.

## Decision

Add a `media-os/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It takes one raw moment in **eleven
input kinds** and produces many finished, brand-correct assets across **twelve output kinds** — and it never
publishes on its own.

### One moment in, many assets out

The Media OS accepts a raw moment in any of eleven input kinds and expands it into the twelve output kinds the
channels consume — the short-form cuts, the written posts, the threads, the captions, the long-form, and the
rest. The work that used to be an afternoon of manual production becomes one pass: the moment is captured once and
multiplied into everything it could become, each asset already shaped to the brand it belongs to rather than
generic filler.

### Nothing publishes without Alyssa

Production is aggressive; publishing is not. **`requires_approval` is always true** on every asset the engine
produces — nothing leaves for a channel without Alyssa's explicit sign-off. The engine's job is to give Alyssa
her life back by removing the production labor, not to take her hands off the wheel: she reviews finished work and
releases it, rather than building it. The brand-correctness comes from the Brand DNA engine (ADR-0076), which the
Media OS calls to resolve which brand a moment belongs to before it produces a single asset.

### Contracts & data

`packages/shared/src/contracts/media-os.ts`: `MediaInput`, `MediaInputKind`, `MediaAsset`, `MediaOutputKind`,
`MediaOSResult`; every produced asset carries `requires_approval: true`. Migrations `0134`/`0135` store produced
assets and their approval state. Smoke `pnpm mediaos:smoke`.

## Consequences

- One raw moment in eleven input kinds becomes many finished, brand-correct assets across twelve output kinds —
  production that took an afternoon happens in one pass.
- `requires_approval` is always true on every asset: nothing publishes without Alyssa, so the engine removes the
  labor without removing command.
- The Media OS resolves brand via the Brand DNA engine so each asset is on-brand before it is produced.
- Assets and their approval state persist in `0134`/`0135`.
- Phase 2 wires approved assets into per-channel publishing and the Production Studio's post-approval pipeline.
