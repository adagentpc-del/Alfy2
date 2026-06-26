-- =============================================================================
-- Migration: 0048_portfolio_reports.sql
-- Purpose:   Stand up the Alfy² Strategic Portfolio Optimizer — a single
--            `portfolio_reports` table holding point-in-time analyses that look
--            at ALL of the operator's businesses together.
--
-- STRATEGIC PORTFOLIO OPTIMIZER MODEL
--   - Each report is a snapshot generated at a moment in time: it analyzes all
--     businesses together, ranks them across 10 dimensions, and recommends, per
--     business, whether to focus now / delegate / automate / pause / kill /
--     package for sale.
--   - `assessments` holds the per-business analysis. Each entry carries the
--     business_name, a `metrics` object across the 10 ranking dimensions, a
--     composite `score`, the `recommendation`, and the `rationale` behind it.
--   - `summary` is the cross-portfolio narrative for the snapshot.
--   - Reports are POINT-IN-TIME: once written they are not edited (no
--     updated_at, no trigger). A new analysis produces a new row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables — deliberately omitted here.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0049_portfolio_reports_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- portfolio_reports — a point-in-time strategic analysis across all of the
-- operator's businesses. Ranks each business by 10 dimensions and records a
-- per-business recommendation (focus now / delegate / automate / pause / kill /
-- package for sale) in `assessments`, with a cross-portfolio `summary`.
-- Immutable: no updated_at, no trigger — a new analysis is a new row.
-- -----------------------------------------------------------------------------
create table if not exists portfolio_reports (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  generated_at  timestamptz not null default now(),
  assessments   jsonb       not null default '[]'::jsonb,
  summary       text        not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists portfolio_reports_tenant_generated_idx
  on portfolio_reports (tenant_id, generated_at);
