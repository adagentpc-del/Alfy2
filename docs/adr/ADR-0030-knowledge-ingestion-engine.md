# ADR-0030: Knowledge Ingestion Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alyssa consumes a lot — books, PDFs, transcripts, podcasts, courses, articles, screenshots, notes,
videos, GitHub repos, competitor pages. Most of it is read once and lost. The platform should turn
anything she uploads or saves into structured, reusable knowledge that's already connected to her
businesses, goals, and campaigns.

## Decision

Add a `knowledge-ingestion/` engine in `@alfy2/core` that processes any saved item through a fixed
ten-step pipeline. Deterministic heuristics (no AI). Tenant-scoped.

### Eleven source types, one pipeline

`ingest(input)` accepts the eleven source types and runs every step the request lists:

1. **summarize** — the lead sentences
2. **extract frameworks** — capitalized "X framework/model/method" phrases
3. **extract tactics** — sentences that read like actionable advice
4. **extract business applications** — derived from the frameworks and tactics
5. **identify which businesses it applies to** — match supplied business names in the text
6. **identify monetization use cases** — sentences with revenue/offer/pricing language
7. **create SOPs if useful** — when the content describes a process
8. **create agent suggestions if useful** — when it describes recurring/automatable work
9. **save to the Asset Library** — store a *reference* (an injected `assetSink`, never the payload)
10. **link to relevant goals, campaigns, and businesses** — by mention or by business relevance

### Contracts & data

`packages/shared/src/contracts/knowledge-ingestion.ts`: `KnowledgeSourceType`, `IngestedItem`,
`IngestInput`. Migration 0050 adds `ingested_items` + 0051 deny-by-default RLS.

## Consequences

- Saved material becomes structured, queryable knowledge that's already wired into the right businesses,
  goals, and campaigns — not a dead bookmark.
- It stores a reference into the Global Asset Library, so ingested knowledge is searchable alongside
  everything else, and never holds the raw payload.
- The extraction is heuristic and deterministic today; the `assetSink` port and the pipeline shape let
  Phase 2 swap in an AI extractor (behind the gated AI Gateway) without changing the contract, and feed
  the outputs to the Knowledge-to-Action Converter.
