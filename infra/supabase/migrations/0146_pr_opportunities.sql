-- =============================================================================
-- Migration: 0146_pr_opportunities.sql
-- Purpose:   Stand up the Alfy² PR & Authority Engine output — a single
--            `pr_opportunities` table that holds detected PR opportunities, each
--            with a drafted (un-sent) pitch awaiting approval. Implements the
--            PR & Authority Engine on top of the tenant-scoped platform.
--
-- PR & AUTHORITY MODEL
--   - Each row is ONE detected PR opportunity, created by one of six triggers:
--       company_launch, major_partnership, funding, customer_win,
--       industry_trend, technology_innovation.
--   - The engine drafts an angle, target outlets, the pitch itself, and the
--     credibility assets the pitch needs; `target_outlets` and
--     `credibility_assets_needed` are arrays.
--   - An opportunity moves through a lifecycle:
--       identified → pitch_drafted → approved → sent → won (or passed).
--   - Pitches are NEVER sent without approval: `approved_to_send` defaults false
--     and must be flipped explicitly before the engine sends.
--   - An opportunity is worked over time (status changes, pitch edits, approval),
--     so the table is MUTABLE: it carries updated_at and the shared trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0147_pr_opportunities_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pr_opportunities — a detected PR opportunity with a drafted, un-sent pitch.
-- Created by one of six triggers, carries an angle, target outlets, the pitch,
-- and the credibility assets it needs, and moves through a status lifecycle.
-- Pitches are never sent without approval (approved_to_send). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists pr_opportunities (
  id                         uuid              primary key default gen_random_uuid(),
  tenant_id                  uuid              not null,
  trigger                    text              not null
                                               check (trigger in (
                                                 'company_launch','major_partnership','funding',
                                                 'customer_win','industry_trend','technology_innovation')),
  headline                   text              not null,
  business_name              text              not null default '',
  angle                      text              not null,
  target_outlets             jsonb             not null default '[]'::jsonb,
  drafted_pitch              text              not null,
  credibility_assets_needed  jsonb             not null default '[]'::jsonb,
  status                     text              not null default 'identified'
                                               check (status in (
                                                 'identified','pitch_drafted','approved',
                                                 'sent','won','passed')),
  approved_to_send           boolean           not null default false,
  created_at                 timestamptz       not null default now(),
  updated_at                 timestamptz
);

create index if not exists pr_opportunities_tenant_status_idx
  on pr_opportunities (tenant_id, status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for pr_opportunities. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_pr_opportunities on pr_opportunities;
create trigger set_updated_at_pr_opportunities
  before update on pr_opportunities
  for each row execute function set_updated_at();
