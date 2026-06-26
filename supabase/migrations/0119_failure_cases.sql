-- =============================================================================
-- Migration: 0119_failure_cases.sql
-- Purpose:   Stand up the Alfy² Failure Database — a single `failure_cases`
--            table that tracks major failures (fraud, lawsuits, AI failures,
--            security breaches, failed startups, scams, regulatory actions,
--            bankruptcies, ethical failures) as permanent institutional
--            knowledge. Implements the Failure Database on top of the
--            tenant-scoped platform.
--
-- FAILURE DATABASE MODEL
--   - Each row is a CAPTURED FAILURE CASE: what happened, the timeline, why it
--     failed, the root cause, the warning signs, the lessons learned, and the
--     generated `how_alfy2_avoids_it` guidance.
--   - `kind` buckets the case into one of nine failure types:
--       fraud, lawsuit, ai_failure, security_breach, failed_startup, scam,
--       regulatory_action, bankruptcy, ethical_failure.
--   - Failure cases are APPEND-ONLY: a row is permanent institutional knowledge,
--     not edited in place. There is no updated_at and no trigger — new lessons
--     append new cases rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0120_failure_cases_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- failure_cases — a captured failure recorded as permanent institutional
-- knowledge. Holds what happened, the timeline, why it failed, the root cause,
-- the warning signs, the lessons learned, and how Alfy² avoids repeating it.
-- One of nine kinds. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists failure_cases (
  id                   uuid              primary key default gen_random_uuid(),
  tenant_id            uuid              not null,
  kind                 text              not null
                                         check (kind in (
                                           'fraud','lawsuit','ai_failure','security_breach',
                                           'failed_startup','scam','regulatory_action',
                                           'bankruptcy','ethical_failure')),
  title                text              not null,
  what_happened        text              not null default '',
  timeline             jsonb             not null default '[]'::jsonb,
  why_it_failed        text              not null default '',
  root_cause           text              not null default '',
  warning_signs        jsonb             not null default '[]'::jsonb,
  lessons_learned      jsonb             not null default '[]'::jsonb,
  how_alfy2_avoids_it  jsonb             not null default '[]'::jsonb,
  created_at           timestamptz       not null default now()
);

create index if not exists failure_cases_tenant_kind_idx
  on failure_cases (tenant_id, kind);
