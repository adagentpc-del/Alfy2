# ADR-0040: Knowledge Vault

**Status:** Accepted
**Date:** 2026-06-25

## Context

The mission: knowledge is not valuable until converted into asset → campaign → conversation →
conversion → cash. Everything Alyssa drops in — a book, a transcript, a screenshot, a voice note, a
random idea — should become usable intelligence and then execution, not just storage.

## Decision

Add a `knowledge-vault/` engine in `@alfy2/core`. `drop()` takes any of thirteen input kinds, extracts
the eleven intelligence fields, saves the source to the Asset Library (reference only), and starts the
execution chain by emitting action items. Deterministic heuristics (the AI path swaps in behind the same
surface in Phase 2). Tenant-scoped.

### Thirteen inputs, eleven extractions, then execution

Inputs: book, pdf, youtube_transcript, podcast, course, screenshot, website, github_repo, article,
competitor_page, **voice_note, meeting_notes, random_idea** (the last three extend the earlier Knowledge
Ingestion Engine's source set). For every item the Vault extracts **key ideas, frameworks, tactics,
quotes, examples, business applications, monetization opportunities, related businesses, related agents,
related assets, and action items**. The crucial field is `action_items`: every tactic and monetization
cue becomes an executable step, and `converted_to_actions` counts them — the Vault never just stores.

### Composition, not duplication

The Vault is the mission-framed front door over the existing Knowledge Ingestion Engine (ADR-0030) and
Knowledge-to-Action Converter (ADR-0031): it unifies drop → extract → save → convert, and adds the three
input kinds and three extraction fields (quotes, examples, action_items) those engines didn't carry.

### Contracts & data

`packages/shared/src/contracts/knowledge-vault.ts`: `VaultInputKind` (13), `VaultDrop`,
`VaultExtraction`, `VaultEntry`. Migration 0070 adds `vault_entries` + 0071 RLS. `assetSink` port stores
references, never payloads.

## Consequences

- Every drop becomes intelligence plus a concrete set of next actions, feeding the Execution Queue,
  Campaign Intelligence, and the Sales Asset Generator down the chain to cash.
- Phase 2 swaps the heuristic extractors for the AI Gateway behind the same `drop()` surface and wires
  real media parsing (PDF/audio/video) upstream of `content`.
