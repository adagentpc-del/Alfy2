-- =============================================================================
-- Migration: 0094_graph_rls.sql
-- Purpose:   Enable Row-Level Security on the Enterprise Knowledge Graph tables
--            `graph_nodes` and `graph_edges` with a DENY-BY-DEFAULT posture,
--            then add tenant-isolation policies. Mirrors the tenancy model from
--            0002.
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
-- CAPTURE RECORDS
--   `graph_nodes` and `graph_edges` get SELECT + INSERT + DELETE policies — they
--   are captured and can be pruned, but NOT edited in place. The deliberate
--   ABSENCE of an UPDATE policy, combined with deny-by-default, means no caller
--   can mutate an existing node or edge.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on both graph tables (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table graph_nodes enable row level security;
alter table graph_edges enable row level security;

-- =============================================================================
-- graph_nodes — CAPTURE RECORDS. select/insert/delete, all tenant-scoped.
-- No UPDATE policy on purpose: nodes are captured, pruned, or re-captured, not
-- edited in place.
-- =============================================================================
create policy graph_nodes_select on graph_nodes
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy graph_nodes_insert on graph_nodes
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy graph_nodes_delete on graph_nodes
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- graph_edges — CAPTURE RECORDS. select/insert/delete, all tenant-scoped.
-- No UPDATE policy on purpose: edges are captured, pruned, or re-captured, not
-- edited in place.
-- =============================================================================
create policy graph_edges_select on graph_edges
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy graph_edges_insert on graph_edges
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy graph_edges_delete on graph_edges
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
