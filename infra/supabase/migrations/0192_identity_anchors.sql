-- =============================================================================
-- Migration: 0192_identity_anchors.sql
-- Purpose:   Stand up the Identity OS — a single `identity_anchors` table that
--            stores Alyssa's identity anchors (mission, core value, long-term
--            vision, personal/business philosophy, non-negotiable, lifestyle /
--            family / health / legacy goal, never-sacrifice), each with a
--            statement and a weight, so every major recommendation can be checked
--            against them. Identity OVERRIDES optimization whenever they conflict.
--            Implements ADR-0122-identity-os on the tenant-scoped platform.
--
-- IDENTITY ANCHOR MODEL
--   - Each row is a stored identity anchor: its `kind`, the `statement`, and a
--     `weight` (higher = weightier; non-negotiables/never-sacrifice should be
--     high).
--   - Anchors are revised as Alyssa's identity is refined — statement and weight
--     are UPDATED in place — so the table is MUTABLE: it carries updated_at and
--     the shared set_updated_at() trigger from 0001 (reused here, not redefined).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then full CRUD policies scope
--   rows to the current tenant via current_setting('app.tenant_id', true).
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- identity_anchors — a stored identity anchor, updated in place as Alyssa's
-- identity is revised. Mutable (carries updated_at + set_updated_at trigger).
-- -----------------------------------------------------------------------------
create table if not exists identity_anchors (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  kind              text              not null check (kind in (
                                        'mission', 'core_value', 'long_term_vision', 'personal_philosophy',
                                        'business_philosophy', 'non_negotiable', 'lifestyle_goal',
                                        'family_goal', 'health_priority', 'legacy_goal', 'never_sacrifice')),
  statement         text              not null,
  weight            numeric           not null check (weight >= 0 and weight <= 1),
  created_at        timestamptz       not null default now(),
  updated_at        timestamptz
);

create index if not exists identity_anchors_tenant_created_idx
  on identity_anchors (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for identity_anchors. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_identity_anchors on identity_anchors;
create trigger set_updated_at_identity_anchors
  before update on identity_anchors
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Enable RLS on identity_anchors (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table identity_anchors enable row level security;

-- =============================================================================
-- identity_anchors — mutable: an anchor is recorded, then updated in place as
-- Alyssa's identity is revised. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy identity_anchors_select on identity_anchors
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy identity_anchors_insert on identity_anchors
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy identity_anchors_update on identity_anchors
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy identity_anchors_delete on identity_anchors
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
