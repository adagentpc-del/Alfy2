-- =============================================================================
-- Migration: 0095_operating_manuals.sql
-- Purpose:   Stand up the Alfy² Operating Manual Generator — a single
--            `operating_manuals` table that captures the reusable IP a workflow
--            produces once it stabilizes. Implements Operating Manuals on top of
--            the tenant-scoped platform.
--
-- OPERATING MANUAL MODEL
--   - When a workflow STABILIZES, the engine generates its operating manual and
--     stores it in the Asset Library: the SOP, checklist, playbook, onboarding
--     guide, training material, troubleshooting guide, KPIs, and ownership
--     matrix. These generated documents live in `artifacts`.
--   - Every successful workflow is REUSABLE IP — `reusable_ip` is true by
--     default, marking the manual as an asset the operator can redeploy.
--   - A manual is tied to its source `workflow_name` and (optionally) the
--     `business_id` it was generated for.
--   - Manuals are regenerated as workflows evolve, so the table is Mutable and
--     carries updated_at maintained by the shared trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0096_operating_manuals_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- operating_manuals — the generated operating manual for a stabilized workflow.
-- Holds the SOP/checklist/playbook/onboarding/training/troubleshooting/KPIs/
-- ownership-matrix artifacts in `artifacts`, stored in the Asset Library. Every
-- successful workflow is reusable IP (`reusable_ip` true by default). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists operating_manuals (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null,
  workflow_name  text        not null,
  business_id    uuid,
  artifacts      jsonb       not null default '[]'::jsonb,
  reusable_ip    boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists operating_manuals_tenant_workflow_idx
  on operating_manuals (tenant_id, workflow_name);

-- -----------------------------------------------------------------------------
-- updated_at trigger for operating_manuals. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_operating_manuals on operating_manuals;
create trigger set_updated_at_operating_manuals
  before update on operating_manuals
  for each row execute function set_updated_at();
