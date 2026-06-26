-- =============================================================================
-- Migration: 0067_asset_checklists_rls.sql
-- Purpose:   Enable Row-Level Security on the Business Asset Checklist
--            `asset_checklists` table with a DENY-BY-DEFAULT posture, then add
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
-- Enable RLS on the asset_checklists table (deny-by-default until policies
-- added).
-- -----------------------------------------------------------------------------
alter table asset_checklists enable row level security;

-- =============================================================================
-- asset_checklists — mutable: a business's asset completeness is recomputed and
-- its recommendation updated over time. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy asset_checklists_select on asset_checklists
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_checklists_insert on asset_checklists
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_checklists_update on asset_checklists
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_checklists_delete on asset_checklists
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
