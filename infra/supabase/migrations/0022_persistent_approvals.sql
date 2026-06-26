-- =============================================================================
-- Migration: 0022_persistent_approvals.sql
-- Purpose:   Stand up the Alfy² Persistent Approval feature — a single
--            `persistent_approvals` table that records standing operator grants.
--            Implements Persistent Approval on top of the tenant-scoped platform.
--
-- PERSISTENT APPROVAL MODEL
--   - The operator approves a workflow ONCE and that decision becomes a standing
--     grant: the agent may keep taking the approved class of action without
--     queuing a fresh approval each time.
--   - A grant carries:
--       * scope (jsonb): what it covers — action_class, action_pattern,
--         business_id, goal_id, environments.
--       * limits (jsonb): guardrails — max_uses, used_count, max_amount_usd.
--       * success_metrics (jsonb array): the outcomes the grant is judged against.
--       * review_schedule: how the grant is re-examined — none, monthly,
--         quarterly, or on_expiry.
--   - grant_type captures the operator's intent: a one-off "remember_this", an
--     open-ended "always" or "business" grant, "until_goal" (tied to a goal),
--     a fixed "duration", or a recurring "review_monthly"/"review_quarterly".
--   - Grants AUTO-EXPIRE: when expires_at passes (or a review falls due) the grant
--     leaves 'active' and enters 'in_review' / 'expired', and the operator is asked
--     again. A grant can also be 'revoked' at any time.
--   - The Security Gate consults active, in-scope, in-limit grants BEFORE queuing a
--     fresh approval — a matching grant lets the action proceed without re-prompting.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0023_persistent_approvals_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- persistent_approvals — a standing grant the operator approved once.
-- Identified by a principal + human-readable label, classified by grant_type,
-- and bounded by scope/limits/success_metrics. A review_schedule and expires_at/
-- next_review_at drive the grant's lifecycle: active → in_review → expired (or
-- revoked). The Security Gate reads active, in-scope grants before queuing a new
-- approval. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists persistent_approvals (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  principal        text        not null,
  label            text        not null,
  grant_type       text        not null
                               check (grant_type in (
                                 'remember_this','always','business','until_goal',
                                 'duration','review_monthly','review_quarterly')),
  scope            jsonb       not null default '{}'::jsonb,
  limits           jsonb       not null default '{}'::jsonb,
  success_metrics  jsonb       not null default '[]'::jsonb,
  review_schedule  text        not null default 'none'
                               check (review_schedule in (
                                 'none','monthly','quarterly','on_expiry')),
  status           text        not null default 'active'
                               check (status in (
                                 'active','in_review','expired','revoked')),
  expires_at       timestamptz,
  next_review_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

create index if not exists persistent_approvals_tenant_status_idx
  on persistent_approvals (tenant_id, status);

create index if not exists persistent_approvals_tenant_expires_idx
  on persistent_approvals (tenant_id, expires_at);

create index if not exists persistent_approvals_tenant_next_review_idx
  on persistent_approvals (tenant_id, next_review_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for persistent_approvals. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_persistent_approvals on persistent_approvals;
create trigger set_updated_at_persistent_approvals
  before update on persistent_approvals
  for each row execute function set_updated_at();
