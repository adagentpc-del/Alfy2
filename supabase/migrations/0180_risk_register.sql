-- =============================================================================
-- Migration: 0180_risk_register.sql
-- Purpose:   Stand up the Enterprise Risk Register — a single `risk_register`
--            table that tracks risks across thirteen categories with severity,
--            likelihood, exposure, owner, mitigation, deadline, status, escalation
--            trigger, and affected businesses, surfacing the top ten weekly.
--            Implements ADR-0103-risk-register on the tenant-scoped platform.
--
-- RISK REGISTER MODEL
--   - Each row is a tracked enterprise risk: category, severity, likelihood, the
--     derived exposure (severity × likelihood, used for the top-10 ranking),
--     owner, mitigation, deadline, escalation trigger, and affected businesses.
--   - A risk's `status` moves through open → mitigating → monitored → closed and
--     its mitigation/owner/deadline are UPDATED in place as it is worked — so the
--     table is MUTABLE: it carries updated_at and the shared set_updated_at()
--     trigger from 0001 (reused here, not redefined).
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
-- risk_register — a tracked enterprise risk, updated in place as it is mitigated
-- and its status advances. Mutable (carries updated_at + set_updated_at trigger).
-- -----------------------------------------------------------------------------
create table if not exists risk_register (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  category              text              not null check (category in (
                                            'legal', 'tax', 'security', 'financial', 'operational',
                                            'reputational', 'compliance', 'health_energy', 'relationship',
                                            'technology', 'vendor', 'customer', 'data_privacy')),
  title                 text              not null,
  severity              numeric           not null check (severity >= 0 and severity <= 1),
  likelihood            numeric           not null check (likelihood >= 0 and likelihood <= 1),
  exposure              numeric           not null check (exposure >= 0 and exposure <= 1),
  owner                 text              not null default '',
  mitigation            text              not null default '',
  deadline              timestamptz,
  escalation_trigger    text              not null default '',
  affected_businesses   jsonb             not null default '[]'::jsonb,
  status                text              not null default 'open' check (status in (
                                            'open', 'mitigating', 'monitored', 'closed')),
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz
);

create index if not exists risk_register_tenant_exposure_idx
  on risk_register (tenant_id, exposure);

-- -----------------------------------------------------------------------------
-- updated_at trigger for risk_register. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_risk_register on risk_register;
create trigger set_updated_at_risk_register
  before update on risk_register
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Enable RLS on risk_register (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table risk_register enable row level security;

-- =============================================================================
-- risk_register — mutable: a risk is recorded, then updated in place as it is
-- mitigated and its status advances. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy risk_register_select on risk_register
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy risk_register_insert on risk_register
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy risk_register_update on risk_register
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy risk_register_delete on risk_register
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
