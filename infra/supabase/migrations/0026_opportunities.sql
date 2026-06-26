-- =============================================================================
-- Migration: 0026_opportunities.sql
-- Purpose:   Stand up the Alfy² Opportunity Intelligence feature — a single
--            `opportunities` table that holds the ranked opportunities the
--            engine surfaces to the operator. Implements Opportunity
--            Intelligence on top of the tenant-scoped platform.
--
-- OPPORTUNITY INTELLIGENCE MODEL
--   - The engine continuously analyzes TEN entity sources across the operator's
--     world — contacts, businesses, vendors, investors, clients, ideas, github
--     repos, assets, conversations, and market trends — and looks for
--     relationships BETWEEN them.
--   - Each discovered relationship is classified by `kind`:
--       fit, introduction, solves, investment, partnership, synergy,
--       trend_tailwind.
--   - An opportunity connects a `source` entity to a `target` entity. Both are
--     stored as EntityRef snapshots (ref_id, kind, name, business_id, tags,
--     keywords, attributes) so the opportunity stays meaningful even as the
--     underlying entities change.
--   - `rationale` explains why the relationship matters; `evidence` carries the
--     supporting signals the engine used to reach it.
--   - Every opportunity is RANKED. `scores` holds six 0..1 dimensions —
--       revenue, probability, effort, risk, strategic_value, composite —
--     where `composite` is the blended rank the surfacing order is driven by.
--   - The engine attaches a `recommended_action` plus the
--     `recommended_agents` best suited to act on it.
--   - An opportunity moves through a lifecycle:
--       new → surfaced → accepted (or dismissed) → acted.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0027_opportunities_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- opportunities — a ranked opportunity surfaced by the engine after analyzing
-- the ten entity sources and finding a relationship between a source and target
-- entity (both stored as EntityRef snapshots). Classified by `kind`, scored on
-- revenue/probability/effort/risk/strategic_value (composite drives surfacing
-- order), carries a rationale + evidence + recommended action/agents, and moves
-- through a status lifecycle. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists opportunities (
  id                   uuid          primary key default gen_random_uuid(),
  tenant_id            uuid          not null,
  kind                 text          not null
                                     check (kind in (
                                       'fit','introduction','solves','investment',
                                       'partnership','synergy','trend_tailwind')),
  title                text          not null,
  source               jsonb         not null default '{}'::jsonb,
  target               jsonb         not null default '{}'::jsonb,
  rationale            text          not null default '',
  evidence             jsonb         not null default '[]'::jsonb,
  scores               jsonb         not null default '{}'::jsonb,
  recommended_action   text          not null default '',
  recommended_agents   jsonb         not null default '[]'::jsonb,
  status               text          not null default 'new'
                                     check (status in (
                                       'new','surfaced','accepted','dismissed','acted')),
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz
);

create index if not exists opportunities_tenant_status_idx
  on opportunities (tenant_id, status);

create index if not exists opportunities_tenant_kind_idx
  on opportunities (tenant_id, kind);

-- -----------------------------------------------------------------------------
-- updated_at trigger for opportunities. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_opportunities on opportunities;
create trigger set_updated_at_opportunities
  before update on opportunities
  for each row execute function set_updated_at();
