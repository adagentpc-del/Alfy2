-- =============================================================================
-- Migration: 0072_revenue_factory_reports.sql
-- Purpose:   Stand up the Alfy² Revenue Factory — a single
--            `revenue_factory_reports` table that is the per-business money
--            cockpit answering one question: "what do we do today to make
--            money?". Implements the Revenue Factory on top of the
--            tenant-scoped platform.
--
-- REVENUE FACTORY MODEL
--   - Each row is an APPEND-ONLY DAILY DIRECTIVE SNAPSHOT for one business: the
--     engine computes the day's money cockpit and writes it out dated
--     (`generated_at`).
--   - The snapshot answers the operator's money questions directly:
--       fastest_path_to_cash, easiest_offer_to_sell, best_warm_contact,
--       lowest_effort_revenue_action, highest_value_follow_up,
--       offer_most_likely_to_convert, and the single todays_money_move.
--   - It frames the day with pipeline counts and value: warm_lead_count,
--     cold_lead_count, referral_source_count, open_proposal_value_usd.
--   - Snapshots are APPEND-ONLY: a row is a recorded daily directive, not edited
--     in place. There is no updated_at and no trigger — successive computations
--     append new snapshots rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0073_revenue_factory_reports_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- revenue_factory_reports — an append-only daily directive snapshot for one
-- business: the money cockpit answering "what do we do today to make money?".
-- Holds the fastest path to cash, easiest offer to sell, best warm contact,
-- lowest-effort revenue action, highest-value follow-up, the offer most likely
-- to convert, and today's single money move, framed by warm/cold/referral lead
-- counts and open proposal value. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists revenue_factory_reports (
  id                            uuid              primary key default gen_random_uuid(),
  tenant_id                     uuid              not null,
  business_id                   uuid,
  business_name                 text              not null,
  fastest_path_to_cash          text              not null default '',
  easiest_offer_to_sell         text,
  best_warm_contact             text,
  lowest_effort_revenue_action  text,
  highest_value_follow_up       text,
  offer_most_likely_to_convert  text,
  todays_money_move             text              not null,
  warm_lead_count               integer           not null default 0,
  cold_lead_count               integer           not null default 0,
  referral_source_count         integer           not null default 0,
  open_proposal_value_usd       double precision  not null default 0,
  generated_at                  timestamptz       not null default now(),
  created_at                    timestamptz       not null default now()
);

create index if not exists revenue_factory_reports_tenant_business_idx
  on revenue_factory_reports (tenant_id, business_id);
