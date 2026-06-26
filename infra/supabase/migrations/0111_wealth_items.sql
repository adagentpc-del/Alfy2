-- =============================================================================
-- Migration: 0111_wealth_items.sql
-- Purpose:   Stand up the Alfy² Wealth Architecture Dump Box — a single
--            `wealth_items` table that stores processed wealth items: the
--            10-step pipeline output for each idea Alyssa drops (investment,
--            tax, trust, IRA, offshore, real-estate, savings goal, wealth
--            desire, screenshot, video, book note, advisor note, financial
--            product, business income plan). Implements the Wealth Dump Box on
--            top of the tenant-scoped platform.
--
-- WEALTH DUMP BOX MODEL
--   - Fourteen item kinds span the dump box surface (see the `kind` check).
--   - Each row is a PROCESSED item: the pipeline classifies, summarizes, scopes
--     (personal vs business), checks legality/compliance, scores upside and
--     risk, links to goals, attaches advisor questions, saves the payload to the
--     Wealth Knowledge Vault, and assigns a next action.
--   - `upside` and `risk` are scored on a 0..1 scale. `vault_asset_id` is the
--     Wealth Knowledge Vault reference (never the payload itself).
--   - `scope` classifies the item as personal, business, both, or unclear, and
--     `business_id` optionally ties it to a business.
--   - Items are MUTABLE: classification, scoring, scope, and next action are
--     refined over time, so the table carries updated_at maintained by the
--     shared trigger function set_updated_at() defined in 0001 (reused here,
--     not redefined).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0112_wealth_items_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- wealth_items — a processed wealth item: the 10-step pipeline output. Carries
-- the kind, title, summary, scope, legality notes, 0..1 upside/risk scores,
-- linked goals, advisor questions, the Wealth Knowledge Vault reference, and the
-- next action. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists wealth_items (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  kind               text              not null
                                       check (kind in (
                                         'investment_idea','tax_idea','trust_idea','ira_idea',
                                         'offshore_idea','real_estate_idea','savings_goal',
                                         'wealth_desire','screenshot','video','book_note',
                                         'advisor_note','financial_product','business_income_plan')),
  title              text              not null,
  summary            text              not null default '',
  scope              text              not null
                                       check (scope in ('personal','business','both','unclear')),
  legality_notes     text              not null default '',
  upside             double precision  not null default 0.5 check (upside >= 0 and upside <= 1),
  risk               double precision  not null default 0.5 check (risk >= 0 and risk <= 1),
  linked_goals       jsonb             not null default '[]'::jsonb,
  advisor_questions  jsonb             not null default '[]'::jsonb,
  vault_asset_id     text              not null,
  next_action        text              not null,
  requires_professional_review  boolean  not null default true,
  business_id        uuid,
  created_at         timestamptz       not null default now(),
  updated_at         timestamptz
);

create index if not exists wealth_items_tenant_kind_idx
  on wealth_items (tenant_id, kind);

-- -----------------------------------------------------------------------------
-- updated_at trigger for wealth_items. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_wealth_items on wealth_items;
create trigger set_updated_at_wealth_items
  before update on wealth_items
  for each row execute function set_updated_at();
