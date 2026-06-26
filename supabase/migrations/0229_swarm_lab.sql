-- =============================================================================
-- Migration: 0229_swarm_lab.sql
-- Purpose:   Swarm Lab — the R&D department's bounded-swarm capability. Persists
--            swarm runs (parallel exploration authorized by a delegation packet),
--            the non-executing candidates each swarm agent produces, the converged
--            clusters, and the report that flows up to the R&D leader.
--
-- Tenancy:   every table carries tenant_id; RLS deny-by-default, scoped via
--            current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable:   swarm_runs (updated_at + set_updated_at() trigger + UPDATE policy).
-- Append-only (SELECT + INSERT): swarm_candidates, swarm_clusters, swarm_reports.
-- Tables prefixed swarm_ to avoid clashing with existing live tables.
-- =============================================================================

create table if not exists swarm_runs (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  business_id      uuid,
  department_key   text        not null default 'research_development',
  packet_id        uuid,
  objective        text        not null,
  mode             text        not null default 'divergent_brainstorm',
  agent_count      integer     not null default 8,
  permission_scope text        not null default 'draft_only',
  reports_to       text        not null default 'R&D Lead',
  status           text        not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

create table if not exists swarm_candidates (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  run_id      uuid        not null references swarm_runs(id) on delete cascade,
  agent_label text        not null,
  angle       text        not null default '',
  content     text        not null default '',
  novelty     double precision not null default 0.5,
  feasibility double precision not null default 0.5,
  score       double precision not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists swarm_clusters (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  run_id        uuid        not null references swarm_runs(id) on delete cascade,
  theme         text        not null default '',
  candidate_ids jsonb       not null default '[]'::jsonb,
  pick          boolean     not null default false,
  rank          integer     not null default 0,
  rationale     text        not null default '',
  created_at    timestamptz not null default now()
);

create table if not exists swarm_reports (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  run_id                uuid        not null references swarm_runs(id) on delete cascade,
  top_candidate_ids     jsonb       not null default '[]'::jsonb,
  clusters_summary      text        not null default '',
  recommended_next_step text        not null default '',
  escalated             boolean     not null default false,
  created_at            timestamptz not null default now()
);

create index if not exists swarm_runs_tenant_idx       on swarm_runs (tenant_id, status);
create index if not exists swarm_candidates_run_idx     on swarm_candidates (tenant_id, run_id);
create index if not exists swarm_clusters_run_idx       on swarm_clusters (tenant_id, run_id);
create index if not exists swarm_reports_run_idx        on swarm_reports (tenant_id, run_id);

drop trigger if exists set_updated_at_swarm_runs on swarm_runs;
create trigger set_updated_at_swarm_runs
  before update on swarm_runs for each row execute function set_updated_at();

alter table swarm_runs       enable row level security;
alter table swarm_candidates enable row level security;
alter table swarm_clusters   enable row level security;
alter table swarm_reports    enable row level security;

create policy swarm_runs_select on swarm_runs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy swarm_runs_insert on swarm_runs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy swarm_runs_update on swarm_runs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy swarm_candidates_select on swarm_candidates
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy swarm_candidates_insert on swarm_candidates
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy swarm_clusters_select on swarm_clusters
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy swarm_clusters_insert on swarm_clusters
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy swarm_reports_select on swarm_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy swarm_reports_insert on swarm_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
