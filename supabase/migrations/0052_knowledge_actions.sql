-- =============================================================================
-- Migration: 0052_knowledge_actions.sql
-- Purpose:   Stand up the Alfy² Knowledge-to-Action Converter — a single
--            `knowledge_actions` table that turns every useful idea into a
--            concrete, ownable action item.
--
-- KNOWLEDGE-TO-ACTION MODEL
--   Each useful `idea` is converted into an `action_item` carrying everything
--   needed to execute it:
--     - the `business_use_case` it serves;
--     - an `implementation_plan` (the steps to ship it);
--     - a `revenue_hypothesis` (why it makes money);
--     - the `required_assets` and `required_agents` it depends on;
--     - a `test_plan` to validate it;
--     - an `owner` (defaults to the operator) and a `deadline`;
--     - a `dashboard_card` reference for surfacing it.
--   Every idea is given a `disposition` — use_now, save_for_later, ignore, or
--   convert_to_campaign — and its reusable IP is captured as an
--   `operating_manual` so the play can be run again.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0053_knowledge_actions_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- knowledge_actions — a useful idea converted into an action item, with its
-- business use case, implementation plan, revenue hypothesis, required
-- assets/agents, test plan, owner, deadline, and dashboard card. Carries a
-- disposition (use_now/save_for_later/ignore/convert_to_campaign) and a reusable
-- IP operating manual. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists knowledge_actions (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  idea                  text              not null,
  action_item           text              not null,
  business_use_case     text              not null default '',
  implementation_plan   jsonb             not null default '[]'::jsonb,
  revenue_hypothesis    text              not null default '',
  required_assets       jsonb             not null default '[]'::jsonb,
  required_agents       jsonb             not null default '[]'::jsonb,
  test_plan             jsonb             not null default '[]'::jsonb,
  owner                 text              not null default 'owner',
  deadline              timestamptz,
  dashboard_card        text              not null default '',
  disposition           text              not null
                                          check (disposition in (
                                            'use_now','save_for_later','ignore','convert_to_campaign')),
  operating_manual      text              not null default '',
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz
);

create index if not exists knowledge_actions_tenant_disposition_idx
  on knowledge_actions (tenant_id, disposition);

-- -----------------------------------------------------------------------------
-- updated_at trigger for knowledge_actions. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_knowledge_actions on knowledge_actions;
create trigger set_updated_at_knowledge_actions
  before update on knowledge_actions
  for each row execute function set_updated_at();
