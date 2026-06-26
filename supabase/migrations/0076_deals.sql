-- =============================================================================
-- Migration: 0076_deals.sql
-- Purpose:   Stand up the Alfy² Deal Desk — a single `deals` table that drives
--            the operator's revenue execution loop. One record per opportunity,
--            ranked by probability, revenue, speed, strategic value, and effort;
--            surfaces the next money move, blocked deals, and deals likely to die.
--
-- DEAL DESK MODEL
--   - Each row is one opportunity moving through a sales lifecycle:
--       new → qualifying → proposal → negotiation → verbal → won (or lost).
--   - The desk ranks opportunities so the operator always knows the next money
--     move: `probability` (close likelihood), `deal_size_usd` (revenue),
--     `projected_close_date`/`deadline` (speed), `strategic_value`, and `effort`
--     feed the ranking.
--   - Blocked deals surface through `objections`, `missing_assets`, and
--     `next_step`; deals likely to die surface through `risk` and
--     `days_since_activity`.
--   - Relationship context — `decision_maker`, `relationship_notes`, and
--     `follow_up_status` — keeps the human signal attached to the number.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0077_deals_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- deals — one record per opportunity on the Deal Desk. Ranked by probability,
-- revenue, speed, strategic value, and effort; surfaces the next money move,
-- blocked deals (objections, missing assets), and deals likely to die (risk,
-- days_since_activity). Carries a stage lifecycle plus relationship context.
-- Mutable.
-- -----------------------------------------------------------------------------
create table if not exists deals (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  buyer_contact         text              not null,
  business_id           uuid,
  business_name         text              not null default '',
  offer                 text              not null,
  deal_size_usd         double precision  not null default 0,
  probability           double precision  not null default 0.5
                                          check (probability >= 0 and probability <= 1),
  stage                 text              not null default 'new'
                                          check (stage in (
                                            'new','qualifying','proposal','negotiation',
                                            'verbal','won','lost')),
  next_step             text              not null default '',
  deadline              timestamptz,
  objections            jsonb             not null default '[]'::jsonb,
  missing_assets        jsonb             not null default '[]'::jsonb,
  follow_up_status      text              not null default 'none',
  decision_maker        text              not null default '',
  relationship_notes    text              not null default '',
  risk                  double precision  not null default 0
                                          check (risk >= 0 and risk <= 1),
  days_since_activity   integer           not null default 0,
  projected_close_date  timestamptz,
  effort                double precision  not null default 0.5
                                          check (effort >= 0 and effort <= 1),
  strategic_value       double precision  not null default 0.5
                                          check (strategic_value >= 0 and strategic_value <= 1),
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz
);

create index if not exists deals_tenant_stage_idx
  on deals (tenant_id, stage);

create index if not exists deals_tenant_business_idx
  on deals (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for deals. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_deals on deals;
create trigger set_updated_at_deals
  before update on deals
  for each row execute function set_updated_at();
