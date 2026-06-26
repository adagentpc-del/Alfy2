-- =============================================================================
-- Migration: 0066_asset_checklists.sql
-- Purpose:   Stand up the Alfy² Business Asset Checklist feature — a single
--            `asset_checklists` table that tracks whether each business has its
--            key assets in place. Implements the Business Asset Checklist on top
--            of the tenant-scoped platform.
--
-- BUSINESS ASSET CHECKLIST MODEL
--   - Each business is scored against its 25 key assets:
--       logo, domain, email, landing page, social pages, decks, one-pager,
--       pricing, offer, CRM, templates, scripts, onboarding packet, contracts,
--       NDA, terms, privacy policy, SOPs, analytics, payment links, lead list,
--       follow-up sequence, content calendar (plus the remaining key assets).
--   - `present` and `missing` hold the asset kinds the business has and lacks;
--     `completeness` is the fraction in [0,1] of the 25 assets present.
--   - The engine recommends the single fastest asset to create next in
--     `recommended_next` (one of the 25 asset kinds, or null when complete),
--     with the rationale in `recommendation_reason`.
--   - One checklist per business per tenant — uniqueness on (tenant_id,
--     business_name).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0067_asset_checklists_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- asset_checklists — the asset-completeness state for one business: which of the
-- 25 key assets are present, which are missing, the overall completeness
-- fraction, and the engine's recommendation for the fastest asset to create
-- next. One row per business per tenant. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists asset_checklists (
  id                     uuid              primary key default gen_random_uuid(),
  tenant_id              uuid              not null,
  business_id            uuid,
  business_name          text              not null,
  present                jsonb             not null default '[]'::jsonb,
  missing                jsonb             not null default '[]'::jsonb,
  completeness           double precision  not null default 0
                                           check (completeness >= 0 and completeness <= 1),
  recommended_next       text,
  recommendation_reason  text              not null default '',
  created_at             timestamptz       not null default now(),
  updated_at             timestamptz,
  unique (tenant_id, business_name)
);

create index if not exists asset_checklists_tenant_business_idx
  on asset_checklists (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for asset_checklists. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_asset_checklists on asset_checklists;
create trigger set_updated_at_asset_checklists
  before update on asset_checklists
  for each row execute function set_updated_at();
