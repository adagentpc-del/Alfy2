-- =============================================================================
-- Migration: 0085_feature_classifications.sql
-- Purpose:   Stand up the Alfy² FounderOS Commercialization Layer — a single
--            `feature_classifications` table that catalogs every internal
--            feature by its commercialization tier and flags the ones that
--            could one day become standalone SaaS modules.
--
-- FOUNDEROS COMMERCIALIZATION LAYER
--   - Alfy² is Tenant 001 — the first and reference tenant of FounderOS.
--   - Every internal feature is classified by a commercialization tier:
--       personal_only       — only useful to the operator; never sold.
--       business_reusable   — reusable across the operator's own businesses.
--       founder_saas_feature— a candidate to package as a SaaS feature/module.
--       agency_service      — delivered as a done-for-you agency service.
--       enterprise_product  — productized for enterprise sale.
--   - `saas_module_candidate` flags a feature as a possible standalone SaaS
--     module; `readiness` (0..1) tracks how close it is to being commercializable
--     and `rationale` records WHY a tier/candidate call was made.
--   - This is PREPARATION ONLY. `commercialized` stays false until a feature is
--     actually taken to market; nothing here is commercialized yet.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0086_feature_classifications_rls.sql. This file only defines structure; it
-- does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- feature_classifications — one internal feature, classified by commercialization
-- tier and flagged as a possible SaaS module. Carries the rationale behind the
-- call, a 0..1 readiness score, and a commercialized flag (false until actually
-- taken to market). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists feature_classifications (
  id                     uuid              primary key default gen_random_uuid(),
  tenant_id              uuid              not null,
  feature_name           text              not null,
  tier                   text              not null
                                           check (tier in (
                                             'personal_only','business_reusable',
                                             'founder_saas_feature','agency_service',
                                             'enterprise_product')),
  saas_module_candidate  boolean           not null default false,
  rationale              text              not null default '',
  readiness              double precision  not null default 0
                                           check (readiness >= 0 and readiness <= 1),
  commercialized         boolean           not null default false,
  created_at             timestamptz       not null default now(),
  updated_at             timestamptz,
  unique (tenant_id, feature_name)
);

create index if not exists feature_classifications_tenant_tier_idx
  on feature_classifications (tenant_id, tier);

-- -----------------------------------------------------------------------------
-- updated_at trigger for feature_classifications. Reuses set_updated_at() from
-- 0001 (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_feature_classifications on feature_classifications;
create trigger set_updated_at_feature_classifications
  before update on feature_classifications
  for each row execute function set_updated_at();
