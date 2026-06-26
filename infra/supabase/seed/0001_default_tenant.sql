-- =============================================================================
-- Seed: 0001_default_tenant.sql
-- Purpose:   Insert the single default tenant row for single-operator mode.
--            Implements TECH_SPEC.md §5 ("one row in single-operator mode")
--            and SECURITY.md §2 (every row carries tenant_id).
--
-- IMPORTANT — OPERATOR ACTION REQUIRED:
--   The fixed UUID below is a PLACEHOLDER. It MUST match the value of
--   `ALFY_DEFAULT_TENANT_ID` in your `.env` file. If they differ, the server's
--   tenant context (app.tenant_id) will not match this row and RLS will hide
--   all data. Generate one UUID, put it in `.env`, and paste the same value
--   here before running the seed.
--
-- Note: tenants is the tenant root, so we set tenant_id = id (the row scopes to
-- itself), keeping RLS uniform across every platform table.
--
-- Idempotent: re-running does nothing if the row already exists.
-- =============================================================================

insert into tenants (id, tenant_id, name, status)
values (
  '00000000-0000-0000-0000-000000000001',  -- MUST equal ALFY_DEFAULT_TENANT_ID in .env
  '00000000-0000-0000-0000-000000000001',  -- tenant_id = id (tenant root scopes to itself)
  'Default Operator',
  'active'
)
on conflict (id) do nothing;
