-- =============================================================================
-- Migration: 0028_pattern_observability.sql
-- Purpose:   Stand up the Alfy² Pattern Engine self-awareness storage — two
--            tables that let the engine observe the operator's behavior over
--            time and generate advisory reports about it.
--
-- PATTERN ENGINE MODEL
--   - `pattern_observations` is an APPEND-ONLY stream of behavioral data points.
--     The engine records a `signal` (work_session, avoidance, performance,
--     energy, focus, stress, health, follow_up, sales, launch, meeting,
--     calendar, decision, productivity), an optional 0..1 `measure`, a free-text
--     `label`, and a `context` snapshot. Observations are facts about what
--     happened; they are never edited or deleted.
--   - `pattern_reports` is an APPEND-ONLY stream of generated advisory reports.
--     Each report summarizes a `window` of observations into detected
--     `patterns`, `bottlenecks`, `strengths`, `repeating_mistakes`,
--     `successful_habits`, and a set of recommendations (automations, agents,
--     workflow improvements, schedule changes) plus a `summary`.
--   - Reports are ADVISORY ONLY. `advisory_only` is pinned true by a CHECK
--     constraint: the engine surfaces self-awareness to the operator but NEVER
--     changes behavior on its own.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - These tables are append-only, so they carry NO updated_at column.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0029_pattern_observability_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pattern_observations — append-only behavioral data points the engine records
-- as it watches the operator's world. Each row is one observation of a `signal`
-- with an optional 0..1 `measure`, a `label`, and a `context` snapshot. Facts,
-- not edited in place: append-only, no updated_at. (immutability enforced in
-- 0029)
-- -----------------------------------------------------------------------------
create table if not exists pattern_observations (
  id          uuid              primary key default gen_random_uuid(),
  tenant_id   uuid              not null,
  at          timestamptz       not null default now(),
  signal      text              not null
                                check (signal in (
                                  'work_session','avoidance','performance','energy',
                                  'focus','stress','health','follow_up','sales',
                                  'launch','meeting','calendar','decision',
                                  'productivity')),
  measure     double precision,
  label       text              not null default '',
  context     jsonb             not null default '{}'::jsonb,
  created_at  timestamptz       not null default now()
);

create index if not exists pattern_observations_tenant_signal_idx
  on pattern_observations (tenant_id, signal);

create index if not exists pattern_observations_tenant_at_idx
  on pattern_observations (tenant_id, at);

-- -----------------------------------------------------------------------------
-- pattern_reports — append-only advisory reports the engine generates by
-- summarizing a `window` of observations. Carries detected patterns,
-- bottlenecks, strengths, repeating mistakes, successful habits, and
-- recommendations (automations, agents, workflow improvements, schedule
-- changes) plus a `summary`. ADVISORY ONLY: `advisory_only` is pinned true by a
-- CHECK — the engine never changes behavior. Append-only, no updated_at.
-- (immutability enforced in 0029)
-- -----------------------------------------------------------------------------
create table if not exists pattern_reports (
  id                          uuid          primary key default gen_random_uuid(),
  tenant_id                   uuid          not null,
  generated_at                timestamptz   not null default now(),
  "window"                    jsonb         not null default '{}'::jsonb,
  patterns                    jsonb         not null default '[]'::jsonb,
  bottlenecks                 jsonb         not null default '[]'::jsonb,
  strengths                   jsonb         not null default '[]'::jsonb,
  repeating_mistakes          jsonb         not null default '[]'::jsonb,
  successful_habits           jsonb         not null default '[]'::jsonb,
  recommended_automations     jsonb         not null default '[]'::jsonb,
  recommended_agents          jsonb         not null default '[]'::jsonb,
  workflow_improvements       jsonb         not null default '[]'::jsonb,
  schedule_recommendations    jsonb         not null default '[]'::jsonb,
  summary                     text          not null default '',
  advisory_only               boolean       not null default true
                                            check (advisory_only = true),
  created_at                  timestamptz   not null default now()
);

create index if not exists pattern_reports_tenant_generated_at_idx
  on pattern_reports (tenant_id, generated_at);
