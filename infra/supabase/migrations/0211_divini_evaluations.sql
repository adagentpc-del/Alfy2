-- =============================================================================
-- Migration: 0211_divini_evaluations.sql
-- Purpose:   Stand up the Divini Standard — a single `divini_evaluations` table
--            scoring a proposal across 14 criteria into a Divini Score and a
--            recommendation (proceed / redesign / reject), plus the two headline
--            checks (billion-dollar-worthy, proud-in-ten-years). The quality
--            benchmark for everything entering the ecosystem. Implements ADR-0142
--            on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one evaluation. No updated_at, no trigger.
--   - recommendation constrained by a CHECK mirrored from DiviniRecommendationSchema.
--     Per-criterion scores live in the `criteria` jsonb.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists divini_evaluations (
  id                     uuid              primary key default gen_random_uuid(),
  tenant_id              uuid              not null,
  subject                text              not null,
  subject_kind           text              not null default 'feature',
  criteria               jsonb             not null default '[]'::jsonb,
  divini_score           double precision  not null default 0 check (divini_score >= 0 and divini_score <= 1),
  recommendation         text              not null check (recommendation in ('proceed','redesign','reject')),
  billion_dollar_worthy  boolean           not null default false,
  proud_in_ten_years     boolean           not null default false,
  reason                 text              not null,
  created_at             timestamptz       not null default now()
);

create index if not exists divini_evaluations_tenant_created_idx
  on divini_evaluations (tenant_id, created_at);

alter table divini_evaluations enable row level security;

create policy divini_evaluations_select on divini_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy divini_evaluations_insert on divini_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
