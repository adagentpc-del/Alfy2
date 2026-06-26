-- =============================================================================
-- Migration: 0046_playbooks.sql
-- Purpose:   Stand up the Alfy² Enterprise Playbook Generator — a single
--            `playbooks` table that captures, per business and per domain, the
--            reusable operating IP the operator runs the business on.
--
-- ENTERPRISE PLAYBOOK MODEL
--   - A playbook is scoped to one business and one of eleven domains:
--       sales, marketing, finance, operations, legal_risk, customer_success,
--       product, recruiting, personal_admin, health, asset_management.
--   - Each playbook bundles per business/domain SOPs, workflows, scripts,
--     checklists, onboarding/training docs, role scorecards, KPIs, escalation
--     rules, and client-facing assets — packaged as reusable IP.
--   - All of that generated material is stored as a list of `artifacts`.
--   - `business_id` is optional (a playbook may be drafted before a business row
--     exists); `business_name` is denormalized for display.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0047_playbooks_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- playbooks — a per business/domain playbook: SOPs, workflows, scripts,
-- checklists, onboarding/training docs, role scorecards, KPIs, escalation rules,
-- and client-facing assets, packaged as reusable IP in `artifacts`. Scoped to
-- one of eleven domains and (optionally) one business. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists playbooks (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null,
  domain         text        not null
                             check (domain in (
                               'sales','marketing','finance','operations',
                               'legal_risk','customer_success','product',
                               'recruiting','personal_admin','health',
                               'asset_management')),
  business_id    uuid,
  business_name  text        not null default '',
  name           text        not null,
  artifacts      jsonb       not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists playbooks_tenant_domain_idx
  on playbooks (tenant_id, domain);

create index if not exists playbooks_tenant_business_idx
  on playbooks (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for playbooks. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_playbooks on playbooks;
create trigger set_updated_at_playbooks
  before update on playbooks
  for each row execute function set_updated_at();
