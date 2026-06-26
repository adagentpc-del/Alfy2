-- =============================================================================
-- Migration: 0224_build_from_brainstorm.sql
-- Purpose:   Build From Brainstorm — the bridge from raw founder conversation to
--            an approval-gated build. Persists the 9-stage pipeline: thread +
--            classified inputs -> decisions -> strategy map -> prompt pack ->
--            build queue -> approval gate -> agent runs -> QA -> changelog.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable tables (threads, decisions, build_tasks) get updated_at + the shared
--   set_updated_at() trigger (from 0001) + UPDATE policy. The rest are append-only
--   (SELECT + INSERT only) — inputs, snapshots, run logs, QA, changelog.
-- Array/object fields are jsonb. Enum-like fields are text, validated by the Zod
--   contract (build-from-brainstorm.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Stage 1: thread (mutable) + classified inputs (append-only) -------------
create table if not exists brainstorm_threads (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  business_id uuid,
  title       text        not null,
  status      text        not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create table if not exists brainstorm_inputs (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  thread_id   uuid        not null references brainstorm_threads(id) on delete cascade,
  source      text        not null,
  raw_text    text        not null,
  kind        text        not null,
  actionable  boolean     not null default false,
  confidence  real        not null default 0.5,
  created_at  timestamptz not null default now()
);

-- ---- Stage 2: decisions (mutable) -------------------------------------------
create table if not exists brainstorm_decisions (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null,
  thread_id         uuid        not null references brainstorm_threads(id) on delete cascade,
  title             text        not null,
  category          text        not null,
  source_input_ids  jsonb       not null default '[]'::jsonb,
  confidence        real        not null default 0.5,
  status            text        not null default 'needs_review',
  why_it_matters    text        not null default '',
  related_task_ids  jsonb       not null default '[]'::jsonb,
  risk_level        text        not null default 'low',
  approval_required boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);

-- ---- Stage 3: strategy map (append-only snapshot) ---------------------------
create table if not exists brainstorm_strategy_maps (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null,
  thread_id           uuid        not null references brainstorm_threads(id) on delete cascade,
  layers              jsonb       not null default '[]'::jsonb,
  parked_decision_ids jsonb       not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);

-- ---- Stage 4: prompt pack + cards (append-only) -----------------------------
create table if not exists brainstorm_prompt_cards (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null,
  thread_id           uuid        not null references brainstorm_threads(id) on delete cascade,
  category            text        not null,
  task_title          text        not null,
  objective           text        not null default '',
  context             text        not null default '',
  requirements        jsonb       not null default '[]'::jsonb,
  affected_area       text        not null default '',
  acceptance_criteria jsonb       not null default '[]'::jsonb,
  constraints         jsonb       not null default '[]'::jsonb,
  dependencies        jsonb       not null default '[]'::jsonb,
  test_steps          jsonb       not null default '[]'::jsonb,
  rollback_notes      text        not null default '',
  recommended_agent   text        not null,
  decision_ids        jsonb       not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);

create table if not exists brainstorm_prompt_packs (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  thread_id   uuid        not null references brainstorm_threads(id) on delete cascade,
  prompt_ids  jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---- Stage 5: build queue tasks (mutable) -----------------------------------
create table if not exists brainstorm_build_tasks (
  id                   uuid        primary key default gen_random_uuid(),
  tenant_id            uuid        not null,
  thread_id            uuid        not null references brainstorm_threads(id) on delete cascade,
  prompt_id            uuid,
  name                 text        not null,
  status               text        not null default 'draft',
  priority             text        not null default 'medium',
  assigned_agent       text        not null,
  estimated_complexity text        not null default 'medium',
  dependencies         jsonb       not null default '[]'::jsonb,
  approved             boolean     not null default false,
  approved_at          timestamptz,
  execution_log        jsonb       not null default '[]'::jsonb,
  result               text        not null default '',
  qa_state             text,
  rollback_available   boolean     not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);

-- ---- Stage 6: approval summaries (append-only) ------------------------------
create table if not exists brainstorm_approvals (
  id                         uuid        primary key default gen_random_uuid(),
  tenant_id                  uuid        not null,
  thread_id                  uuid        not null references brainstorm_threads(id) on delete cascade,
  task_ids                   jsonb       not null default '[]'::jsonb,
  affected_files_modules     jsonb       not null default '[]'::jsonb,
  risks                      jsonb       not null default '[]'::jsonb,
  dependencies               jsonb       not null default '[]'::jsonb,
  includes_database_changes  boolean     not null default false,
  includes_ui_changes        boolean     not null default false,
  includes_production_deploy boolean     not null default false,
  highest_risk               text        not null default 'low',
  created_at                 timestamptz not null default now()
);

-- ---- Stage 7: agent run logs (append-only) ----------------------------------
create table if not exists brainstorm_agent_runs (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          uuid        not null,
  task_id            uuid        not null references brainstorm_build_tasks(id) on delete cascade,
  agent              text        not null,
  started_at         timestamptz not null,
  finished_at        timestamptz,
  files_touched      jsonb       not null default '[]'::jsonb,
  changes_made       jsonb       not null default '[]'::jsonb,
  errors             jsonb       not null default '[]'::jsonb,
  blockers           jsonb       not null default '[]'::jsonb,
  completion_result  text        not null,
  qa_result          text,
  changelog_entry_id uuid,
  created_at         timestamptz not null default now()
);

-- ---- Stage 8: QA results (append-only) --------------------------------------
create table if not exists brainstorm_qa_results (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  task_id               uuid        not null references brainstorm_build_tasks(id) on delete cascade,
  verdict               text        not null,
  checks                jsonb       not null default '[]'::jsonb,
  failure_reason        text,
  recommended_fix       text,
  retry_prompt          text,
  human_review_required boolean     not null default false,
  created_at            timestamptz not null default now()
);

-- ---- Stage 9: changelog entries (append-only) -------------------------------
create table if not exists brainstorm_changelog_entries (
  id                       uuid        primary key default gen_random_uuid(),
  tenant_id                uuid        not null,
  thread_id                uuid        not null references brainstorm_threads(id) on delete cascade,
  brainstorm_source        text        not null default '',
  decisions_extracted      integer     not null default 0,
  tasks_completed          jsonb       not null default '[]'::jsonb,
  tasks_failed             jsonb       not null default '[]'::jsonb,
  files_modules_changed    jsonb       not null default '[]'::jsonb,
  qa_results_summary       text        not null default '',
  deployment_status        text        not null default 'none',
  rollback_notes           text        not null default '',
  next_recommended_actions jsonb       not null default '[]'::jsonb,
  created_at               timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists brainstorm_inputs_thread_idx       on brainstorm_inputs (tenant_id, thread_id);
create index if not exists brainstorm_decisions_thread_idx    on brainstorm_decisions (tenant_id, thread_id);
create index if not exists brainstorm_prompt_cards_thread_idx on brainstorm_prompt_cards (tenant_id, thread_id);
create index if not exists brainstorm_build_tasks_thread_idx  on brainstorm_build_tasks (tenant_id, thread_id, status);
create index if not exists brainstorm_agent_runs_task_idx     on brainstorm_agent_runs (tenant_id, task_id);
create index if not exists brainstorm_qa_results_task_idx     on brainstorm_qa_results (tenant_id, task_id);
create index if not exists brainstorm_changelog_thread_idx    on brainstorm_changelog_entries (tenant_id, thread_id);

-- ---- updated_at triggers (mutable tables; set_updated_at() from 0001) --------
drop trigger if exists set_updated_at_brainstorm_threads on brainstorm_threads;
create trigger set_updated_at_brainstorm_threads
  before update on brainstorm_threads for each row execute function set_updated_at();

drop trigger if exists set_updated_at_brainstorm_decisions on brainstorm_decisions;
create trigger set_updated_at_brainstorm_decisions
  before update on brainstorm_decisions for each row execute function set_updated_at();

drop trigger if exists set_updated_at_brainstorm_build_tasks on brainstorm_build_tasks;
create trigger set_updated_at_brainstorm_build_tasks
  before update on brainstorm_build_tasks for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table brainstorm_threads            enable row level security;
alter table brainstorm_inputs             enable row level security;
alter table brainstorm_decisions          enable row level security;
alter table brainstorm_strategy_maps      enable row level security;
alter table brainstorm_prompt_cards       enable row level security;
alter table brainstorm_prompt_packs       enable row level security;
alter table brainstorm_build_tasks        enable row level security;
alter table brainstorm_approvals          enable row level security;
alter table brainstorm_agent_runs         enable row level security;
alter table brainstorm_qa_results         enable row level security;
alter table brainstorm_changelog_entries  enable row level security;

-- Mutable: SELECT + INSERT + UPDATE (threads, decisions, build_tasks).
create policy brainstorm_threads_select on brainstorm_threads
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_threads_insert on brainstorm_threads
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_threads_update on brainstorm_threads
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brainstorm_decisions_select on brainstorm_decisions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_decisions_insert on brainstorm_decisions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_decisions_update on brainstorm_decisions
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brainstorm_build_tasks_select on brainstorm_build_tasks
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_build_tasks_insert on brainstorm_build_tasks
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_build_tasks_update on brainstorm_build_tasks
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only.
create policy brainstorm_inputs_select on brainstorm_inputs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_inputs_insert on brainstorm_inputs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brainstorm_strategy_maps_select on brainstorm_strategy_maps
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_strategy_maps_insert on brainstorm_strategy_maps
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brainstorm_prompt_cards_select on brainstorm_prompt_cards
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_prompt_cards_insert on brainstorm_prompt_cards
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brainstorm_prompt_packs_select on brainstorm_prompt_packs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_prompt_packs_insert on brainstorm_prompt_packs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brainstorm_approvals_select on brainstorm_approvals
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_approvals_insert on brainstorm_approvals
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brainstorm_agent_runs_select on brainstorm_agent_runs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_agent_runs_insert on brainstorm_agent_runs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brainstorm_qa_results_select on brainstorm_qa_results
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_qa_results_insert on brainstorm_qa_results
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brainstorm_changelog_select on brainstorm_changelog_entries
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy brainstorm_changelog_insert on brainstorm_changelog_entries
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
