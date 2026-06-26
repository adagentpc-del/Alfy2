-- =============================================================================
-- Migration: 0120_failure_cases_rls.sql
-- Purpose:   Enable Row-Level Security on the Failure Database `failure_cases`
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
--
-- APPEND-ONLY / IMMUTABLE
--   `failure_cases` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE
--   of UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing case immutable — no caller can mutate or remove it. This matches
--   the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on failure_cases (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table failure_cases enable row level security;

-- =============================================================================
-- failure_cases — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing case immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy failure_cases_select on failure_cases
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy failure_cases_insert on failure_cases
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
