-- =============================================================================
-- Migration: 0126_episode_plans_rls.sql
-- Purpose:   Enable Row-Level Security on the Podcast Studio `episode_plans`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002 and 0025.
--
-- TENANT CONTEXT
--   Every policy scopes rows to the current tenant using a session setting:
--
--       current_setting('app.tenant_id', true)::uuid
--
--   The server process (services/api) sets this per request after resolving the
--   tenant, e.g.:
--
--       SELECT set_config('app.tenant_id', '<uuid>', true);   -- per-transaction
--
--   The second arg to current_setting() is `missing_ok = true`, so an unset
--   value returns NULL rather than erroring. NULL never equals any tenant_id,
--   so an unset context sees ZERO rows — fail-closed by construction.
--
-- DENY-BY-DEFAULT
--   Enabling RLS with no permissive policy denies all access. We then add only
--   the specific policies the table needs. Anything not granted stays denied.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the episode_plans table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table episode_plans enable row level security;

-- =============================================================================
-- episode_plans — mutable: plans are created, researched, scheduled, recorded,
-- produced, and published over time. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy episode_plans_select on episode_plans
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy episode_plans_insert on episode_plans
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy episode_plans_update on episode_plans
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy episode_plans_delete on episode_plans
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
