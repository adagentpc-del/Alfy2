-- =============================================================================
-- Migration: 0212_infrastructure_plans.sql
-- Purpose:   Stand up the Infrastructure Launch Engine — a single
--            `infrastructure_plans` table that, for one approved build, prepares
--            the whole technical infrastructure (per-provider components, required
--            env vars, manual steps, launch checklist) so Alyssa only adds secrets,
--            approves, and presses launch. Implements ADR-0143 on the tenant-scoped
--            platform.
--
-- MODEL
--   - MUTABLE: prepared_pct and component statuses change as Alyssa supplies
--     secrets, so the table carries updated_at + set_updated_at().
--   - never_blocks_on_secrets pinned true (DB CHECK): preparation never halts on a
--     missing secret.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists infrastructure_plans (
  id                       uuid              primary key default gen_random_uuid(),
  tenant_id                uuid              not null,
  build_packet_id          uuid              not null,
  components               jsonb             not null default '[]'::jsonb,
  env_required             jsonb             not null default '[]'::jsonb,
  manual_steps             jsonb             not null default '[]'::jsonb,
  launch_checklist         jsonb             not null default '[]'::jsonb,
  prepared_pct             double precision  not null default 0 check (prepared_pct >= 0 and prepared_pct <= 1),
  blocking_items           jsonb             not null default '[]'::jsonb,
  never_blocks_on_secrets  boolean           not null default true check (never_blocks_on_secrets = true),
  created_at               timestamptz       not null default now(),
  updated_at               timestamptz       not null default now()
);

create index if not exists infrastructure_plans_tenant_created_idx on infrastructure_plans (tenant_id, created_at);
create index if not exists infrastructure_plans_packet_idx on infrastructure_plans (build_packet_id);

drop trigger if exists set_updated_at_infrastructure_plans on infrastructure_plans;
create trigger set_updated_at_infrastructure_plans
  before update on infrastructure_plans
  for each row execute function set_updated_at();

alter table infrastructure_plans enable row level security;

create policy infrastructure_plans_select on infrastructure_plans
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy infrastructure_plans_insert on infrastructure_plans
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy infrastructure_plans_update on infrastructure_plans
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
