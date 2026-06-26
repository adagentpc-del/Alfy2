-- =============================================================================
-- Migration: 0063_queue_items_rls.sql
-- Purpose:   Enable Row-Level Security on the Execution Queue `queue_items`
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
-- Enable RLS on queue_items (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table queue_items enable row level security;

-- =============================================================================
-- queue_items — mutable: items are created, re-bucketed, re-prioritized, and
-- completed over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy queue_items_select on queue_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy queue_items_insert on queue_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy queue_items_update on queue_items
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy queue_items_delete on queue_items
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
