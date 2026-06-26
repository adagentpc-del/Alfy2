-- =============================================================================
-- Migration: 0069_money_first_mode_rls.sql
-- Purpose:   Enable Row-Level Security on the Money-First Operating Mode
--            `money_first_mode` table with a DENY-BY-DEFAULT posture, then add
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
-- Enable RLS on the money_first_mode table (deny-by-default until policies are
-- added).
-- -----------------------------------------------------------------------------
alter table money_first_mode enable row level security;

-- =============================================================================
-- money_first_mode — mutable: the mode is toggled on/off over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy money_first_mode_select on money_first_mode
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy money_first_mode_insert on money_first_mode
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy money_first_mode_update on money_first_mode
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy money_first_mode_delete on money_first_mode
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
