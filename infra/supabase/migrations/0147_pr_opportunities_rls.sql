-- =============================================================================
-- Migration: 0147_pr_opportunities_rls.sql
-- Purpose:   Enable Row-Level Security on the PR & Authority `pr_opportunities`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002.
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
-- Enable RLS on pr_opportunities (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table pr_opportunities enable row level security;

-- =============================================================================
-- pr_opportunities — mutable: opportunities are detected, pitched, approved,
-- sent, won, or passed over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy pr_opportunities_select on pr_opportunities
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pr_opportunities_insert on pr_opportunities
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pr_opportunities_update on pr_opportunities
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pr_opportunities_delete on pr_opportunities
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
