-- =============================================================================
-- Migration: 0004_memory_rls.sql
-- Purpose:   Enable Row-Level Security on the Memory Engine tables with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements TECH_SPEC.md §5/§10 and SECURITY.md §2 (tenancy).
--            Companion to 0003_memory_engine.sql.
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
-- MUTABLE TABLES
--   `memories` and `memory_links` are both mutable — records are recalled,
--   re-scored, linked, superseded, and pruned over their lifetime. Each table
--   gets SELECT + INSERT + UPDATE + DELETE policies, all tenant-scoped.
--
-- VIEWS
--   `memory_prune_candidates` (from 0003) inherits RLS from its base table
--   `memories`, so it is NOT enabled here — see the note in 0003_memory_engine.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the Memory Engine tables (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table memories      enable row level security;
alter table memory_links  enable row level security;

-- =============================================================================
-- memories — mutable: atomic memory records are recalled, re-scored, superseded,
-- archived, and pruned over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy memories_select on memories
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memories_insert on memories
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memories_update on memories
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memories_delete on memories
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- memory_links — mutable: typed edges are created, re-weighted, and removed as
-- the memory graph evolves. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy memory_links_select on memory_links
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_links_insert on memory_links
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_links_update on memory_links
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_links_delete on memory_links
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
