-- =============================================================================
-- Migration: 0222_reuse_assessments.sql
-- Purpose:   Stand up Build Once, Reuse Everywhere — a single `reuse_assessments`
--            table recording, for one built module, whether it should be packaged
--            for reuse, which targets could reuse it, and the reusable forms to
--            package it as (component / workflow / agent / schema / prompt /
--            playbook). Implements ADR-0153 on the tenant-scoped platform.
--
-- MODEL: APPEND-ONLY. targets + package_as are jsonb arrays (enum-validated in
--   the contract / engine).
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists reuse_assessments (
  id            uuid          primary key default gen_random_uuid(),
  tenant_id     uuid          not null,
  module        text          not null,
  reusable      boolean       not null default false,
  targets       jsonb         not null default '[]'::jsonb,
  package_as    jsonb         not null default '[]'::jsonb,
  reason        text          not null,
  created_at    timestamptz   not null default now()
);

create index if not exists reuse_assessments_tenant_created_idx
  on reuse_assessments (tenant_id, created_at);

alter table reuse_assessments enable row level security;

create policy reuse_assessments_select on reuse_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy reuse_assessments_insert on reuse_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
