-- =============================================================================
-- Migration: 0027_opportunities_rls.sql
-- Purpose:   Enable Row-Level Security on the Opportunity Intelligence
--            `opportunities` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002
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
-- Enable RLS on the opportunities table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table opportunities enable row level security;

-- =============================================================================
-- opportunities — mutable: opportunities are surfaced, accepted, dismissed, and
-- acted on over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy opportunities_select on opportunities
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy opportunities_insert on opportunities
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy opportunities_update on opportunities
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy opportunities_delete on opportunities
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
