-- =============================================================================
-- Migration: 0200_personal_executive_models.sql
-- Purpose:   Stand up the Personal Executive Model (PEM) — a single
--            `personal_executive_models` table storing the learned profile of how
--            Alyssa operates (traits across decision patterns, communication
--            style, opportunity recognition, risk tolerance, energy, workflows,
--            approval habits, priorities, bottlenecks, values, mission). The model
--            amplifies, never imitates, and never replaces her judgment.
--            Implements ADR-0128 on the tenant-scoped platform.
--
-- PEM MODEL
--   - MUTABLE: the model evolves through explicit feedback, observed outcomes, and
--     recurring behavior, so the table carries updated_at + set_updated_at().
--   - traits is the jsonb array of learned traits (each with confidence + source +
--     evidence_refs). Explainability lives in the contract (PemExplanation) and is
--     attached to recommendations at compute time, not stored here.
--   - amplifies_not_imitates pinned true (DB CHECK) — agency is preserved.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists personal_executive_models (
  id                       uuid              primary key default gen_random_uuid(),
  tenant_id                uuid              not null,
  traits                   jsonb             not null default '[]'::jsonb,
  amplifies_not_imitates   boolean           not null default true check (amplifies_not_imitates = true),
  created_at               timestamptz       not null default now(),
  updated_at               timestamptz       not null default now()
);

create index if not exists personal_executive_models_tenant_idx on personal_executive_models (tenant_id);

drop trigger if exists set_updated_at_personal_executive_models on personal_executive_models;
create trigger set_updated_at_personal_executive_models
  before update on personal_executive_models
  for each row execute function set_updated_at();

alter table personal_executive_models enable row level security;

create policy personal_executive_models_select on personal_executive_models
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy personal_executive_models_insert on personal_executive_models
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy personal_executive_models_update on personal_executive_models
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
