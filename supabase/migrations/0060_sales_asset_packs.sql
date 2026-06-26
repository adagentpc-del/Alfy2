-- =============================================================================
-- Migration: 0060_sales_asset_packs.sql
-- Purpose:   Stand up the Alfy² Sales Asset Generator — a single
--            `sales_asset_packs` table that holds the generated sales assets for
--            a business, saved to the Asset Library. Implements the Sales Asset
--            Generator on top of the tenant-scoped platform.
--
-- SALES ASSET GENERATOR MODEL
--   - For a given business, the engine generates 12 sales asset kinds:
--       one-pager, pitch deck, investor deck, sales deck, proposal,
--       email sequence, DM script, call script, objection handling, FAQ,
--       case study template, onboarding packet.
--   - The generated assets are stored on `assets` (a JSONB array) and the whole
--     pack is saved to the operator's Asset Library for reuse.
--   - A pack is mutable: assets are regenerated and refreshed over time, so
--     `updated_at` is maintained by the shared trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0061_sales_asset_packs_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sales_asset_packs — the generated sales assets for one business, saved to the
-- Asset Library. `assets` holds the 12 generated asset kinds. Mutable: packs are
-- regenerated and refreshed over time.
-- -----------------------------------------------------------------------------
create table if not exists sales_asset_packs (
  id             uuid              primary key default gen_random_uuid(),
  tenant_id      uuid              not null,
  business_id    uuid,
  business_name  text              not null,
  assets         jsonb             not null default '[]'::jsonb,
  created_at     timestamptz       not null default now(),
  updated_at     timestamptz
);

create index if not exists sales_asset_packs_tenant_business_idx
  on sales_asset_packs (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for sales_asset_packs. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_sales_asset_packs on sales_asset_packs;
create trigger set_updated_at_sales_asset_packs
  before update on sales_asset_packs
  for each row execute function set_updated_at();
