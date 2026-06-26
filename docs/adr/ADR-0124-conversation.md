# ADR-0124: Conversation Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

The primary interface to Alfy² should be conversation, not forms. Alyssa thinks out loud — and natural speech, when
listened to properly, contains tasks, assets, agents, businesses, workflows, knowledge, and capital moves. The
engine's job is to be a thinking partner that extracts all of it and quietly stages the work, while **nothing
executes without approval**.

## Decision

Add a `conversation/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`converse()`** acts as a **thinking
partner**: it turns natural speech into structured extractions across **tasks / assets / agents / businesses /
workflows / knowledge / capital**, each staged for approval. The invariant: **nothing executes without approval** —
the engine proposes and stages; the founder decides. It is **distinct from the Conversion Engine** (ADR-0032):
Conversation is the dialogue interface, Conversion optimizes revenue surfaces.

### Contracts & data

`packages/shared/src/contracts/conversation.ts`: `Utterance`, `ConversationExtraction`, `ExtractionKind`,
`ConversationTurn`. Migration `0194` stores `conversation_extractions` **append-only**. Smoke `pnpm identity:smoke`.

## Consequences

- `converse()` extracts tasks / assets / agents / businesses / workflows / knowledge / capital from natural speech;
  nothing executes without approval.
- Extractions are append-only (`0194`).
- Distinct from the Conversion Engine (ADR-0032); reads the Identity OS (ADR-0122) before staging, and routes
  extractions through the Founder Operating Principle (ADR-0050). Vision Builder (ADR-0125) is its idea-shaped sibling.
