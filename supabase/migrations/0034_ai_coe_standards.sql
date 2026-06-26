-- =============================================================================
-- Migration: 0034_ai_coe_standards.sql
-- Purpose:   Stand up the Alfy² AI Center of Excellence — the internal standards
--            layer (approved prompt library, agent/workflow templates, and
--            security/data/naming/testing/documentation/escalation/model-usage/
--            cost standards) that every new agent, workflow, and connector must
--            follow. A single `coe_standards` table holds the approved standards
--            library on top of the tenant-scoped platform.
--
-- AI CENTER OF EXCELLENCE MODEL
--   - The CoE is the operator's internal standards library: the curated,
--     approved canon every new agent, workflow, and connector is built against.
--   - `kind` spans the standard categories the CoE governs:
--       prompt, agent_template, workflow_template, security_standard,
--       data_standard, naming_convention, testing_standard,
--       documentation_standard, escalation_rule, model_usage_rule, cost_control.
--   - Each standard carries a semantic `version` and a lifecycle `status`:
--       draft → approved → deprecated.
--   - `summary` and `body` hold the human-readable standard; `rules` holds the
--     machine-checkable clauses the standard enforces, and `tags` aid discovery.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0035_ai_coe_standards_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- coe_standards — an approved standard in the AI Center of Excellence library.
-- One of eleven kinds (approved prompt, agent/workflow template, or a
-- security/data/naming/testing/documentation/escalation/model-usage/cost
-- standard), carrying a semantic version and a draft → approved → deprecated
-- lifecycle. `summary`/`body` hold the human-readable standard, `rules` holds the
-- machine-checkable clauses, and `tags` aid discovery. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists coe_standards (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  kind        text        not null
                          check (kind in (
                            'prompt','agent_template','workflow_template',
                            'security_standard','data_standard','naming_convention',
                            'testing_standard','documentation_standard',
                            'escalation_rule','model_usage_rule','cost_control')),
  name        text        not null,
  version     text        not null default '1.0.0',
  status      text        not null default 'draft'
                          check (status in ('draft','approved','deprecated')),
  summary     text        not null default '',
  body        text        not null default '',
  rules       jsonb       not null default '[]'::jsonb,
  tags        jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create index if not exists coe_standards_tenant_kind_idx
  on coe_standards (tenant_id, kind);

create index if not exists coe_standards_tenant_status_idx
  on coe_standards (tenant_id, status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for coe_standards. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_coe_standards on coe_standards;
create trigger set_updated_at_coe_standards
  before update on coe_standards
  for each row execute function set_updated_at();
