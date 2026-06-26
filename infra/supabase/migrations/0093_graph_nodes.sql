-- =============================================================================
-- Migration: 0093_graph_nodes.sql
-- Purpose:   Stand up the Alfy² Enterprise Knowledge Graph — two tables,
--            `graph_nodes` and `graph_edges`, that together store the operator's
--            knowledge graph. Implements the Knowledge Graph on top of the
--            tenant-scoped platform.
--
-- ENTERPRISE KNOWLEDGE GRAPH MODEL
--   - `graph_nodes` are the entities in the graph: one of 15 node kinds (person,
--     business, project, task, document, asset, meeting, github_repo,
--     automation, goal, workflow, agent, vendor, investor, competitor). Each
--     node carries a name, a free-form `ref_id` linking it back to its source
--     record, and `tags`.
--   - `graph_edges` are the TYPED RELATIONSHIPS between nodes: a directed edge
--     from one node to another, labelled by `relationship` and carrying a
--     `weight` in [0,1] for graph-based recommendations.
--   - The graph is searchable, visualizable, and supports graph-based
--     recommendations across the operator's surface.
--   - Both tables are CAPTURE RECORDS: nodes and edges are recorded facts, not
--     edited in place. Neither has an updated_at and neither gets a trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; these are capture records, so they have
--     none and get no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0094_graph_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- graph_nodes — an entity in the knowledge graph, one of 15 kinds, with a name,
-- a free-form ref_id back to its source record, and tags. A capture record (no
-- updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists graph_nodes (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  kind        text        not null
                          check (kind in (
                            'person','business','project','task','document',
                            'asset','meeting','github_repo','automation','goal',
                            'workflow','agent','vendor','investor','competitor')),
  name        text        not null,
  ref_id      text        not null default '',
  tags        jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists graph_nodes_tenant_kind_idx
  on graph_nodes (tenant_id, kind);

-- -----------------------------------------------------------------------------
-- graph_edges — a typed, directed, weighted relationship between two graph
-- nodes. `from_id`/`to_id` reference the endpoints, `relationship` labels the
-- edge, and `weight` in [0,1] drives graph-based recommendations. A capture
-- record (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists graph_edges (
  id            uuid              primary key default gen_random_uuid(),
  tenant_id     uuid              not null,
  from_id       uuid              not null,
  to_id         uuid              not null,
  relationship  text              not null,
  weight        double precision  not null default 0.5
                                  check (weight >= 0 and weight <= 1),
  created_at    timestamptz       not null default now()
);

create index if not exists graph_edges_tenant_from_idx
  on graph_edges (tenant_id, from_id);

create index if not exists graph_edges_tenant_to_idx
  on graph_edges (tenant_id, to_id);
