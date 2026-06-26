-- =============================================================================
-- Migration: 0198_spec_merge_upgrades.sql
-- Purpose:   Persistence-layer changes for the "merge / update" upgrades that
--            extended three already-built engines to cover an expanded spec
--            (building on top of the existing system, not replacing it):
--
--            1. Executive Legacy Archive — widen `legacy_items.kind` to the full
--               lifetime-of-work taxonomy (adds company, podcast, letter, video,
--               voice_note, journal, case_study, client_transformation,
--               business_philosophy). Mirrors LegacyItemKindSchema.
--            2. Simplicity Engine (folded into Self-Improvement) — add the four
--               Simplicity scores to `self_improvement_reports`
--               (complexity / leverage / maintainability / user_friction).
--            3. Conversation-to-Reality — add `conversation_extractions.input_categories`
--               (what the utterance is ABOUT, before it becomes outputs).
--
--            No table is created here. All changes are additive and idempotent;
--            existing rows keep working (new columns default, CHECK only widens).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. legacy_items.kind — widen the CHECK to the full archive taxonomy.
--    The inline CHECK from 0152 is auto-named legacy_items_kind_check; drop and
--    recreate it with the superset. This only ADDS allowed values.
-- -----------------------------------------------------------------------------
alter table legacy_items drop constraint if exists legacy_items_kind_check;
alter table legacy_items add constraint legacy_items_kind_check check (kind in (
  'framework','playbook','operating_manual','podcast_lesson','book','talk','business_system',
  'decision_journal','mistake','success',
  -- Executive Legacy Archive additions
  'company','podcast','letter','video','voice_note','journal','case_study',
  'client_transformation','business_philosophy'));

-- -----------------------------------------------------------------------------
-- 2. self_improvement_reports — Simplicity Engine scores (0..1). Default 0.5 so
--    historical reports remain valid.
-- -----------------------------------------------------------------------------
alter table self_improvement_reports
  add column if not exists complexity_score double precision not null default 0.5
    check (complexity_score >= 0 and complexity_score <= 1);
alter table self_improvement_reports
  add column if not exists leverage_score double precision not null default 0.5
    check (leverage_score >= 0 and leverage_score <= 1);
alter table self_improvement_reports
  add column if not exists maintainability_score double precision not null default 0.5
    check (maintainability_score >= 0 and maintainability_score <= 1);
alter table self_improvement_reports
  add column if not exists user_friction_score double precision not null default 0.5
    check (user_friction_score >= 0 and user_friction_score <= 1);

-- -----------------------------------------------------------------------------
-- 3. conversation_extractions — detected input categories (jsonb array of the
--    ConversationInputCategory enum). Default empty so existing rows are valid.
-- -----------------------------------------------------------------------------
alter table conversation_extractions
  add column if not exists input_categories jsonb not null default '[]'::jsonb;
