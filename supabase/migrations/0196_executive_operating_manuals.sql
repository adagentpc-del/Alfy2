-- =============================================================================
-- Migration: 0196_executive_operating_manuals.sql
-- Purpose:   Stand up the Executive Operating Manual — a single
--            `executive_operating_manuals` table that stores each assembled,
--            living description of how Alfy² operates across every domain
--            (architecture, agents, algorithms, departments, policies, connectors,
--            integrations, workflows, security, approvals, capital_allocation,
--            constitution, operating_rhythm): the per-domain sections, the set of
--            domains whose source has drifted (`stale_domains`), and the
--            `fully_current` flag that is true only when every section is current.
--            So documentation never silently goes stale. Composes the Operating
--            Manual Generator (0095). Implements ADR-0119-exec-operating-manual on
--            the tenant-scoped platform.
--
-- EXECUTIVE OPERATING MANUAL MODEL
--   - Each row is a COMPUTED POINT-IN-TIME ASSEMBLY of the whole manual: the
--     read-model walks every domain's source state, writes each section's summary
--     and staleness, and records the result as a dated snapshot (`created_at`).
--   - `sections` is the per-domain array (domain, summary, stale); `stale_domains`
--     is the derived list of drifted domains; `fully_current` is true when none
--     are stale.
--   - Assemblies are APPEND-ONLY: a row is a recorded snapshot, not edited in
--     place. There is no updated_at and no trigger — re-assembling appends a row,
--     preserving the history of how the manual looked over time.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every assembly immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- executive_operating_manuals — a computed point-in-time assembly of the manual.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists executive_operating_manuals (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  sections          jsonb             not null default '[]'::jsonb,
  stale_domains     jsonb             not null default '[]'::jsonb,
  fully_current     boolean           not null,
  created_at        timestamptz       not null default now()
);

create index if not exists executive_operating_manuals_tenant_created_idx
  on executive_operating_manuals (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on executive_operating_manuals (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table executive_operating_manuals enable row level security;

-- =============================================================================
-- executive_operating_manuals — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing assembly immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy executive_operating_manuals_select on executive_operating_manuals
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy executive_operating_manuals_insert on executive_operating_manuals
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
