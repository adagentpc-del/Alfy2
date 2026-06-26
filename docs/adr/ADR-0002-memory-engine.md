# ADR-0002 — Memory Engine

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
Alfy² needs a permanent brain: a durable, queryable record of the things the operator cares about
(businesses, projects, people, companies, meetings, conversations, tasks, ideas, preferences,
patterns, vehicles, homes, doctors, contracts, subscriptions, accounts, health history, decision
history, lessons learned). Each memory must carry importance, confidence, last-used, source,
relationships, and search keywords, and the system must retrieve, update, prune, and link memories.

The Phase-1 platform already had a generic `memory` key/value table — too thin for this. We needed a
first-class subsystem.

## Decision
1. **One record type, many kinds.** A single `memories` table with a `kind` from a fixed catalog and
   a flexible `attributes jsonb` for type-specific fields — rather than 19 bespoke tables. Adding a
   new kind is a one-line enum change, not a migration per type.
2. **A typed graph for relationships.** A `memory_links` table holds directed, weighted, typed edges
   (`works_at`, `owns`, `treats`, `supersedes`, …) so memories form a knowledge graph.
3. **Deterministic scoring, no AI.** Retrieval and pruning use explicit formulas (relevance ×
   importance × confidence × recency for recall; an inverse formula for eviction). This keeps the
   brain cheap, reproducible, and testable, consistent with the cost-control posture.
4. **Engine in core, behind a repository port.** `MemoryEngine` lives in `packages/core/memory` and
   talks to a `MemoryRepository` interface. The Supabase-backed store is injected later; an
   in-memory reference implementation runs today. The kernel stays infrastructure-free.
5. **History over destruction.** Updates can `supersede` (keep the old, link the new) and pruning
   defaults to **archive**, not delete. Memories are recoverable; hard-delete is opt-in.
6. **Reinforcement on use.** Recalling a memory increments `use_count` and refreshes `last_used_at` —
   frequently-useful memories naturally resist pruning.

## Consequences
- **Positive:** uniform API across all 19 kinds; a real relationship graph; cheap deterministic
  retrieval; tenant isolation via RLS; clean path to swap the in-memory repo for Supabase.
- **Cost:** `attributes jsonb` is schemaless, so per-kind field validation is the caller's job until
  per-kind attribute schemas are added (future). Relevance scoring is keyword/text overlap, not
  semantic — good enough now; a vector/embedding retrieval layer can be added behind the same port
  later without changing the engine API.
- **Mitigation:** contracts are in `packages/shared` (Zod) mirrored by Pydantic and proven by shared
  fixtures, so any future field changes stay in lockstep across runtimes.

## Alternatives considered
- **A table per kind:** strong typing per entity, but 19 migrations and a different query path each;
  rejected for velocity and uniformity.
- **Pure key/value memory:** too thin for importance/confidence/relationships/retrieval ranking.
- **Embedding-based semantic retrieval now:** higher quality recall but adds a model dependency and
  cost up front; deferred — the repository port leaves room to add it later.
