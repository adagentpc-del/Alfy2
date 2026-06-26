-- =============================================================================
-- Migration: 0221_stack_evaluations.sql
-- Purpose:   Stand up the Tech Stack Evaluator — a single `stack_evaluations`
--            table recording, for one stack component, the signals, the
--            disposition (upgrade / replace / wait / experiment / ignore), and
--            whether there is a measurable benefit (change is never recommended on
--            novelty alone). Implements ADR-0152 on the tenant-scoped platform.
--
-- MODEL: APPEND-ONLY. category + disposition CHECK-constrained.
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists stack_evaluations (
  id                       uuid          primary key default gen_random_uuid(),
  tenant_id                uuid          not null,
  component                text          not null,
  category                 text          not null check (category in (
                                           'ai_model','coding_model','voice_model','image_model','video_model',
                                           'search','github','supabase','render','resend','stripe','slack',
                                           'google_workspace','apple_ecosystem','microsoft_ecosystem',
                                           'security_tool','open_source')),
  signals                  jsonb         not null default '{}'::jsonb,
  disposition              text          not null check (disposition in (
                                           'upgrade','replace','wait','experiment','ignore')),
  has_measurable_benefit   boolean       not null default false,
  reason                   text          not null,
  created_at               timestamptz   not null default now()
);

create index if not exists stack_evaluations_tenant_created_idx
  on stack_evaluations (tenant_id, created_at);

alter table stack_evaluations enable row level security;

create policy stack_evaluations_select on stack_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy stack_evaluations_insert on stack_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
