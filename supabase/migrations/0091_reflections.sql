-- =============================================================================
-- Migration: 0091_reflections.sql
-- Purpose:   Stand up the Alfy² Reflection Engine — a single `reflections`
--            table that stores periodic operational reviews. Implements the
--            Reflection Engine on top of the tenant-scoped platform.
--
-- REFLECTION ENGINE MODEL
--   - Each row is a weekly / monthly / quarterly / yearly operational review:
--     the engine looks back over the period and writes out what it learned and
--     what should change.
--   - The review captures lessons learned, recommended improvements, workflows
--     to automate, workflows to retire, new agents to build, risks to address,
--     and the priorities for the next period, plus a narrative `summary`.
--   - Reflections are the INSTITUTIONAL MEMORY of Alfy²: they are APPEND-ONLY.
--     A row is a recorded review, not edited in place. There is no updated_at
--     and no trigger — each period appends a new reflection rather than mutating
--     an old one.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0092_reflections_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- reflections — a periodic operational review for one period (weekly, monthly,
-- quarterly, yearly). Captures lessons learned, recommended improvements,
-- workflows to automate/retire, new agents to build, risks to address, and the
-- next period's priorities, plus a narrative summary. The institutional memory
-- of Alfy². Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists reflections (
  id                        uuid        primary key default gen_random_uuid(),
  tenant_id                 uuid        not null,
  period                    text        not null
                                        check (period in (
                                          'weekly','monthly','quarterly','yearly')),
  period_label              text        not null default '',
  lessons_learned           jsonb       not null default '[]'::jsonb,
  recommended_improvements  jsonb       not null default '[]'::jsonb,
  workflows_to_automate     jsonb       not null default '[]'::jsonb,
  workflows_to_retire       jsonb       not null default '[]'::jsonb,
  new_agents_to_build       jsonb       not null default '[]'::jsonb,
  risks_to_address          jsonb       not null default '[]'::jsonb,
  next_period_priorities    jsonb       not null default '[]'::jsonb,
  summary                   text        not null,
  created_at                timestamptz not null default now()
);

create index if not exists reflections_tenant_period_idx
  on reflections (tenant_id, period);
