-- =============================================================================
-- Migration: 0134_media_jobs.sql
-- Purpose:   Stand up the Alfy² Media Operating System — a single `media_jobs`
--            table that transforms one raw moment into many finished, brand-correct
--            media assets. Implements the Media OS on top of the tenant-scoped
--            platform. See docs/adr/ADR-0075-media-os.md.
--
-- MEDIA OS MODEL
--   - Each row is ONE MEDIA JOB: one raw input → many produced assets. The input
--     is one of eleven kinds (raw_video, podcast, photo, screenshot, voice_note,
--     written_thought, meeting_recording, interview, webinar, presentation,
--     livestream).
--   - `assets` holds the produced media assets (a plan/reference; rendering happens
--     downstream after approval) — each carries its own output kind, title,
--     caption outline, CTA, and Asset Library reference.
--   - A job moves through a status lifecycle:
--       queued → processing → awaiting_approval → approved → scheduled.
--   - `requires_approval` is always true — nothing publishes until Alyssa approves.
--   - Mutable: a job's status and assets change as it is processed.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0135_media_jobs_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- media_jobs — a media job: one raw input transformed into many produced assets.
-- Carries an input kind, brand, status lifecycle, the produced assets plan, and a
-- standing approval gate (nothing publishes until approved). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists media_jobs (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  kind               text              not null
                                       check (kind in (
                                         'raw_video','podcast','photo','screenshot','voice_note',
                                         'written_thought','meeting_recording','interview','webinar',
                                         'presentation','livestream')),
  title              text              not null,
  brand              text              not null default '',
  business_id        uuid,
  status             text              not null default 'queued'
                                       check (status in (
                                         'queued','processing','awaiting_approval',
                                         'approved','scheduled')),
  assets             jsonb             not null default '[]'::jsonb,
  requires_approval  boolean           not null default true,
  created_at         timestamptz       not null default now(),
  updated_at         timestamptz
);

create index if not exists media_jobs_tenant_status_idx
  on media_jobs (tenant_id, status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for media_jobs. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_media_jobs on media_jobs;
create trigger set_updated_at_media_jobs
  before update on media_jobs
  for each row execute function set_updated_at();
