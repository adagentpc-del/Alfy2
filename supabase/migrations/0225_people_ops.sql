-- =============================================================================
-- Migration: 0225_people_ops.sql
-- Purpose:   People Operations + Hiring Lifecycle — the full hiring + team
--            operations loop (humans OR AI employees) across 13 stages plus the
--            Billion-Dollar Hiring Standard. Stages: role need detection ->
--            role design -> (hiring standard gate) -> job post -> candidate
--            pipeline -> interview -> offer -> onboarding docs -> access setup ->
--            training -> nurture -> performance -> delegation -> offboarding.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable tables (role_needs, role_designs, candidates, interview_processes,
--   offer_processes, onboarding_documents, access_grants, training_plans,
--   nurture_check_ins, performance_reviews, delegation_tasks, offboarding_processes)
--   get updated_at + the shared set_updated_at() trigger (from 0001) + UPDATE policy.
--   Append-only tables (hiring_standard_evaluations, job_posts) get SELECT + INSERT.
-- Array/object fields are jsonb. Enum-like fields are text, validated by the Zod
--   contract (people-ops.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Stage 1: role need detection (mutable) ---------------------------------
create table if not exists role_needs (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  business_id           uuid,
  description           text        not null,
  trigger               text        not null,
  founder_work_absorbed jsonb       not null default '[]'::jsonb,
  recommended_handler   text        not null default 'delegate_to_human',
  worker_kind           text        not null default 'human',
  frequency_per_week    integer     not null default 0,
  severity              text        not null default 'medium',
  role_recommended      boolean     not null default false,
  notes                 text        not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz
);

-- ---- Stage 2: role design (mutable) -----------------------------------------
create table if not exists role_designs (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null,
  need_id             uuid        references role_needs(id) on delete set null,
  worker_kind         text        not null default 'human',
  title               text        not null,
  mission             text        not null default '',
  responsibilities    jsonb       not null default '[]'::jsonb,
  outcomes            jsonb       not null default '[]'::jsonb,
  required_skills     jsonb       not null default '[]'::jsonb,
  tools_used          jsonb       not null default '[]'::jsonb,
  business_or_project text        not null default '',
  time_commitment     text        not null default 'contract',
  compensation_range  text        not null default '',
  success_metrics     jsonb       not null default '[]'::jsonb,
  access_required     jsonb       not null default '[]'::jsonb,
  stage               text        not null default 'role_designed',
  standard_passed     boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);

-- ---- Billion-Dollar Hiring Standard evaluations (append-only) ---------------
create table if not exists hiring_standard_evaluations (
  id                          uuid        primary key default gen_random_uuid(),
  tenant_id                   uuid        not null,
  role_id                     uuid        not null references role_designs(id) on delete cascade,
  removes_work_from_founder   boolean     not null default false,
  creates_revenue_capacity    boolean     not null default false,
  reduces_bottlenecks         boolean     not null default false,
  clearly_scoped              boolean     not null default false,
  success_measurable          boolean     not null default false,
  has_sop                     boolean     not null default false,
  access_limited              boolean     not null default false,
  ip_protected                boolean     not null default false,
  confidentiality_protected   boolean     not null default false,
  operates_without_handholding boolean    not null default false,
  passed                      boolean     not null default false,
  failed_criteria             jsonb       not null default '[]'::jsonb,
  recommendation              text        not null default '',
  created_at                  timestamptz not null default now()
);

-- ---- Stage 3: job post / outreach (append-only) -----------------------------
create table if not exists job_posts (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null,
  role_id             uuid        not null references role_designs(id) on delete cascade,
  job_description     text        not null default '',
  contractor_post     text        not null default '',
  referral_ask        text        not null default '',
  candidate_outreach  text        not null default '',
  screening_questions jsonb       not null default '[]'::jsonb,
  scorecard           jsonb       not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);

-- ---- Stage 4: candidate pipeline (mutable) ----------------------------------
create table if not exists candidates (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  role_id          uuid        not null references role_designs(id) on delete cascade,
  applicant        text        not null,
  source           text        not null default 'inbound',
  resume_profile   text        not null default '',
  skills           jsonb       not null default '[]'::jsonb,
  fit_score        real        not null default 0,
  interview_status text        not null default 'applied',
  notes            text        not null default '',
  red_flags        jsonb       not null default '[]'::jsonb,
  next_step        text        not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

-- ---- Stage 5: interview process (mutable) -----------------------------------
create table if not exists interview_processes (
  id                       uuid        primary key default gen_random_uuid(),
  tenant_id                uuid        not null,
  role_id                  uuid        not null references role_designs(id) on delete cascade,
  candidate_id             uuid        not null references candidates(id) on delete cascade,
  questions                jsonb       not null default '[]'::jsonb,
  test_task                text        not null default '',
  evaluation_scorecard     jsonb       not null default '[]'::jsonb,
  culture_values_screen    jsonb       not null default '[]'::jsonb,
  technical_skills_screen  jsonb       not null default '[]'::jsonb,
  reference_check_checklist jsonb      not null default '[]'::jsonb,
  recommended              boolean     not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz
);

-- ---- Stage 6: offer process (mutable) ---------------------------------------
create table if not exists offer_processes (
  id                             uuid        primary key default gen_random_uuid(),
  tenant_id                      uuid        not null,
  role_id                        uuid        not null references role_designs(id) on delete cascade,
  candidate_id                   uuid        not null references candidates(id) on delete cascade,
  offer_letter                   text        not null default '',
  contractor_agreement_checklist jsonb       not null default '[]'::jsonb,
  compensation_terms             text        not null default '',
  scope                          text        not null default '',
  start_date                     text,
  confidentiality_ip_clauses     jsonb       not null default '[]'::jsonb,
  access_rules                   jsonb       not null default '[]'::jsonb,
  accepted                       boolean     not null default false,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz
);

-- ---- Stage 7: onboarding documents (mutable; each tracked) ------------------
create table if not exists onboarding_documents (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null,
  role_id      uuid        not null references role_designs(id) on delete cascade,
  candidate_id uuid        references candidates(id) on delete set null,
  kind         text        not null,
  status       text        not null default 'not_started',
  link         text        not null default '',
  notes        text        not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

-- ---- Stage 8: access setup (mutable; trackable grants) ----------------------
create table if not exists access_grants (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null,
  role_id           uuid        not null references role_designs(id) on delete cascade,
  candidate_id      uuid        references candidates(id) on delete set null,
  system            text        not null,
  permissions_level text        not null default 'read',
  approval_required boolean     not null default true,
  status            text        not null default 'requested',
  granted_at        timestamptz,
  revoked_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);

-- ---- Stage 9: training plans (mutable) --------------------------------------
create table if not exists training_plans (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null,
  role_id             uuid        not null references role_designs(id) on delete cascade,
  candidate_id        uuid        references candidates(id) on delete set null,
  onboarding_plan     jsonb       not null default '[]'::jsonb,
  first_day_checklist jsonb       not null default '[]'::jsonb,
  first_week_checklist jsonb      not null default '[]'::jsonb,
  sops_to_review      jsonb       not null default '[]'::jsonb,
  business_briefing   text        not null default '',
  role_training       jsonb       not null default '[]'::jsonb,
  sample_tasks        jsonb       not null default '[]'::jsonb,
  quality_standards   jsonb       not null default '[]'::jsonb,
  escalation_rules    jsonb       not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);

-- ---- Stage 10: nurture check-ins (mutable) ----------------------------------
create table if not exists nurture_check_ins (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  role_id               uuid        not null references role_designs(id) on delete cascade,
  candidate_id          uuid        references candidates(id) on delete set null,
  check_ins             jsonb       not null default '[]'::jsonb,
  performance           text        not null default 'meets',
  blockers              jsonb       not null default '[]'::jsonb,
  workload              text        not null default 'meets',
  morale                text        not null default 'meets',
  training_needs        jsonb       not null default '[]'::jsonb,
  feedback              text        not null default '',
  promotion_eligibility boolean     not null default false,
  retention_risk        text        not null default 'low',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz
);

-- ---- Stage 11: performance reviews (mutable) --------------------------------
create table if not exists performance_reviews (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null,
  role_id             uuid        not null references role_designs(id) on delete cascade,
  candidate_id        uuid        references candidates(id) on delete set null,
  deliverables        text        not null default 'meets',
  timeliness          text        not null default 'meets',
  quality             text        not null default 'meets',
  communication       text        not null default 'meets',
  reliability         text        not null default 'meets',
  sop_adherence       text        not null default 'meets',
  improvement_notes   jsonb       not null default '[]'::jsonb,
  access_risk         text        not null default 'low',
  compensation_review text        not null default '',
  overall             text        not null default 'meets',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);

-- ---- Stage 12: delegation tasks (mutable) -----------------------------------
create table if not exists delegation_tasks (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  role_id          uuid        not null references role_designs(id) on delete cascade,
  candidate_id     uuid        references candidates(id) on delete set null,
  task             text        not null,
  context          text        not null default '',
  sop              text        not null default '',
  expected_output  text        not null default '',
  deadline         text,
  quality_checklist jsonb      not null default '[]'::jsonb,
  files_needed     jsonb       not null default '[]'::jsonb,
  approval_path    jsonb       not null default '[]'::jsonb,
  escalation_rule  text        not null default '',
  status           text        not null default 'drafted',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

-- ---- Stage 13: offboarding processes (mutable) ------------------------------
create table if not exists offboarding_processes (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null,
  role_id        uuid        not null references role_designs(id) on delete cascade,
  candidate_id   uuid        references candidates(id) on delete set null,
  reason         text        not null default '',
  steps          jsonb       not null default '[]'::jsonb,
  access_revoked boolean     not null default false,
  completed      boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists role_needs_tenant_idx              on role_needs (tenant_id);
create index if not exists role_designs_tenant_idx            on role_designs (tenant_id, stage);
create index if not exists hiring_standard_evals_role_idx     on hiring_standard_evaluations (tenant_id, role_id);
create index if not exists job_posts_role_idx                 on job_posts (tenant_id, role_id);
create index if not exists candidates_role_idx                on candidates (tenant_id, role_id, interview_status);
create index if not exists interview_processes_role_idx       on interview_processes (tenant_id, role_id);
create index if not exists offer_processes_role_idx           on offer_processes (tenant_id, role_id);
create index if not exists onboarding_documents_role_idx      on onboarding_documents (tenant_id, role_id);
create index if not exists access_grants_role_idx             on access_grants (tenant_id, role_id, status);
create index if not exists training_plans_role_idx            on training_plans (tenant_id, role_id);
create index if not exists nurture_check_ins_role_idx         on nurture_check_ins (tenant_id, role_id);
create index if not exists performance_reviews_role_idx       on performance_reviews (tenant_id, role_id);
create index if not exists delegation_tasks_role_idx          on delegation_tasks (tenant_id, role_id, status);
create index if not exists offboarding_processes_role_idx     on offboarding_processes (tenant_id, role_id);

-- ---- updated_at triggers (mutable tables; set_updated_at() from 0001) --------
drop trigger if exists set_updated_at_role_needs on role_needs;
create trigger set_updated_at_role_needs
  before update on role_needs for each row execute function set_updated_at();

drop trigger if exists set_updated_at_role_designs on role_designs;
create trigger set_updated_at_role_designs
  before update on role_designs for each row execute function set_updated_at();

drop trigger if exists set_updated_at_candidates on candidates;
create trigger set_updated_at_candidates
  before update on candidates for each row execute function set_updated_at();

drop trigger if exists set_updated_at_interview_processes on interview_processes;
create trigger set_updated_at_interview_processes
  before update on interview_processes for each row execute function set_updated_at();

drop trigger if exists set_updated_at_offer_processes on offer_processes;
create trigger set_updated_at_offer_processes
  before update on offer_processes for each row execute function set_updated_at();

drop trigger if exists set_updated_at_onboarding_documents on onboarding_documents;
create trigger set_updated_at_onboarding_documents
  before update on onboarding_documents for each row execute function set_updated_at();

drop trigger if exists set_updated_at_access_grants on access_grants;
create trigger set_updated_at_access_grants
  before update on access_grants for each row execute function set_updated_at();

drop trigger if exists set_updated_at_training_plans on training_plans;
create trigger set_updated_at_training_plans
  before update on training_plans for each row execute function set_updated_at();

drop trigger if exists set_updated_at_nurture_check_ins on nurture_check_ins;
create trigger set_updated_at_nurture_check_ins
  before update on nurture_check_ins for each row execute function set_updated_at();

drop trigger if exists set_updated_at_performance_reviews on performance_reviews;
create trigger set_updated_at_performance_reviews
  before update on performance_reviews for each row execute function set_updated_at();

drop trigger if exists set_updated_at_delegation_tasks on delegation_tasks;
create trigger set_updated_at_delegation_tasks
  before update on delegation_tasks for each row execute function set_updated_at();

drop trigger if exists set_updated_at_offboarding_processes on offboarding_processes;
create trigger set_updated_at_offboarding_processes
  before update on offboarding_processes for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table role_needs                  enable row level security;
alter table role_designs                enable row level security;
alter table hiring_standard_evaluations enable row level security;
alter table job_posts                   enable row level security;
alter table candidates                  enable row level security;
alter table interview_processes         enable row level security;
alter table offer_processes             enable row level security;
alter table onboarding_documents        enable row level security;
alter table access_grants               enable row level security;
alter table training_plans              enable row level security;
alter table nurture_check_ins           enable row level security;
alter table performance_reviews         enable row level security;
alter table delegation_tasks            enable row level security;
alter table offboarding_processes       enable row level security;

-- Mutable: SELECT + INSERT + UPDATE.
create policy role_needs_select on role_needs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy role_needs_insert on role_needs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy role_needs_update on role_needs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy role_designs_select on role_designs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy role_designs_insert on role_designs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy role_designs_update on role_designs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy candidates_select on candidates
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy candidates_insert on candidates
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy candidates_update on candidates
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy interview_processes_select on interview_processes
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy interview_processes_insert on interview_processes
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy interview_processes_update on interview_processes
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy offer_processes_select on offer_processes
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy offer_processes_insert on offer_processes
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy offer_processes_update on offer_processes
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy onboarding_documents_select on onboarding_documents
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy onboarding_documents_insert on onboarding_documents
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy onboarding_documents_update on onboarding_documents
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy access_grants_select on access_grants
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy access_grants_insert on access_grants
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy access_grants_update on access_grants
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy training_plans_select on training_plans
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy training_plans_insert on training_plans
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy training_plans_update on training_plans
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy nurture_check_ins_select on nurture_check_ins
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy nurture_check_ins_insert on nurture_check_ins
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy nurture_check_ins_update on nurture_check_ins
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy performance_reviews_select on performance_reviews
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy performance_reviews_insert on performance_reviews
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy performance_reviews_update on performance_reviews
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy delegation_tasks_select on delegation_tasks
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy delegation_tasks_insert on delegation_tasks
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy delegation_tasks_update on delegation_tasks
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy offboarding_processes_select on offboarding_processes
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy offboarding_processes_insert on offboarding_processes
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy offboarding_processes_update on offboarding_processes
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only.
create policy hiring_standard_evaluations_select on hiring_standard_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy hiring_standard_evaluations_insert on hiring_standard_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy job_posts_select on job_posts
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy job_posts_insert on job_posts
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
