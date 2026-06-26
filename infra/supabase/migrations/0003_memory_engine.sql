-- =============================================================================
-- Migration: 0003_memory_engine.sql
-- Purpose:   Create the Alfy² Memory Engine tables — the atomic memory record
--            and the typed graph edges between memories. Implements TECH_SPEC.md
--            (Memory Engine: structured, scored, linkable long-term memory that
--            supersedes the flat key/value `memory` table from 0001).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared set_updated_at()
--     trigger (defined in 0001 — reused here, NOT redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0004_memory_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- memories — the atomic memory record. Mutable: importance/confidence/status and
-- usage stats evolve over the record's life. Each row is one durable fact the
-- engine can recall, score, link, and prune.
-- -----------------------------------------------------------------------------
create table if not exists memories (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  kind          text        not null
                            check (kind in (
                              'business','project','person','company','meeting',
                              'conversation','task','idea','preference','pattern',
                              'vehicle','home','doctor','contract','subscription',
                              'account','health_event','decision','lesson'
                            )),
  title         text        not null,
  body          text        not null default '',
  attributes    jsonb       not null default '{}'::jsonb,
  importance    real        not null default 0.5
                            check (importance >= 0 and importance <= 1),
  confidence    real        not null default 0.6
                            check (confidence >= 0 and confidence <= 1),
  source        text        not null,
  source_ref    text,
  keywords      text[]      not null default '{}',
  status        text        not null default 'active'
                            check (status in ('active','archived','superseded')),
  use_count     integer     not null default 0,
  last_used_at  timestamptz,
  expires_at    timestamptz,
  superseded_by uuid        references memories(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  -- Generated full-text search vector over title + body + keywords.
  search_tsv    tsvector    generated always as (
                  to_tsvector(
                    'english',
                    coalesce(title, '') || ' ' ||
                    coalesce(body, '')  || ' ' ||
                    array_to_string(keywords, ' ')
                  )
                ) stored
);

-- Indexes on memories.
create index if not exists memories_search_tsv_idx     on memories using gin (search_tsv);
create index if not exists memories_keywords_idx       on memories using gin (keywords);
create index if not exists memories_attributes_idx     on memories using gin (attributes);
create index if not exists memories_tenant_kind_idx    on memories (tenant_id, kind);
create index if not exists memories_tenant_importance_idx
                                                       on memories (tenant_id, importance desc);
create index if not exists memories_tenant_last_used_idx
                                                       on memories (tenant_id, last_used_at);
create index if not exists memories_tenant_status_idx  on memories (tenant_id, status);

-- -----------------------------------------------------------------------------
-- memory_links — typed graph edges between memories. Directed: from → to with a
-- relation and a weight. Cascades on delete so edges never dangle.
-- -----------------------------------------------------------------------------
create table if not exists memory_links (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null,
  from_memory_id  uuid        not null references memories(id) on delete cascade,
  to_memory_id    uuid        not null references memories(id) on delete cascade,
  relation        text        not null
                              check (relation in (
                                'related_to','about','derived_from','supersedes',
                                'contradicts','owns','works_at','attended',
                                'member_of','scheduled_for','depends_on','mentions',
                                'located_at','treats','subscribes_to','decided',
                                'learned_from'
                              )),
  weight          real        not null default 1
                              check (weight >= 0 and weight <= 1),
  created_at      timestamptz not null default now(),
  unique (tenant_id, from_memory_id, to_memory_id, relation)
);

create index if not exists memory_links_tenant_from_idx on memory_links (tenant_id, from_memory_id);
create index if not exists memory_links_tenant_to_idx   on memory_links (tenant_id, to_memory_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for memories (the only mutable table here). Reuses the
-- shared set_updated_at() function defined in 0001 — do NOT redefine it.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_memories on memories;
create trigger set_updated_at_memories
  before update on memories
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- memory_prune_candidates — raw eviction scoring for active memories.
--
-- prune_score = (1 - importance) * (1 - confidence) * (1 / (1 + use_count))
-- i.e. low-importance, low-confidence, rarely-used memories score HIGHEST and
-- surface first. Ordered by prune_score desc.
--
-- This view is ONLY the raw candidate scoring. The Memory Engine applies its own
-- thresholds plus pinned/expiry rules (e.g. honoring expires_at, never evicting
-- pinned or recently-created records) on top of this list before deleting or
-- archiving anything.
--
-- NOTE ON RLS: a view runs with the privileges of its base table(s) and inherits
-- their Row-Level Security. Because `memories` is RLS-scoped per tenant in
-- 0004_memory_rls.sql, this view is automatically tenant-scoped too — so no
-- separate RLS is enabled (or possible) on the view itself.
-- -----------------------------------------------------------------------------
create or replace view memory_prune_candidates as
  select
    id,
    tenant_id,
    kind,
    title,
    importance,
    confidence,
    use_count,
    last_used_at,
    created_at,
    (1 - importance) * (1 - confidence) * (1.0 / (1 + use_count)) as prune_score
  from memories
  where status = 'active'
  order by prune_score desc;
