-- =============================================================================
-- Migration: 0138_content_packages.sql
-- Purpose:   Stand up the Alfy² Content Factory — a single `content_packages`
--            table that records the full, linked package one source produces (1
--            long YouTube, 5 Shorts, 5 Reels, 10 X posts, 5 LinkedIn posts, 3
--            carousels, a newsletter, a blog, podcast clips, a website article, an
--            email, a sales asset, a PR angle, a speaker story, a case study) — all
--            linked to the source so nothing is ever created twice. Implements the
--            Content Factory on top of the tenant-scoped platform. See
--            docs/adr/ADR-0077-content-factory.md.
--
-- CONTENT FACTORY MODEL
--   - Each row is ONE COMPLETE PACKAGE: all derivatives linked to one source.
--   - `pieces` holds the produced pieces — each carries its own kind, index,
--     title, and Asset Library reference — and `total_pieces` records the count.
--   - Packages are APPEND-ONLY: a produced package is a recorded build, not edited
--     in place. There is no updated_at and no trigger — rebuilding appends new
--     packages rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0139_content_packages_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- content_packages — a complete content package: all derivatives linked to one
-- source. Carries the source title/reference, brand, the produced pieces, and the
-- total piece count. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists content_packages (
  id            uuid              primary key default gen_random_uuid(),
  tenant_id     uuid              not null,
  source_title  text              not null,
  source_ref    text              not null default '',
  brand         text              not null default '',
  business_id   uuid,
  pieces        jsonb             not null default '[]'::jsonb,
  total_pieces  integer           not null default 0,
  created_at    timestamptz       not null default now()
);

create index if not exists content_packages_tenant_created_idx
  on content_packages (tenant_id, created_at);
