-- =============================================================================
-- Migration: 0112_wealth_items_rls.sql
-- Purpose:   Enable Row-Level Security on the Wealth Dump Box `wealth_items`
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
-- Enable RLS on the wealth_items table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table wealth_items enable row level security;

-- =============================================================================
-- wealth_items — mutable: items are classified, scored, scoped, and their next
-- action refined over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy wealth_items_select on wealth_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy wealth_items_insert on wealth_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy wealth_items_update on wealth_items
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy wealth_items_delete on wealth_items
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
