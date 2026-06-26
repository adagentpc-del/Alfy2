-- =============================================================================
-- Migration: 0142_production_presets.sql
-- Purpose:   Stand up the Alfy² Production Studio per-brand preset — a single
--            `production_presets` table that holds, per brand, the automated
--            post-approval production pipeline. Implements Production Studio on
--            top of the tenant-scoped platform.
--
-- PRODUCTION STUDIO MODEL
--   - Each row is ONE preset for ONE brand: the reusable intro/outro, where
--     sponsor blocks get inserted (`sponsor_placement`), the graphics style, and
--     the ordered `auto_steps` that run automatically AFTER approval (e.g.
--     Decoded: Intro A, Outro B, Sponsor 1 after the first topic, blue graphics,
--     chapters, subtitles, clips, show notes, description, schedule).
--   - `brand` is one of the nine Alfy² brands.
--   - A preset is edited over time as the brand's production recipe evolves, so
--     the table is MUTABLE: it carries updated_at and the shared trigger.
--   - One preset per brand per tenant — `unique (tenant_id, brand)` — matching the
--     upsert semantics in the contract.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0143_production_presets_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- production_presets — a per-brand automated post-approval production pipeline.
-- Holds the intro/outro, sponsor placement, graphics style, and the ordered
-- auto_steps the engine runs after approval. One per (tenant, brand). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists production_presets (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  brand              text              not null
                                       check (brand in (
                                         'alyssa_personal','decoded_podcast','funsies_ai',
                                         'move_mi','divini_partners','divini_procure',
                                         'stratalogic','founderos','oralia')),
  intro              text              not null default '',
  outro              text              not null default '',
  sponsor_placement  text              not null default '',
  graphics_style     text              not null default '',
  auto_steps         jsonb             not null default '[]'::jsonb,
  created_at         timestamptz       not null default now(),
  updated_at         timestamptz,
  unique (tenant_id, brand)
);

create index if not exists production_presets_tenant_brand_idx
  on production_presets (tenant_id, brand);

-- -----------------------------------------------------------------------------
-- updated_at trigger for production_presets. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_production_presets on production_presets;
create trigger set_updated_at_production_presets
  before update on production_presets
  for each row execute function set_updated_at();
