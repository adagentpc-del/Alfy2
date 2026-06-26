-- =============================================================================
-- Migration: 0035_ai_coe_standards_rls.sql
-- Purpose:   Enable Row-Level Security on the AI Center of Excellence
--            `coe_standards` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            0025.
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
-- Enable RLS on the coe_standards table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table coe_standards enable row level security;

-- =============================================================================
-- coe_standards — mutable: standards are drafted, approved, revised, and
-- deprecated over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy coe_standards_select on coe_standards
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy coe_standards_insert on coe_standards
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy coe_standards_update on coe_standards
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy coe_standards_delete on coe_standards
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
