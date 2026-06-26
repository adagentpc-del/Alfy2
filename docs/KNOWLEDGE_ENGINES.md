# Knowledge Ingestion & Knowledge-to-Action

Two engines that make sure knowledge gets used: the **Knowledge Ingestion Engine** turns anything Alyssa
saves into structured, connected knowledge, and the **Knowledge-to-Action Converter** turns every useful
idea into an owned, testable action. Both are deterministic and tenant-scoped.

Modules: `packages/core/src/knowledge-ingestion/`, `packages/core/src/knowledge-to-action/`. Contracts:
`packages/shared/src/contracts/knowledge-ingestion.ts`, `.../knowledge-to-action.ts` (mirrored in
`workers/`). Migrations: `0050`–`0053`. ADRs: `docs/adr/ADR-0030-knowledge-ingestion-engine.md`,
`docs/adr/ADR-0031-knowledge-to-action-converter.md`. Smokes: `pnpm ingest:smoke`, `pnpm k2a:smoke`.

## Knowledge Ingestion Engine

Processes the eleven source types — **book, pdf, youtube_transcript, podcast, course, article,
screenshot, note, video, github_repo, competitor_page** — through one ten-step pipeline:

1. summarize
2. extract frameworks
3. extract tactics
4. extract business applications
5. identify which businesses it applies to
6. identify monetization use cases
7. create SOPs if useful
8. create agent suggestions if useful
9. save to the Asset Library (a *reference* via an injected `assetSink` — never the payload)
10. link to relevant goals, campaigns, and businesses

The extraction is heuristic and deterministic; the `assetSink` port lets Phase 2 swap in an AI extractor
behind the gated AI Gateway without changing the contract.

## Knowledge-to-Action Converter

For every useful idea, `convert()` produces all ten elements — **action item, business use case,
implementation plan, revenue hypothesis, required assets, required agents, test plan, owner, deadline,
dashboard card** — plus an **operating manual** (the reusable IP). It then sets a **disposition**:

- **use now** — strong idea, execute it
- **convert_to_campaign** — campaign-shaped and strong (routes to the marketing agent / Campaign Intelligence)
- **save_for_later** — middling value
- **ignore** — too weak to pursue

## Together

Ingestion structures what comes in; the converter turns the useful parts into action. convert_to_campaign
hands off to Campaign Intelligence, required_agents reference the Agent Factory, required_assets the Asset
Library, and each action's owner/deadline feed the Executive Control Tower. Phase 2 auto-converts ingested
items and files the resulting actions into the inbox and dashboard.

## Tenant isolation

Both engines are tenant-scoped, matching the RLS on `ingested_items` and `knowledge_actions`.
