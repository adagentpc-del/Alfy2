-- =============================================================================
-- Migration: 0204_thinking_pattern_observations.sql
-- Purpose:   Stand up the Alyssa Pattern Mirror — a single
--            `thinking_pattern_observations` table that records HOW Alyssa thinks
--            (thinking patterns, business pattern recognition, opportunity-detection
--            style, language preferences, decision criteria, intuition signals,
--            bottlenecks, creative breakthroughs, recurring themes, founder
--            instincts), with a confidence and whether the pattern recurs enough to
--            become a teachable framework. Amplifies and preserves; never imitates.
--            Implements ADR-0132 on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one observation. No updated_at, no trigger.
--   - kind and amplification are constrained by CHECKs mirrored from the contract.
--   - framework_candidate flags observations to hand to Teach My Framework (0205).
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists thinking_pattern_observations (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  kind                text              not null check (kind in (
                                          'thinking_pattern','business_pattern_recognition',
                                          'opportunity_detection_style','language_preference',
                                          'decision_criterion','intuition_signal','bottleneck',
                                          'creative_breakthrough','recurring_theme','founder_instinct')),
  observation         text              not null,
  occurrences         integer           not null default 1 check (occurrences >= 1),
  confidence          double precision  not null default 0.5 check (confidence >= 0 and confidence <= 1),
  framework_candidate boolean           not null default false,
  amplification       text              not null check (amplification in (
                                          'personalize','suggest_agent','surface_opportunity','build_framework')),
  evidence_refs       jsonb             not null default '[]'::jsonb,
  created_at          timestamptz       not null default now()
);

create index if not exists thinking_pattern_observations_tenant_created_idx
  on thinking_pattern_observations (tenant_id, created_at);

alter table thinking_pattern_observations enable row level security;

create policy thinking_pattern_observations_select on thinking_pattern_observations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy thinking_pattern_observations_insert on thinking_pattern_observations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
