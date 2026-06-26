-- =============================================================================
-- Migration: 0170_board_reviews.sql
-- Purpose:   Stand up the Alfy² Executive Review Board — a single `board_reviews`
--            table that stores the result of convening a virtual board before a
--            major strategic recommendation. Each reviewer (CEO, CFO, COO, CTO,
--            CMO, CLO, CRO, CSO, CPO, CCO) independently evaluates benefits,
--            risks, blind spots, dependencies, costs, and operational impact; the
--            board then synthesizes a final recommendation and HIGHLIGHTS
--            disagreements rather than forcing consensus. Implements the Review
--            Board on top of the tenant-scoped platform.
--
-- REVIEW BOARD MODEL
--   - Each row is a COMPUTED POINT-IN-TIME REVIEW for one proposal: the board
--     convenes, each reviewer renders an independent verdict, and the result is
--     written out as a dated review (`created_at`).
--   - `verdicts` holds the per-reviewer verdicts (stance, benefits, risks, blind
--     spots, dependencies, costs, operational impact); `approvals` and
--     `rejections` tally the stances.
--   - `disagreements` are highlighted, not smoothed over; `synthesis` and
--     `final_recommendation` are the board's combined output.
--   - Reviews are APPEND-ONLY: a row is a recorded deliberation, not edited in
--     place. There is no updated_at and no trigger — successive convenings append
--     new reviews rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0171_board_reviews_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- board_reviews — a computed point-in-time board review for one proposal. Holds
-- the per-reviewer verdicts, the approval/rejection tallies, the highlighted
-- disagreements, and the board's synthesis and final recommendation. Append-only
-- (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists board_reviews (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  proposal              text              not null,
  verdicts              jsonb             not null default '[]'::jsonb,
  approvals             integer           not null default 0 check (approvals >= 0),
  rejections            integer           not null default 0 check (rejections >= 0),
  disagreements         jsonb             not null default '[]'::jsonb,
  synthesis             text              not null,
  final_recommendation  text              not null,
  created_at            timestamptz       not null default now()
);

create index if not exists board_reviews_tenant_created_idx
  on board_reviews (tenant_id, created_at);
