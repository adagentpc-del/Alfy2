-- =============================================================================
-- Migration: 0140_production_assets.sql
-- Purpose:   Stand up the Alfy² Production Studio — a single `production_assets`
--            table that stores reusable production assets (intros, outros, sponsor
--            ads, music, transitions, brand animations, logos, watermarks, b-roll,
--            fonts, graphics, lower thirds, episode/video/thumbnail templates,
--            caption styles, editing rules) per brand. Implements the Production
--            Studio on top of the tenant-scoped platform. See
--            docs/adr/ADR-0078-production-studio.md.
--
-- PRODUCTION STUDIO MODEL
--   - Each row is ONE STORED PRODUCTION ASSET (a reference, never the payload),
--     scoped to one brand (one of nine: alyssa_personal, decoded_podcast,
--     funsies_ai, move_mi, divini_partners, divini_procure, stratalogic,
--     founderos, oralia).
--   - `kind` is one of seventeen production asset kinds (intro, outro, sponsor_ad,
--     music, transition, brand_animation, logo, watermark, b_roll, font, graphic,
--     lower_third, episode_template, video_template, thumbnail_template,
--     caption_style, editing_rule).
--   - `asset_ref` points at the underlying asset in the Asset Library.
--   - Mutable: stored assets are renamed and repointed over time.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in 0141_production_assets_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- production_assets — a stored, reusable production asset (reference, never the
-- payload), scoped to one brand and one of seventeen production asset kinds.
-- Mutable.
-- -----------------------------------------------------------------------------
create table if not exists production_assets (
  id          uuid              primary key default gen_random_uuid(),
  tenant_id   uuid              not null,
  brand       text              not null
                                check (brand in (
                                  'alyssa_personal','decoded_podcast','funsies_ai','move_mi',
                                  'divini_partners','divini_procure','stratalogic','founderos','oralia')),
  kind        text              not null
                                check (kind in (
                                  'intro','outro','sponsor_ad','music','transition','brand_animation',
                                  'logo','watermark','b_roll','font','graphic','lower_third',
                                  'episode_template','video_template','thumbnail_template',
                                  'caption_style','editing_rule')),
  name        text              not null,
  asset_ref   text              not null default '',
  created_at  timestamptz       not null default now(),
  updated_at  timestamptz
);

create index if not exists production_assets_tenant_brand_idx
  on production_assets (tenant_id, brand);

-- -----------------------------------------------------------------------------
-- updated_at trigger for production_assets. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_production_assets on production_assets;
create trigger set_updated_at_production_assets
  before update on production_assets
  for each row execute function set_updated_at();
