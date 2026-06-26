-- =============================================================================
-- Migration: 0186_rnd_discoveries.sql
-- Purpose:   Stand up the Research & Development Department — a single
--            `rnd_discoveries` table that stores, for each evaluated discovery,
--            its domain, the assigned disposition (learn / test / implement /
--            ignore / watch / invest / build_on / partner), the confidence it is
--            worth acting on, whether it clears the high-confidence threshold and
--            should be surfaced, the rationale, and the next step. Keeps Alyssa
--            ahead by surfacing only high-confidence opportunities. Implements
--            ADR-0111-rnd on the tenant-scoped platform.
--
-- RND DISCOVERY MODEL
--   - Each row is a COMPUTED POINT-IN-TIME EVALUATION for one discovery: the
--     engine scores it and writes out the result as a dated record
--     (`created_at`).
--   - `domain` is the discovery domain; `disposition` is the assigned action;
--     `confidence` is the 0..1 confidence it is worth acting on;
--     `high_confidence` is true when it clears the threshold and should be
--     surfaced; `rationale` and `next_step` explain and direct it.
--   - Discoveries are APPEND-ONLY: a row is a recorded evaluation, not edited in
--     place. There is no updated_at and no trigger — re-evaluating appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every discovery immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- rnd_discoveries — a computed point-in-time evaluation for one discovery.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists rnd_discoveries (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  domain            text              not null check (domain in (
                                        'ai_model', 'github_repo', 'research_paper', 'patent', 'startup',
                                        'competitor', 'api', 'hardware', 'quantum', 'security', 'robotics',
                                        'healthcare', 'construction', 'real_estate', 'finance', 'regulation',
                                        'emerging_industry', 'workflow', 'automation')),
  title             text              not null,
  disposition       text              not null check (disposition in (
                                        'learn', 'test', 'implement', 'ignore', 'watch', 'invest',
                                        'build_on', 'partner')),
  confidence        numeric           not null check (confidence >= 0 and confidence <= 1),
  high_confidence   boolean           not null,
  rationale         text              not null,
  next_step         text              not null,
  created_at        timestamptz       not null default now()
);

create index if not exists rnd_discoveries_tenant_created_idx
  on rnd_discoveries (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on rnd_discoveries (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table rnd_discoveries enable row level security;

-- =============================================================================
-- rnd_discoveries — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing discovery immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy rnd_discoveries_select on rnd_discoveries
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy rnd_discoveries_insert on rnd_discoveries
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
