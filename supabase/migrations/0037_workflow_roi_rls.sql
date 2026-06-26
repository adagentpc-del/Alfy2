-- =============================================================================
-- Migration: 0037_workflow_roi_rls.sql
-- Purpose:   Enable Row-Level Security on the Workflow ROI Tracking
--            `workflow_roi` table with a DENY-BY-DEFAULT posture, then add
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
-- Enable RLS on the workflow_roi table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table workflow_roi enable row level security;

-- =============================================================================
-- workflow_roi — mutable: ROI rows are scored, re-scored, and re-ranked as the
-- engine re-evaluates each workflow. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy workflow_roi_select on workflow_roi
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy workflow_roi_insert on workflow_roi
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy workflow_roi_update on workflow_roi
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy workflow_roi_delete on workflow_roi
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
