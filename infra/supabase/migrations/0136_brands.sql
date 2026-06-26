-- =============================================================================
-- Migration: 0136_brands.sql
-- Purpose:   Stand up the Alfy² Brand DNA Engine — a single `brands` table that
--            stores each brand's full identity (voice, tone, writing style,
--            audience, pillars, visual identity, approved assets) so the Media OS
--            always knows which brand a piece of content belongs to and applies the
--            right voice, rules, and assets. Implements Brand DNA on top of the
--            tenant-scoped platform. See docs/adr/ADR-0076-brand-dna.md.
--
-- BRAND DNA MODEL
--   - Each row is ONE BRAND's identity, keyed by one of nine brand keys
--     (alyssa_personal, decoded_podcast, funsies_ai, move_mi, divini_partners,
--     divini_procure, stratalogic, founderos, oralia).
--   - `humor_level` and `professionalism` are 0..1 dials (0 = none, 1 = max).
--   - The array fields (content pillars, hashtags, forbidden topics, approved
--     terminology, preferred colors, approved sponsor blocks, approved templates)
--     are stored as jsonb.
--   - A brand's DNA is upserted/edited over time (overrides over seeded defaults),
--     so the table is Mutable.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in 0137_brands_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- brands — a brand's full identity: voice, tone, writing style, humor and
-- professionalism dials, audience, content pillars, visual identity, CTA style,
-- posting cadence, and the approved asset set (intro, outro, music, sponsor
-- blocks, templates). Keyed by brand; unique per tenant. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists brands (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  key                       text              not null
                                              check (key in (
                                                'alyssa_personal','decoded_podcast','funsies_ai',
                                                'move_mi','divini_partners','divini_procure',
                                                'stratalogic','founderos','oralia')),
  name                      text              not null,
  voice                     text              not null default '',
  tone                      text              not null default '',
  writing_style             text              not null default '',
  humor_level               double precision  not null default 0.3
                                              check (humor_level >= 0 and humor_level <= 1),
  professionalism           double precision  not null default 0.7
                                              check (professionalism >= 0 and professionalism <= 1),
  target_audience           text              not null default '',
  content_pillars           jsonb             not null default '[]'::jsonb,
  visual_identity           text              not null default '',
  cta_style                 text              not null default '',
  posting_cadence           text              not null default '',
  hashtags                  jsonb             not null default '[]'::jsonb,
  forbidden_topics          jsonb             not null default '[]'::jsonb,
  approved_terminology      jsonb             not null default '[]'::jsonb,
  preferred_colors          jsonb             not null default '[]'::jsonb,
  approved_intro            text              not null default '',
  approved_outro            text              not null default '',
  approved_music            text              not null default '',
  approved_sponsor_blocks   jsonb             not null default '[]'::jsonb,
  approved_templates        jsonb             not null default '[]'::jsonb,
  created_at                timestamptz       not null default now(),
  updated_at                timestamptz,
  unique (tenant_id, key)
);

create index if not exists brands_tenant_key_idx
  on brands (tenant_id, key);

-- -----------------------------------------------------------------------------
-- updated_at trigger for brands. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_brands on brands;
create trigger set_updated_at_brands
  before update on brands
  for each row execute function set_updated_at();
