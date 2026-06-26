-- =============================================================================
-- Migration: 0014_github_intelligence.sql
-- Purpose:   Create the Alfy² GitHub Intelligence System — repository assessments
--            and the Asset Library. The executive drops a GitHub repo (a link, a
--            name) and the intelligence pipeline performs a STATIC scan: it reads,
--            evaluates, and reasons about the repository, then persists the result
--            as a `repo_assessments` row (the durable form of a RepoAssessment).
--            Approved repositories graduate into `asset_library`.
--
-- TRUST POSTURE (the load-bearing principle of this system)
--   Repositories are NEVER trusted automatically and NOTHING is EVER executed.
--   An assessment is a static scan — code is read and reasoned about, not run.
--   This is enforced at the database level: `repo_assessments.executed` carries a
--   CHECK (executed = false), a hard guarantee that no row can ever record an
--   executed repository. There is no "trusted by default"; every repo earns its
--   verdict (safe / needs_review / do_not_use) through assessment alone.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared set_updated_at()
--     trigger (defined in 0001 — reused here, NOT redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0015_github_intelligence_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- repo_assessments — the persisted form of a RepoAssessment. A static scan
-- result: a repository was read, evaluated, and reasoned about, but NEVER
-- executed. Immutable once written (a scan is a point-in-time snapshot), so no
-- updated_at. Each row carries the verdict, the overall quality score, and the
-- full assessment payload (evaluation, security_findings, business_case,
-- explanation). The `executed` column is pinned false by CHECK as a hard,
-- DB-level guarantee that nothing was ever run.
-- -----------------------------------------------------------------------------
create table if not exists repo_assessments (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null,
  url             text        not null,
  name            text        not null,
  verdict         text        not null
                              check (verdict in (
                                'safe','needs_review','do_not_use'
                              )),
  overall_quality real        not null default 0
                              check (overall_quality >= 0 and overall_quality <= 1),
  -- Hard DB-level guarantee: nothing is ever executed. A repo is only ever
  -- statically scanned, so this column can never be true.
  executed        boolean     not null default false
                              check (executed = false),
  -- The full assessment: evaluation, security_findings, business_case,
  -- explanation.
  payload         jsonb       not null default '{}'::jsonb,
  scanned_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Indexes on repo_assessments.
create index if not exists repo_assessments_tenant_verdict_idx
                                                  on repo_assessments (tenant_id, verdict);
create index if not exists repo_assessments_tenant_created_idx
                                                  on repo_assessments (tenant_id, created_at);
create index if not exists repo_assessments_payload_idx
                                                  on repo_assessments using gin (payload);

-- -----------------------------------------------------------------------------
-- asset_library — approved repositories. Once a RepoAssessment is reviewed and
-- accepted, the repository graduates here as a durable, approved asset. Mutable:
-- tags and approval metadata are curated over the asset's life, so it carries
-- updated_at maintained by the shared set_updated_at() trigger. Linked back to
-- the originating assessment via assessment_id. Unique per (tenant_id, repo_url):
-- a repository appears in a tenant's library at most once.
-- -----------------------------------------------------------------------------
create table if not exists asset_library (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  repo_url      text        not null,
  name          text        not null,
  verdict       text        not null
                            check (verdict in (
                              'safe','needs_review','do_not_use'
                            )),
  assessment_id uuid        references repo_assessments(id),
  approved_by   text        not null,
  approved_at   timestamptz not null default now(),
  tags          jsonb       not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  unique (tenant_id, repo_url)
);

-- Indexes on asset_library.
create index if not exists asset_library_tenant_verdict_idx
                                                  on asset_library (tenant_id, verdict);

-- -----------------------------------------------------------------------------
-- updated_at trigger for asset_library (the only mutable table here). Reuses the
-- shared set_updated_at() function defined in 0001 — do NOT redefine it.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_asset_library on asset_library;
create trigger set_updated_at_asset_library
  before update on asset_library
  for each row execute function set_updated_at();
