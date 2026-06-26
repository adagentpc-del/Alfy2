-- =============================================================================
-- Migration: 0092_reflections_rls.sql
-- Purpose:   Enable Row-Level Security on the Reflection Engine `reflections`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002 and the append-only
--            posture from 0059.
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
-- APPEND-ONLY
--   `reflections` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE of
--   UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing reflection immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `revenue_intel` in 0059 and of `events`
--   + `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on reflections (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table reflections enable row level security;

-- =============================================================================
-- reflections — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing reflection immutable, matching revenue_intel in 0059.
-- =============================================================================
create policy reflections_select on reflections
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy reflections_insert on reflections
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
