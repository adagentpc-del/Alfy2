# ADR-0078: Production Studio

**Status:** Accepted
**Date:** 2026-06-25

## Context

The Media OS and Content Factory produce assets, but finished media is more than the asset — it is the intro, the
outro, the sponsor read, the chapters, the subtitles, the clips, the show notes, the schedule. Today that
post-production is manual and per-brand, and it is the step that keeps a finished package from actually going out.
The leverage is in making the post-approval pipeline run itself: once Alyssa approves, the studio assembles every
production asset the brand requires without her touching the assembly. This ADR adds the Production Studio: a
store of production assets plus per-brand presets that drive the post-approval pipeline automatically.

## Decision

Add a `production-studio/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It stores **seventeen
production-asset kinds** and **per-brand presets** that, once content is approved, run the production pipeline
automatically.

### Seventeen production-asset kinds

The studio holds seventeen production-asset kinds — the intros, outros, sponsor reads, chapters, subtitles,
clips, show notes, thumbnails, schedules, and the rest of the materials that turn an approved piece into
finished, publishable media. They are stored, versioned, and reusable, so the studio assembles from a library
rather than rebuilding the same intro for the hundredth episode.

### Per-brand presets run the pipeline

Each brand has a **preset** that declares its post-production pipeline as a sequence the studio executes once a
piece is approved. For "Decoded," for example, the preset adds **Intro A, Outro B, a sponsor read after the first
topic, chapters, subtitles, clips, show notes, and a schedule** — applied automatically, in order, every time.
The preset is the brand's standing instruction: approval is the trigger, and the studio does the assembly, so the
founder approves a piece and gets finished media rather than a production checklist. The presets sit downstream of
the approval gate — they run after Alyssa signs off, never before.

### Contracts & data

`packages/shared/src/contracts/production-studio.ts`: `ProductionAsset`, `ProductionAssetKind`, `BrandPreset`,
`PresetStep`, `ProductionStudioResult`. Migrations `0140`/`0141` store production assets and `0142`/`0143` store
per-brand presets. Smoke `pnpm prodstudio:smoke`.

## Consequences

- The studio stores seventeen production-asset kinds as a reusable library — intros, outros, sponsor reads,
  chapters, subtitles, clips, show notes, schedules — so finished media is assembled, not rebuilt.
- Per-brand presets run the post-approval pipeline automatically (e.g. Decoded: Intro A / Outro B / sponsor after
  first topic / chapters / subtitles / clips / show notes / schedule).
- Presets run downstream of approval — the founder approves a piece and receives finished media.
- Production assets persist in `0140`/`0141`; presets in `0142`/`0143`.
- Phase 2 ties preset output into channel scheduling and lets presets adapt their steps from performance.
