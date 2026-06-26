-- =============================================================================
-- Migration: 0122_trends_rls.sql
-- Purpose:   Enable Row-Level Security on the Future Trends Lab `trends` table
--            with a DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002.
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
-- Enable RLS on trends (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table trends enable row level security;

-- =============================================================================
-- trends — mutable: estimates, preparation, and readiness are revised over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy trends_select on trends
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy trends_insert on trends
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy trends_update on trends
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy trends_delete on trends
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
