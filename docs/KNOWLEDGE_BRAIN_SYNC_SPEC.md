# Knowledge Brain Sync — Spec

One brain, many mouths. How Alfy2's knowledge layer stays the single source of truth and syncs with the
outside brains (Obsidian/local vault, Google Drive, conversation transcripts). The internal brain exists;
**sync is the missing piece** (audit: no Obsidian/Drive sync code anywhere).

**Existing machinery (canonical):**
- `memory` — the permanent brain (`docs/MEMORY_ENGINE.md`): engine + scoring + Pg repository (live).
- `knowledge-ingestion` (11 source types, 10-step pipeline) + `knowledge-to-action` (ADR-0030/0031).
- `source-of-truth` (ADR-0026) — 9 knowledge kinds, confidence + freshness + verification TTLs.
- `knowledge-graph` (ADR-0054), `knowledge-vault` (ADR-0040), `knowledge-ops` (migration `0235`),
  `institutional-memory` (append-only), `global-assets` (Asset Library, by-reference).

## Sync architecture (new)

Per the critical architecture rule: Alfy2 does not become a notes app — it syncs *knowledge*, not files.

```
Obsidian vault ──(markdown + frontmatter)──┐
Google Drive docs ─────────────────────────┼── Ingest adapter (MOCK first)
Conversation exports (Fable/ChatGPT) ──────┘        │
                                            knowledge-ingestion pipeline
                                            (summarize → frameworks → tactics → business application
                                             → monetization → SOPs → link to goals/campaigns)
                                                    │
                              memory + knowledge-graph + vault (stored, scored, linked)
                                                    │
Obsidian vault ◄──(digest notes: decisions,   export adapter (write-back)
                   briefs, playbooks)
```

- **Inbound**: watched folders/exports land as `ingested_items`; frontmatter carries business/topic hints;
  every item passes source-of-truth classification (kind, confidence, freshness) — imported text is
  *claimed* knowledge until verified, never silently trusted.
- **Outbound**: Alfy2 writes digest notes back (daily brief, decisions with rationale, generated playbooks)
  into a dedicated vault folder — Alyssa's local brain stays current without manual copying.
- **Identity**: dedupe by content hash + title; re-imports update, never duplicate ("never created twice").
- **Conflict rule**: Alfy2's verified facts outrank imported notes; conflicts surface as verification
  tasks for the Knowledge Manager agent, not silent overwrites.

## Planned modules (house pattern)

| Piece | Path |
|---|---|
| Contract | `packages/shared/src/contracts/knowledge-sync.ts` (sync source, item mapping, sync run, conflict) |
| Engine | `packages/core/src/knowledge-sync/` (deterministic mapping + run ledger; adapters injected) |
| Mock adapter | in-memory vault fixture proving round-trip (import → ingest → export digest) |
| Smoke | `scripts/knowledge-sync-smoke.mts` |
| Live adapters | later: filesystem/Drive connector via connector registry; **read scopes first, write-back to one dedicated folder only** |

## Rules

1. Sync is logged like any agent action: every run records items in/out, conflicts, skips.
2. No deletion propagation in v1 — removing a note in Obsidian never deletes Alfy2 knowledge (append-only
   bias; institutional memory is never edited).
3. Private/health/identity content respects module boundaries (Personal OS scoping) — business agents
   never see personal vault folders.
4. Sync freshness is a Mission Control signal: a stale brain (> N days since last successful run) is an
   alert, because every engine downstream degrades silently otherwise.
