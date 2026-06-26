-- =============================================================================
-- Migration: 0084_business_simulations_rls.sql
-- Purpose:   Enable Row-Level Security on the Business Simulation Engine
--            `business_simulations` table with a DENY-BY-DEFAULT posture, then
--            add tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- POINT-IN-TIME / IMMUTABLE
--   `business_simulations` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing simulation immutable — no caller can mutate or remove it.
--   This matches the append-only posture of `revenue_intel` in 0059.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on business_simulations (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table business_simulations enable row level security;

-- =============================================================================
-- business_simulations — POINT-IN-TIME / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing simulation immutable, matching revenue_intel in 0059.
-- =============================================================================
create policy business_simulations_select on business_simulations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy business_simulations_insert on business_simulations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
