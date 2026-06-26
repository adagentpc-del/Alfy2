-- =============================================================================
-- Migration: 0021_goals_rls.sql
-- Purpose:   Enable Row-Level Security on the Goal Engine `goals` table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002 and 0019.
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
-- Enable RLS on the goals table (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table goals enable row level security;

-- =============================================================================
-- goals — mutable: goals are drafted, approved, pursued, recalculated, and
-- retired over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy goals_select on goals
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy goals_insert on goals
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy goals_update on goals
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy goals_delete on goals
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
