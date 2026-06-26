-- =============================================================================
-- Migration: 0154_compounding_evaluations.sql
-- Purpose:   Stand up the Alfy² Compounding Engine — a single
--            `compounding_evaluations` table that records, for each completed
--            task, whether it can become reusable IP, automation, knowledge, or
--            revenue, the reusable forms it should take, its eight-dimension
--            metrics, and its compounding score. Implements the Compounding
--            Engine (ADR-0084) on top of the tenant-scoped platform.
--
-- COMPOUNDING MODEL
--   - Each row is a COMPUTED evaluation of one completed task: the engine asks
--     whether the work can create value repeatedly and writes the conclusions
--     out as a dated evaluation.
--   - `recommended_forms` holds the reusable forms the task can become (sop,
--     template, automation, agent, workflow, ... licensing_opportunity);
--     `metrics` holds the eight compounding-score dimensions (each 0..1);
--     `compounding_score` (0..1) is the weighted compounding value.
--   - `recommend_create_reusable` is true when the score warrants creating the
--     reusable version now. `lineage_id` links to the Asset Lineage Graph row
--     (see asset_lineage) when one exists.
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
-- RLS policies and the deny-by-default posture live in 0155_compounding_evaluations_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- compounding_evaluations — a computed compounding evaluation of one completed
-- task. Holds the recommended reusable forms, the eight-dimension metrics, the
-- compounding score, the create-reusable recommendation, and the lineage link.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists compounding_evaluations (
  id                         uuid              primary key default gen_random_uuid(),
  tenant_id                  uuid              not null,
  task_title                 text              not null,
  recommended_forms          jsonb             not null default '[]'::jsonb,
  metrics                    jsonb             not null default '{}'::jsonb,
  compounding_score          double precision  not null default 0 check (compounding_score >= 0 and compounding_score <= 1),
  recommend_create_reusable  boolean           not null default false,
  lineage_id                 uuid,
  created_at                 timestamptz       not null default now()
);

create index if not exists compounding_evaluations_tenant_created_idx
  on compounding_evaluations (tenant_id, created_at);
