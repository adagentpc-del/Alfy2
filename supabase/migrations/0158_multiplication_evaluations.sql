-- =============================================================================
-- Migration: 0158_multiplication_evaluations.sql
-- Purpose:   Stand up the Alfy² Multiplication Engine — a single
--            `multiplication_evaluations` table that records, for each solved
--            problem, who/what the solution could help, the shared forms it
--            should be converted into, its estimated future uses, and its
--            multiplication score. Implements the Multiplication Engine
--            (ADR-0085) on top of the tenant-scoped platform.
--
-- MULTIPLICATION MODEL
--   - Each row is a COMPUTED evaluation of one solution: the engine asks whether
--     it can help another business, department, workflow, agent, future Alyssa,
--     future FounderOS users, clients, partners, or investors, and writes the
--     conclusions out as a dated evaluation.
--   - `helps` holds the targets the solution could plausibly help;
--     `recommended_shared_forms` holds the shared forms to convert it into
--     (shared_infrastructure ... founderos_feature); `estimated_future_uses`
--     (targets × uses-per-target) and `multiplication_score` (0..1) frame the
--     leverage; `recommend_share` is true when sharing is warranted.
--   - Evaluations are APPEND-ONLY / IMMUTABLE: a row is a recorded computation,
--     not edited in place. There is no updated_at and no trigger — successive
--     evaluations append new rows rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0159_multiplication_evaluations_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- multiplication_evaluations — a computed multiplication evaluation of one
-- solution. Holds who/what it helps, the recommended shared forms, the estimated
-- future uses, the multiplication score, and the share recommendation.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists multiplication_evaluations (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  solution_title            text              not null,
  helps                     jsonb             not null default '[]'::jsonb,
  recommended_shared_forms  jsonb             not null default '[]'::jsonb,
  estimated_future_uses     integer           not null default 0,
  multiplication_score      double precision  not null default 0 check (multiplication_score >= 0 and multiplication_score <= 1),
  recommend_share           boolean           not null default false,
  created_at                timestamptz       not null default now()
);

create index if not exists multiplication_evaluations_tenant_created_idx
  on multiplication_evaluations (tenant_id, created_at);
