-- =============================================================================
-- Migration: 0061_sales_asset_packs_rls.sql
-- Purpose:   Enable Row-Level Security on the Sales Asset Generator
--            `sales_asset_packs` table with a DENY-BY-DEFAULT posture, then add
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
-- Enable RLS on sales_asset_packs (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table sales_asset_packs enable row level security;

-- =============================================================================
-- sales_asset_packs — mutable: packs are generated, regenerated, and refreshed
-- over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy sales_asset_packs_select on sales_asset_packs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy sales_asset_packs_insert on sales_asset_packs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy sales_asset_packs_update on sales_asset_packs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy sales_asset_packs_delete on sales_asset_packs
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
