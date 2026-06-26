-- =============================================================================
-- Migration: 0144_visibility_reports.sql
-- Purpose:   Stand up the Alfy² Visibility Engine output — a single
--            `visibility_reports` table that stores a computed visibility report
--            per business: a 0..1 composite Visibility Score plus where/what/when
--            to post, who to collaborate with, which podcasts to appear on, which
--            conferences to speak at, which awards to apply for, and the weakest
--            signals. Implements the Visibility Engine on top of the
--            tenant-scoped platform.
--
-- VISIBILITY ENGINE MODEL
--   - Each row is a COMPUTED POINT-IN-TIME REPORT for one business: the engine
--     scores the business's visibility signals and writes out the conclusions as
--     a dated report.
--   - `visibility_score` is the 0..1 composite the report is framed around.
--   - The recommendation fields (where_to_post, what_to_post, collaborators,
--     podcasts_to_appear_on, conferences_to_speak_at, awards_to_apply_for,
--     weakest_signals) are arrays; `when_to_post` is free text.
--   - Reports are APPEND-ONLY: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive computations
--     append new reports rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0145_visibility_reports_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- visibility_reports — a computed point-in-time visibility report for one
-- business. Holds the 0..1 visibility score and the engine's recommendations on
-- where/what/when to post, collaborators, podcasts, conferences, awards, and the
-- weakest signals. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists visibility_reports (
  id                       uuid              primary key default gen_random_uuid(),
  tenant_id                uuid              not null,
  business_name            text              not null,
  visibility_score         double precision  not null default 0
                                             check (visibility_score >= 0 and visibility_score <= 1),
  where_to_post            jsonb             not null default '[]'::jsonb,
  what_to_post             jsonb             not null default '[]'::jsonb,
  when_to_post             text              not null default '',
  collaborators            jsonb             not null default '[]'::jsonb,
  podcasts_to_appear_on    jsonb             not null default '[]'::jsonb,
  conferences_to_speak_at  jsonb             not null default '[]'::jsonb,
  awards_to_apply_for      jsonb             not null default '[]'::jsonb,
  weakest_signals          jsonb             not null default '[]'::jsonb,
  created_at               timestamptz       not null default now()
);

create index if not exists visibility_reports_tenant_created_idx
  on visibility_reports (tenant_id, created_at);
