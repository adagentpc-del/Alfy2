-- =============================================================================
-- Migration: 0156_asset_lineage.sql
-- Purpose:   Stand up the Alfy² Asset Lineage Graph — a single `asset_lineage`
--            table where every asset knows what created it, what it created, and
--            its footprint (businesses, agents, workflows using it, and revenue
--            it influenced). Backs the Compounding Engine's lineage graph
--            (ADR-0084) on top of the tenant-scoped platform.
--
-- ASSET LINEAGE MODEL
--   - Each row is a LINEAGE record for one asset (`asset_title`): what produced
--     it (`created_by`), what it created (`created_assets`), and its footprint
--     (`businesses_using`, `agents_using`, `workflows_using`,
--     `revenue_influenced_usd`).
--   - Lineage is MUTABLE: as an asset accrues uses and influence over time, the
--     record is updated in place and `version` is bumped on each material change.
--   - The contract exposes `last_updated` as the mutable timestamp. We reuse the
--     shared set_updated_at() trigger from 0001 (which writes new.updated_at), so
--     the table also carries an `updated_at` trigger target; the same trigger
--     mirrors that value into `last_updated` to keep the contract column
--     authoritative.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in 0157_asset_lineage_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- asset_lineage — a lineage record for one asset: what created it, what it
-- created, the businesses/agents/workflows using it, and the revenue it
-- influenced. Mutable; version bumps on material changes. `last_updated` is the
-- contract-facing mutable timestamp; `updated_at` is the shared trigger target.
-- -----------------------------------------------------------------------------
create table if not exists asset_lineage (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  asset_title             text              not null,
  created_by              text              not null default '',
  created_assets          jsonb             not null default '[]'::jsonb,
  businesses_using        jsonb             not null default '[]'::jsonb,
  revenue_influenced_usd  double precision  not null default 0,
  agents_using            jsonb             not null default '[]'::jsonb,
  workflows_using         jsonb             not null default '[]'::jsonb,
  version                 integer           not null default 1 check (version > 0),
  created_at              timestamptz       not null default now(),
  last_updated            timestamptz       not null default now(),
  updated_at              timestamptz
);

create index if not exists asset_lineage_tenant_title_idx
  on asset_lineage (tenant_id, asset_title);

-- -----------------------------------------------------------------------------
-- Mutable-timestamp trigger for asset_lineage. Reuses the shared set_updated_at()
-- from 0001 (do NOT redefine it) to maintain `updated_at`, and a thin companion
-- trigger mirrors the same now() into the contract's `last_updated` column on
-- every UPDATE so the contract-facing timestamp stays authoritative.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_asset_lineage on asset_lineage;
create trigger set_updated_at_asset_lineage
  before update on asset_lineage
  for each row execute function set_updated_at();

create or replace function set_last_updated()
returns trigger
language plpgsql
as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

drop trigger if exists set_last_updated_asset_lineage on asset_lineage;
create trigger set_last_updated_asset_lineage
  before update on asset_lineage
  for each row execute function set_last_updated();
