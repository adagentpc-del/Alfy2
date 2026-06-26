-- =============================================================================
-- Migration: 0071_vault_entries_rls.sql
-- Purpose:   Enable Row-Level Security on the Knowledge Vault `vault_entries`
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
-- Enable RLS on vault_entries (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table vault_entries enable row level security;

-- =============================================================================
-- vault_entries — mutable: entries are created, re-extracted, summarized,
-- and updated as they convert into execution. select/insert/update/delete,
-- all tenant-scoped.
-- =============================================================================
create policy vault_entries_select on vault_entries
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy vault_entries_insert on vault_entries
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy vault_entries_update on vault_entries
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy vault_entries_delete on vault_entries
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
