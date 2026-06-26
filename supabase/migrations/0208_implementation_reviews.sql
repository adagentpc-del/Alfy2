-- =============================================================================
-- Migration: 0208_implementation_reviews.sql
-- Purpose:   Stand up the Implementation Review Agent — a single
--            `implementation_reviews` table storing the post-build review of a
--            coding agent's work across eight dimensions, the verdict
--            (approve / needs_revision / reject), risks found, and recommended
--            fixes. Implements ADR-0137 on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one review. No updated_at, no trigger. May reference
--     the build_packet and the handoff.
--   - verdict constrained by a CHECK mirrored from ImplementationVerdictSchema.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists implementation_reviews (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  build_packet_id    uuid          null,
  handoff_id         uuid          null,
  checks             jsonb         not null default '[]'::jsonb,
  verdict            text          not null check (verdict in ('approve','needs_revision','reject')),
  risks_found        jsonb         not null default '[]'::jsonb,
  recommended_fixes  jsonb         not null default '[]'::jsonb,
  created_at         timestamptz   not null default now()
);

create index if not exists implementation_reviews_tenant_created_idx
  on implementation_reviews (tenant_id, created_at);

alter table implementation_reviews enable row level security;

create policy implementation_reviews_select on implementation_reviews
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy implementation_reviews_insert on implementation_reviews
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
