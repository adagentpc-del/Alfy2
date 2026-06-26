-- =============================================================================
-- Migration: 0089_hierarchy_nodes.sql
-- Purpose:   Stand up the Alfy² Enterprise Hierarchy feature — a single
--            `hierarchy_nodes` table that models the operator's enterprise as a
--            tree. Implements Enterprise Hierarchy on top of the tenant-scoped
--            platform.
--
-- ENTERPRISE HIERARCHY MODEL
--   - Nodes form a tree spanning eight levels, top to bottom:
--       Enterprise → Companies → Departments → Teams → Projects → Assets →
--       Tasks → Agents.
--   - Each level INHERITS policies, security, branding, permissions, and assets
--     from the level above it, with company-level OVERRIDES carried on the node's
--     `own` settings.
--   - The tree powers portfolio reporting across companies, surfaces
--     cross-company opportunities, and supports shared vendors / SOPs /
--     compliance reused down the hierarchy.
--   - `parent_id` points at the parent node (null at the enterprise root); `own`
--     holds the node's own overrides layered on top of inherited settings.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0090_hierarchy_nodes_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- hierarchy_nodes — one node in the operator's enterprise tree. Carries its
-- level (enterprise → company → department → team → project → asset → task →
-- agent), its parent, and its own override settings layered on top of the
-- policies/security/branding/permissions/assets inherited from above. Powers
-- portfolio reporting, cross-company opportunities, and shared vendors/SOPs/
-- compliance. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists hierarchy_nodes (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  level       text        not null
                          check (level in (
                            'enterprise','company','department','team',
                            'project','asset','task','agent')),
  name        text        not null,
  parent_id   uuid,
  own         jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create index if not exists hierarchy_nodes_tenant_level_idx
  on hierarchy_nodes (tenant_id, level);

create index if not exists hierarchy_nodes_tenant_parent_idx
  on hierarchy_nodes (tenant_id, parent_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for hierarchy_nodes. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_hierarchy_nodes on hierarchy_nodes;
create trigger set_updated_at_hierarchy_nodes
  before update on hierarchy_nodes
  for each row execute function set_updated_at();
