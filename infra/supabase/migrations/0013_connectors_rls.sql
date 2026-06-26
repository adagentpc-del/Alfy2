-- =============================================================================
-- Migration: 0013_connectors_rls.sql
-- Purpose:   Enable Row-Level Security on the Connector Registry with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements SECURITY.md §2 (tenancy). Companion to 0012_connectors.sql.
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
--
-- MUTABLE TABLE
--   `connectors` is mutable — connectors are onboarded, enabled/disabled,
--   re-permissioned, and continuously re-synced. It gets SELECT + INSERT +
--   UPDATE + DELETE policies, all tenant-scoped.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the Connector Registry (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table connectors enable row level security;

-- =============================================================================
-- connectors — mutable: connectors are onboarded, enabled/disabled, and
-- re-synced over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy connectors_select on connectors
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy connectors_insert on connectors
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy connectors_update on connectors
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy connectors_delete on connectors
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
