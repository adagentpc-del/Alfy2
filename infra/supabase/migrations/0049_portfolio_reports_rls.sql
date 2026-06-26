-- =============================================================================
-- Migration: 0049_portfolio_reports_rls.sql
-- Purpose:   Enable Row-Level Security on the Strategic Portfolio Optimizer
--            `portfolio_reports` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            the append-only treatment of `events` / `audit_log`.
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
--   `portfolio_reports` get INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing report row immutable — a report is a snapshot of a moment and
--   is never edited; a new analysis produces a new row. (Mirrors `events` /
--   `audit_log` in 0002.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on portfolio_reports (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table portfolio_reports enable row level security;

-- =============================================================================
-- portfolio_reports — POINT-IN-TIME. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing report row immutable.
-- =============================================================================
create policy portfolio_reports_select on portfolio_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy portfolio_reports_insert on portfolio_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
