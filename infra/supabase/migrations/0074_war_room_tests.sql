-- =============================================================================
-- Migration: 0074_war_room_tests.sql
-- Purpose:   Stand up the Alfy² Conversion War Room — a single `war_room_tests`
--            table that drives full-funnel A/B testing across the operator's
--            conversion surfaces. Implements the Conversion War Room on top of
--            the tenant-scoped platform.
--
-- CONVERSION WAR ROOM MODEL
--   - Nine surfaces span the full conversion funnel:
--       cold_email, social_post, landing_page, dm, sales_script, deck,
--       proposal, checkout_flow, follow_up_sequence.
--   - Every test pits a variant pair against each other — `variant_a_label`
--     and `variant_b_label` name them, `metrics_a`/`metrics_b` hold the raw
--     measured outcomes, and `rates_a`/`rates_b` hold the derived rates.
--   - The `winner` is decided on REVENUE, booked calls, and qualified leads —
--     never vanity metrics — and is null until a test resolves. `recommendation`
--     captures the engine's next move, and `objections` records the buyer
--     objections surfaced along the funnel.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0075_war_room_tests_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- war_room_tests — a full-funnel A/B test on one of nine conversion surfaces,
-- with its variant pair, measured metrics, derived rates, recommendation, and
-- surfaced objections. The winner is decided on revenue / booked calls /
-- qualified leads (never vanity metrics) and stays null until the test
-- resolves. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists war_room_tests (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  business_id       uuid,
  surface           text              not null
                                      check (surface in (
                                        'cold_email','social_post','landing_page',
                                        'dm','sales_script','deck','proposal',
                                        'checkout_flow','follow_up_sequence')),
  label             text              not null,
  variant_a_label   text              not null default 'A',
  variant_b_label   text              not null default 'B',
  metrics_a         jsonb             not null default '{}'::jsonb,
  metrics_b         jsonb             not null default '{}'::jsonb,
  rates_a           jsonb,
  rates_b           jsonb,
  winner            text              check (winner in ('a','b')),
  recommendation    text              not null default '',
  objections        jsonb             not null default '[]'::jsonb,
  created_at        timestamptz       not null default now(),
  updated_at        timestamptz
);

create index if not exists war_room_tests_tenant_surface_idx
  on war_room_tests (tenant_id, surface);

-- -----------------------------------------------------------------------------
-- updated_at trigger for war_room_tests. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_war_room_tests on war_room_tests;
create trigger set_updated_at_war_room_tests
  before update on war_room_tests
  for each row execute function set_updated_at();
