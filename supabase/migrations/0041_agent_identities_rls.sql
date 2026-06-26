-- =============================================================================
-- Migration: 0041_agent_identities_rls.sql
-- Purpose:   Enable Row-Level Security on the Agent Identity & Zero Trust
--            `agent_identities` table with a DENY-BY-DEFAULT posture, then add
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
-- Enable RLS on the agent_identities table (deny-by-default until policies are
-- added).
-- -----------------------------------------------------------------------------
alter table agent_identities enable row level security;

-- =============================================================================
-- agent_identities — mutable: identities are created, scoped, granted new
-- capabilities, suspended, and revoked over time. select/insert/update/delete,
-- all tenant-scoped.
-- =============================================================================
create policy agent_identities_select on agent_identities
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_identities_insert on agent_identities
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_identities_update on agent_identities
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_identities_delete on agent_identities
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
