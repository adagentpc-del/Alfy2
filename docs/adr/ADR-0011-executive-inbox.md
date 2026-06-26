# ADR-0011 — Executive Inbox

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
Alyssa should never have to decide where something belongs. Anything — a voice note, screenshot, PDF,
email, GitHub link, receipt, contract, business card, a stray thought — should be droppable into one
place and come out identified, classified, routed, linked, and enriched. This is the **single entry
point** and intended primary interaction surface for Alfy².

## Decision
1. **A composer, not a new brain.** The Executive Inbox COMPOSES the engines already built. It adds
   two new pieces — item-type **detection** and inbox **category classification** — and orchestrates
   the rest: the Decision Engine (urgency, agents, approvals, automation), the Memory Engine (link to
   existing memories via `peek`; save reusable memory via `remember`), business matching, and the
   approval gate. Almost all the intelligence already existed; the inbox is the front door to it.
2. **One drop, one rich result.** `process()` returns a `ProcessedInboxItem` carrying everything the
   brief requires per item: unique id, timestamp, source, item type, category, confidence,
   suggested business, suggested owner, urgency (+level), next action, linked entities, suggested
   tasks, missing info, recommended agents, saved-memory id, an approval flag with reason, a
   dashboard-updated flag, and an explanation.
3. **Deterministic and explainable.** Detection and classification use explicit cues (file extensions,
   URL/GitHub patterns, keyword signals, item-type → category precedence, then a fallback to the
   Decision Engine's category). No AI in the default path; every routing decision is explainable.
4. **Approval only when necessary.** Money-moving items (invoices), legal/contract commitments, and
   anything the Decision Engine flags as irreversible set `requires_approval`; everything else flows
   through without interrupting the operator.
5. **Everything is captured.** Each item is saved as a reusable memory (kind inferred from type +
   category) so the inbox feeds the rest of the system, and persisted to `inbox_items` (tenant-scoped,
   RLS) as the durable record.

## Consequences
- **Positive:** a true zero-decision front door; consistent enrichment for every input; the inbox
  becomes the primary surface and naturally drives the dashboards, tasks, memory graph, and agent
  recommendations from one place. It reuses nine engines, so it was small to build.
- **Cost:** detection and classification are heuristic — unusual phrasings or media with no text can
  be mis-typed; real media parsing (OCR, transcription, PDF/email extraction) is out of scope here and
  is supplied as `content` for now. The actual invoice due-date vs the generic recommended deadline can
  differ until extraction is wired.
- **Mitigation:** `content` is the single extension point — a transcription/OCR/extraction step
  (behind the AI Gateway or external connectors in Phase 2) fills it without changing the inbox; the
  classifier cues are data and easy to tune; every field is explainable for correction.

## Alternatives considered
- **Multiple typed inboxes (one per category):** reintroduces the exact decision the brief says to
  eliminate ("where does this go?"). Rejected — one door, automatic routing.
- **AI-first parsing/classification up front:** higher ceiling but adds cost/opacity to the highest-
  frequency surface; deferred behind the deterministic floor and the `content` extension point.
- **A bespoke classifier separate from the Decision Engine:** duplicates logic; instead the inbox
  reuses the Decision Engine and only adds item-type detection + the inbox-specific category mapping.
