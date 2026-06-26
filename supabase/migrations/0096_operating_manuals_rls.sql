-- =============================================================================
-- Migration: 0096_operating_manuals_rls.sql
-- Purpose:   Enable Row-Level Security on the Operating Manual Generator
--            `operating_manuals` table with a DENY-BY-DEFAULT posture, then add
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
-- Enable RLS on operating_manuals (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table operating_manuals enable row level security;

-- =============================================================================
-- operating_manuals — mutable: manuals are generated and regenerated as
-- workflows evolve. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy operating_manuals_select on operating_manuals
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy operating_manuals_insert on operating_manuals
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy operating_manuals_update on operating_manuals
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy operating_manuals_delete on operating_manuals
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
