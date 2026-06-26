-- =============================================================================
-- Migration: 0175_council_verdicts.sql
-- Purpose:   Stand up the Confidence-Weighted Agent Council — a single
--            `council_verdicts` table that stores the orchestrator's synthesis of
--            a ten-agent council: each agent's independent, confidence-scored
--            opinion, the mean agreement, the confidence gap, the unresolved
--            risks, whether more data is needed, and the final recommendation.
--            Implements ADR-0097-agent-council on the tenant-scoped platform.
--
-- COUNCIL VERDICT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME VERDICT for one decision: the council
--     convenes and the synthesis is written out as a dated verdict (`created_at`).
--   - `opinions` holds the per-agent evaluations; `agreement` (mean confidence)
--     and `confidence_gap` (spread) are 0..1; `needs_more_data` flags when the
--     council lacks enough data to decide.
--   - Verdicts are APPEND-ONLY: a row is a recorded deliberation, not edited in
--     place. There is no updated_at and no trigger — successive convenings append.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every verdict immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- council_verdicts — a computed point-in-time orchestrator synthesis for one
-- decision. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists council_verdicts (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  kind              text              not null check (kind in (
                                        'entity_restructuring', 'large_spending', 'major_launch',
                                        'pricing_change', 'fundraising', 'hiring',
                                        'legal_compliance', 'market_entry')),
  decision          text              not null,
  opinions          jsonb             not null default '[]'::jsonb,
  agreement         numeric           not null check (agreement >= 0 and agreement <= 1),
  confidence_gap    numeric           not null check (confidence_gap >= 0 and confidence_gap <= 1),
  unresolved_risks  jsonb             not null default '[]'::jsonb,
  needs_more_data   boolean           not null,
  recommendation    text              not null,
  created_at        timestamptz       not null default now()
);

create index if not exists council_verdicts_tenant_created_idx
  on council_verdicts (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on council_verdicts (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table council_verdicts enable row level security;

-- =============================================================================
-- council_verdicts — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing verdict immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy council_verdicts_select on council_verdicts
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy council_verdicts_insert on council_verdicts
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
