-- =============================================================================
-- Migration: 0150_freedom_reports.sql
-- Purpose:   Stand up the Alfy² Personal Freedom Engine — a single
--            `freedom_reports` table that stores each week's computed freedom
--            report for the operator. The mission is maximum life, not maximum
--            work: every report measures offloadable (low-leverage machine) hours
--            against life hours and emits freedom recommendations that preserve
--            or improve business performance. Implements the Personal Freedom
--            Engine (ADR-0082) on top of the tenant-scoped platform.
--
-- PERSONAL FREEDOM MODEL
--   - Each row is a COMPUTED POINT-IN-TIME report for one week (`week_label`):
--     the engine analyzes the week's time allocation and writes the conclusions
--     out as a dated report.
--   - `offloadable_hours` are the low-leverage machine hours (editing + approving)
--     that should be offloaded; `life_hours` are the hours spent living
--     (outdoors/exercise/family/friends/travel/creative/rest); `freedom_score`
--     (0..1) is the share of time spent living vs grinding.
--   - `recommendations` holds the freedom recommendations (automate, delegate,
--     create_agent, improve_workflow, batch_process) — each only made when it
--     preserves or improves performance.
--   - Reports are APPEND-ONLY / IMMUTABLE: a row is a recorded computation, not
--     edited in place. There is no updated_at and no trigger — successive
--     computations append new reports rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0151_freedom_reports_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- freedom_reports — a computed point-in-time freedom report for one week. Holds
-- offloadable (low-leverage machine) hours, life hours, the freedom score, and
-- the freedom recommendations. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists freedom_reports (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  week_label         text              not null default '',
  offloadable_hours  double precision  not null default 0,
  life_hours         double precision  not null default 0,
  freedom_score      double precision  not null default 0,
  recommendations    jsonb             not null default '[]'::jsonb,
  created_at         timestamptz       not null default now()
);

create index if not exists freedom_reports_tenant_created_idx
  on freedom_reports (tenant_id, created_at);
