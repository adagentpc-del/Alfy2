-- =============================================================================
-- Migration: 0016_global_assets.sql
-- Purpose:   Create the Alfy² Global Asset Library — a single, tenant-wide index
--            of every business's assets (logos, brand guides, domains, decks,
--            contracts, SOPs, templates, automations, repos, API keys, product
--            specs, media, customer/vendor lists, campaigns, …). Every asset any
--            business owns is registered here so it is searchable GLOBALLY across
--            the executive's whole portfolio and routable by the agents.
--
--            PERMISSION MODEL: this table is tenant-isolated via RLS (see
--            0017_global_assets_rls.sql). Finer-grained, permission-AWARE access —
--            who within a tenant may see a given asset — is enforced in the
--            APPLICATION layer ON TOP OF tenant RLS. The `sensitive` and
--            `visibility` columns (plus `owner`) are the inputs that drive that
--            application-layer filtering; the database itself only guarantees
--            tenant isolation.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared set_updated_at()
--     trigger (defined in 0001 — reused here, NOT redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0017_global_assets_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- assets — one registered asset belonging to a business in the tenant's
-- portfolio. Mutable: an asset is versioned, approved, archived, and re-used over
-- its life. Each row is the searchable, permission-aware catalog entry for one
-- durable thing the executive's businesses own.
-- -----------------------------------------------------------------------------
create table if not exists assets (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null,
  type            text        not null
                              check (type in (
                                'logo','brand_guide','domain','social_media',
                                'pitch_deck','investor_deck','sales_deck',
                                'contract','nda','sop','email_template',
                                'landing_page','automation','github_repo',
                                'api_key','product_spec','video','photo',
                                'training','pricing','vendor_list',
                                'customer_list','marketing_campaign'
                              )),
  name            text        not null,
  description     text        not null default '',
  owner           text        not null,
  business_id     text,
  version         text        not null default '1.0.0',
  status          text        not null default 'active'
                              check (status in (
                                'draft','active','archived','deprecated'
                              )),
  approval        text        not null default 'not_required'
                              check (approval in (
                                'not_required','pending','approved','rejected'
                              )),
  approved_by     text,
  location        text        not null,
  sensitive       boolean     not null default false,
  visibility      text        not null default 'business'
                              check (visibility in (
                                'tenant','business','private'
                              )),
  tags            jsonb       not null default '[]'::jsonb,
  relationships   jsonb       not null default '[]'::jsonb,
  usage_history   jsonb       not null default '[]'::jsonb,
  keywords        jsonb       not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  -- Generated full-text search vector over name + description + type.
  search_tsv      tsvector    generated always as (
                    to_tsvector(
                      'english',
                      coalesce(name, '')        || ' ' ||
                      coalesce(description, '') || ' ' ||
                      coalesce(type, '')
                    )
                  ) stored
);

-- Indexes on assets.
create index if not exists assets_search_tsv_idx       on assets using gin (search_tsv);
create index if not exists assets_tags_idx             on assets using gin (tags);
create index if not exists assets_tenant_type_idx      on assets (tenant_id, type);
create index if not exists assets_tenant_business_idx  on assets (tenant_id, business_id);
create index if not exists assets_tenant_status_idx    on assets (tenant_id, status);
create index if not exists assets_tenant_owner_idx     on assets (tenant_id, owner);

-- -----------------------------------------------------------------------------
-- updated_at trigger for assets (the only mutable table here). Reuses the shared
-- set_updated_at() function defined in 0001 — do NOT redefine it.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_assets on assets;
create trigger set_updated_at_assets
  before update on assets
  for each row execute function set_updated_at();
