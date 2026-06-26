-- =============================================================================
-- Migration: 0029_pattern_observability_rls.sql
-- Purpose:   Enable Row-Level Security on the Pattern Engine self-awareness
--            tables (pattern_observations, pattern_reports) with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002 and the append-only treatment
--            of `events` / `audit_log`.
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
--   the specific policies each table needs. Anything not granted stays denied.
--
-- APPEND-ONLY TABLES
--   Both `pattern_observations` and `pattern_reports` get INSERT + SELECT
--   policies ONLY. The deliberate ABSENCE of UPDATE and DELETE policies,
--   combined with deny-by-default, makes existing rows immutable — no caller can
--   mutate or remove them. Observations are recorded facts; reports are
--   advisory and never revised. (Same treatment as events / audit_log in 0002.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on both tables (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table pattern_observations enable row level security;
alter table pattern_reports      enable row level security;

-- =============================================================================
-- pattern_observations — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing observation row immutable. (mirrors events / audit_log §4)
-- =============================================================================
create policy pattern_observations_select on pattern_observations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pattern_observations_insert on pattern_observations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- pattern_reports — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing report row immutable. Reports are advisory-only and never
-- revised in place. (mirrors events / audit_log §4)
-- =============================================================================
create policy pattern_reports_select on pattern_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pattern_reports_insert on pattern_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
