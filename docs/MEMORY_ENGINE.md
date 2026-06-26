# Alfy² — Memory Engine

Alfy²'s permanent brain. A durable, tenant-scoped, queryable knowledge graph of everything the
operator cares about. Deterministic (no AI), explainable, and built behind a repository port so the
storage backend can change without touching the engine. Decision record: [`adr/ADR-0002`](./adr/ADR-0002-memory-engine.md).

## What it remembers (`kind`)
`business · project · person · company · meeting · conversation · task · idea · preference · pattern ·
vehicle · home · doctor · contract · subscription · account · health_event · decision · lesson`

One `memories` table, one `kind` field, plus `attributes jsonb` for type-specific fields. Add a kind
by extending the enum — no per-type table.

## Every memory carries
`importance` (0..1) · `confidence` (0..1) · `last_used_at` + `use_count` · `source` (+`source_ref`) ·
relationships (via `memory_links`) · `keywords` (+ a generated full-text `search_tsv`). Plus
`status` (active/archived/superseded), `expires_at` (TTL), and `superseded_by`.

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/memory.ts` (+ Pydantic mirror in `workers/`) |
| Engine + scoring + port | `packages/core/src/memory/` |
| In-memory reference store | `packages/core/src/memory/in-memory-repository.ts` |
| Persistent schema | `infra/supabase/migrations/0003_memory_engine.sql`, `0004_memory_rls.sql` |
| Smoke test | `scripts/memory-smoke.mts` (`pnpm run memory:smoke`) |

## API (`MemoryEngine`, all tenant-scoped)
- `remember(tenantId, input)` — store a new memory (defaults applied; id + timestamps assigned).
- `recall(tenantId, query)` — ranked retrieval; **reinforces** each returned memory (`use_count++`, `last_used_at = now`).
- `get(tenantId, id)` — direct fetch (no reinforcement).
- `reinforce(tenantId, id, {importance?, confidence?})` — nudge weights (clamped 0..1), mark used.
- `revise(tenantId, id, patch)` — edit fields; only provided fields change.
- `supersede(tenantId, oldId, input)` — create the new version, mark old `superseded`, link `new --supersedes--> old`.
- `link(tenantId, fromId, toId, relation, weight?)` — typed graph edge.
- `neighbors / relatedMemories(tenantId, id, relation?)` — traverse the graph.
- `prune(tenantId, {hardDelete?})` — evict disposable/expired memories (archive by default).
- `forget(tenantId, id, hardDelete?)` — archive or delete one memory.

## Retrieval scoring
`score = w_rel·relevance + w_imp·importance + w_conf·confidence + w_rec·recency`
(defaults: relevance .40, importance .25, confidence .15, recency .20). `relevance` is keyword/text
overlap between the query and the memory's title/body/keywords. `recency` is exponential decay on
`last_used_at` (falling back to `created_at`) with a configurable half-life (default 30 days).

## Pruning policy
A memory is pruned if it is **expired** (`expires_at` passed) OR it is not **pinned**
(`importance < 0.8`) and its `pruneScore` exceeds a threshold (default 0.5), where
`pruneScore = (1-importance)·(1-confidence)·(1/(1+use_count))·staleness`. The SQL view
`memory_prune_candidates` exposes the base score for DB-side inspection; the engine layers staleness,
pinning, and expiry on top. Default mode **archives** (recoverable); `hardDelete` removes the memory
and its links.

## Boundaries
- All ranking/pruning math lives in the engine (`scoring.ts`) — the repository only prefilters, so the
  logic is portable and reproducible.
- No external services. Runs today on the in-memory repository; the Supabase store drops in behind the
  same `MemoryRepository` port (Phase 2 wiring).
- A semantic/embedding retrieval layer can be added behind the port later without changing the API.
