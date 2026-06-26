-- =============================================================================
-- Migration: 0044_control_tower_snapshots.sql
-- Purpose:   Stand up the Alfy² Executive Control Tower — the operator
--            dashboard. A single `control_tower_snapshots` table stores an
--            assembled point-in-time snapshot of cash, pipeline, goals,
--            campaigns, blocked deals, risks, agent performance, approvals,
--            top priorities, business health, opportunities, workflows, and the
--            review queue.
--
-- CONTROL TOWER MODEL
--   - Each row is a single assembled dashboard render: the engine pulls the
--     operator's live state across every surface and freezes it into one
--     snapshot at `generated_at`.
--   - The snapshot is denormalized into JSONB sections so the dashboard can be
--     served as-rendered without re-querying every source table:
--       cash_position, revenue_pipeline, goals, active_campaigns, blocked_deals,
--       risks, agent_performance, approvals_needed, top_priorities,
--       business_health, opportunities, workflows_running, review_queue.
--   - Snapshots are IMMUTABLE point-in-time records: once written, a snapshot is
--     never edited. There is no updated_at column and no updated_at trigger —
--     history is preserved by appending new snapshots, not by mutating old ones.
--     (Immutability is enforced in 0045 via deny-by-default + no UPDATE/DELETE
--     policy, mirroring the events/audit_log treatment in 0002.)
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables — snapshots are immutable, so it is
--     deliberately omitted here.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0045_control_tower_snapshots_rls.sql. This file only defines structure; it
-- does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- control_tower_snapshots — an assembled point-in-time render of the operator
-- dashboard. Each row freezes cash, pipeline, goals, campaigns, blocked deals,
-- risks, agent performance, approvals, top priorities, business health,
-- opportunities, workflows, and the review queue into denormalized JSONB
-- sections. Immutable: no updated_at, no trigger — new state means a new
-- snapshot, never an edit.
-- -----------------------------------------------------------------------------
create table if not exists control_tower_snapshots (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  generated_at       timestamptz   not null default now(),
  cash_position      jsonb         not null default '{}'::jsonb,
  revenue_pipeline   jsonb         not null default '{}'::jsonb,
  goals              jsonb         not null default '[]'::jsonb,
  active_campaigns   jsonb         not null default '[]'::jsonb,
  blocked_deals      jsonb         not null default '[]'::jsonb,
  risks              jsonb         not null default '[]'::jsonb,
  agent_performance  jsonb         not null default '[]'::jsonb,
  approvals_needed   jsonb         not null default '[]'::jsonb,
  top_priorities     jsonb         not null default '[]'::jsonb,
  business_health    jsonb         not null default '[]'::jsonb,
  opportunities      jsonb         not null default '[]'::jsonb,
  workflows_running  jsonb         not null default '[]'::jsonb,
  review_queue       jsonb         not null default '[]'::jsonb,
  created_at         timestamptz   not null default now()
);

create index if not exists control_tower_snapshots_tenant_generated_idx
  on control_tower_snapshots (tenant_id, generated_at);
