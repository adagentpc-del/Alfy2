-- =============================================================================
-- Migration: 0149_audience_profiles_rls.sql
-- Purpose:   Enable Row-Level Security on the Audience Intelligence
--            `audience_profiles` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- Enable RLS on audience_profiles (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table audience_profiles enable row level security;

-- =============================================================================
-- audience_profiles — mutable: profiles are upserted and re-derived as new
-- signals arrive. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy audience_profiles_select on audience_profiles
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy audience_profiles_insert on audience_profiles
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy audience_profiles_update on audience_profiles
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy audience_profiles_delete on audience_profiles
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
