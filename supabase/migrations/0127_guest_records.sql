-- =============================================================================
-- Migration: 0127_guest_records.sql
-- Purpose:   Stand up the Alfy² Podcast Guest Booking feature — a single
--            `guest_records` table that tracks guests FOR the show and target
--            shows to get Alyssa booked ON. Derived from the GuestRecordSchema
--            contract in packages/shared/src/contracts/podcast-guests.ts.
--            See docs/adr/ADR-0072-podcast-guests.md.
--
-- GUEST BOOKING MODEL
--   - `direction` distinguishes the two flows:
--       inbound_guest      — a guest FOR the show,
--       outbound_appearance — a target show to get Alyssa booked ON.
--   - Candidates are ranked 0..1 on relevance, credibility, audience_fit, and
--     business_value, which roll up into a weighted composite `rank_score`.
--   - Each record carries a booking status lifecycle:
--       candidate → approved_to_contact → contacted → replied →
--       scheduled → recorded (or declined).
--   - Outreach is DRAFTED but never sent until approved: `draft_outreach` holds
--     the draft and `outreach_approved` gates the send (unless persistent
--     approval exists).
--   - `relationship_value` (0..1) tracks the longer-term relationship worth.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0128_guest_records_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- guest_records — a tracked guest / appearance target. Carries the ranking
-- signals (relevance/credibility/audience_fit/business_value → rank_score), the
-- booking status lifecycle, the drafted-but-gated outreach (draft_outreach +
-- outreach_approved), and booking outcome (booked_date, episode_link). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists guest_records (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  direction           text              not null
                                        check (direction in (
                                          'inbound_guest','outbound_appearance')),
  name                text              not null,
  context             text              not null default '',
  relevance           double precision  not null
                                        check (relevance >= 0 and relevance <= 1),
  credibility         double precision  not null
                                        check (credibility >= 0 and credibility <= 1),
  audience_fit        double precision  not null
                                        check (audience_fit >= 0 and audience_fit <= 1),
  business_value      double precision  not null
                                        check (business_value >= 0 and business_value <= 1),
  rank_score          double precision  not null
                                        check (rank_score >= 0 and rank_score <= 1),
  status              text              not null default 'candidate'
                                        check (status in (
                                          'candidate','approved_to_contact','contacted',
                                          'replied','scheduled','recorded','declined')),
  pitch_angle         text              not null default '',
  draft_outreach      text              not null default '',
  outreach_approved   boolean           not null default false,
  booked_date         timestamptz,
  episode_link        text              not null default '',
  relationship_value  double precision  not null
                                        check (relationship_value >= 0 and relationship_value <= 1),
  created_at          timestamptz       not null default now(),
  updated_at          timestamptz
);

create index if not exists guest_records_tenant_direction_idx
  on guest_records (tenant_id, direction);

create index if not exists guest_records_tenant_status_idx
  on guest_records (tenant_id, status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for guest_records. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_guest_records on guest_records;
create trigger set_updated_at_guest_records
  before update on guest_records
  for each row execute function set_updated_at();
