-- =============================================================================
-- Migration: 0220_capability_reports.sql
-- Purpose:   Stand up the Capability Monitor — a single `capability_reports` table
--            recording, for one newly-available capability, the seven impact
--            signals, the business impact, suggested implementation, migration
--            plan, and priority (now / soon / watch / ignore). Implements ADR-0151
--            on the tenant-scoped platform.
--
-- MODEL: APPEND-ONLY. priority CHECK-constrained.
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists capability_reports (
  id                       uuid          primary key default gen_random_uuid(),
  tenant_id                uuid          not null,
  capability               text          not null,
  source                   text          not null default '',
  impact                   jsonb         not null default '{}'::jsonb,
  business_impact          text          not null,
  suggested_implementation text          not null default '',
  migration_plan           jsonb         not null default '[]'::jsonb,
  priority                 text          not null check (priority in ('now','soon','watch','ignore')),
  created_at               timestamptz   not null default now()
);

create index if not exists capability_reports_tenant_created_idx
  on capability_reports (tenant_id, created_at);

alter table capability_reports enable row level security;

create policy capability_reports_select on capability_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy capability_reports_insert on capability_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
