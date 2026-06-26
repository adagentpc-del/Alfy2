-- =============================================================================
-- Migration: 0055_conversion_profiles_rls.sql
-- Purpose:   Enable Row-Level Security on the Conversion Engine
--            `conversion_profiles` table with a DENY-BY-DEFAULT posture, then
--            add tenant-isolation policies. Mirrors the tenancy model from 0002
--            and 0025.
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
-- Enable RLS on the conversion_profiles table (deny-by-default until policies
-- are added).
-- -----------------------------------------------------------------------------
alter table conversion_profiles enable row level security;

-- =============================================================================
-- conversion_profiles — mutable: profiles are created, baselines are tracked,
-- tests/copy/objections/offers accumulate, and the next optimization is updated
-- over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy conversion_profiles_select on conversion_profiles
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy conversion_profiles_insert on conversion_profiles
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy conversion_profiles_update on conversion_profiles
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy conversion_profiles_delete on conversion_profiles
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
