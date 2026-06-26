-- =============================================================================
-- Migration: 0167_journaled_decisions_rls.sql
-- Purpose:   Enable Row-Level Security on the Decision Journal
--            `journaled_decisions` table with a DENY-BY-DEFAULT posture, then add
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
-- Enable RLS on journaled_decisions (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table journaled_decisions enable row level security;

-- =============================================================================
-- journaled_decisions — mutable: a decision is recorded, then updated in place
-- at review time to capture the actual outcome and lessons learned.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy journaled_decisions_select on journaled_decisions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy journaled_decisions_insert on journaled_decisions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy journaled_decisions_update on journaled_decisions
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy journaled_decisions_delete on journaled_decisions
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
