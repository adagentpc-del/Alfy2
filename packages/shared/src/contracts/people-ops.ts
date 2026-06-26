import { z } from "zod";

/**
 * People Operations + Hiring Lifecycle — Alfy²'s native engine for the FULL hiring and team
 * operations loop (humans OR AI employees), not just job posts.
 *
 * The 13 lifecycle stages:
 *   1. Role Need Detection → 2. Role Design → 3. Job Post / Outreach → 4. Candidate Pipeline →
 *   5. Interview Process → 6. Offer Process → 7. Onboarding Documents → 8. Access Setup →
 *   9. Training → 10. Nurture → 11. Performance Management → 12. Delegation Engine → 13. Offboarding.
 *
 * PLUS the "Billion-Dollar Hiring Standard": a HiringStandardEvaluation with ten boolean criteria
 * and an overall pass/fail. NON-NEGOTIABLE RULE: never hire for vague help — hire for specific
 * outcomes. The engine enforces this — a role cannot advance to the job-post stage unless it passes
 * the standard.
 *
 * Every persisted entity carries id / tenant_id / created_at; mutable ones also carry a nullable
 * updated_at. All export names are prefixed (Role / Hiring / Candidate / Interview / Offer /
 * Onboarding / Access / Training / Nurture / Performance / Delegation / Offboarding / PeopleOps)
 * to stay globally unique in the shared barrel.
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 */

// ---------------------------------------------------------------------------
// Enums (uniquely prefixed to avoid barrel collisions with other contracts)
// ---------------------------------------------------------------------------

/** Whether the worker being hired is a human or an AI employee. */
export const PeopleOpsWorkerKindSchema = z.enum(["human", "ai_employee"]);
export type PeopleOpsWorkerKind = z.infer<typeof PeopleOpsWorkerKindSchema>;

/** Why a role is needed (the trigger surfaced during need detection). */
export const RoleNeedTriggerSchema = z.enum([
  "repeating_work",
  "founder_bottleneck",
  "needs_human_judgment",
  "ai_can_handle",
  "delegation_opportunity",
  "capacity_gap",
  "skill_gap",
  "growth_demand",
]);
export type RoleNeedTrigger = z.infer<typeof RoleNeedTriggerSchema>;

/** Where the work should ultimately be handled. */
export const RoleHandlerKindSchema = z.enum([
  "keep_with_founder",
  "delegate_to_human",
  "delegate_to_ai",
  "automate",
  "eliminate",
]);
export type RoleHandlerKind = z.infer<typeof RoleHandlerKindSchema>;

/** Lifecycle stage a role/position currently sits in. */
export const RoleLifecycleStageSchema = z.enum([
  "need_detected",
  "role_designed",
  "job_posted",
  "pipeline_open",
  "interviewing",
  "offer_extended",
  "onboarding",
  "access_setup",
  "training",
  "active",
  "performance_review",
  "offboarding",
  "closed",
]);
export type RoleLifecycleStage = z.infer<typeof RoleLifecycleStageSchema>;

/** Engagement / time commitment for a role. */
export const RoleTimeCommitmentSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "fractional",
  "project_based",
  "always_on_ai",
]);
export type RoleTimeCommitment = z.infer<typeof RoleTimeCommitmentSchema>;

/** A candidate's position in the pipeline. */
export const CandidateInterviewStatusSchema = z.enum([
  "applied",
  "screening",
  "interviewing",
  "test_task",
  "reference_check",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
]);
export type CandidateInterviewStatus = z.infer<typeof CandidateInterviewStatusSchema>;

/** Where a candidate came from. */
export const CandidateSourceSchema = z.enum([
  "referral",
  "job_board",
  "outreach",
  "inbound",
  "agency",
  "internal",
  "ai_marketplace",
]);
export type CandidateSource = z.infer<typeof CandidateSourceSchema>;

/** Tracked status of a single onboarding document. */
export const OnboardingDocStatusSchema = z.enum([
  "not_started",
  "sent",
  "in_progress",
  "signed",
  "received",
  "verified",
  "waived",
]);
export type OnboardingDocStatus = z.infer<typeof OnboardingDocStatusSchema>;

/** Which onboarding document this is. */
export const OnboardingDocKindSchema = z.enum([
  "nda",
  "contractor_agreement",
  "w9",
  "payment_info",
  "role_description",
  "code_of_conduct",
  "access_policy",
  "sop_packet",
  "tool_access_checklist",
]);
export type OnboardingDocKind = z.infer<typeof OnboardingDocKindSchema>;

/** A system an access grant is for. */
export const AccessSystemSchema = z.enum([
  "email",
  "slack",
  "google_drive",
  "project_mgmt",
  "github",
  "supabase",
  "platform",
  "password_vault",
]);
export type AccessSystem = z.infer<typeof AccessSystemSchema>;

/** Lifecycle status of a single access grant. (Prefixed to avoid colliding with
 * permission-memory.ts's AccessGrantStatus.) */
export const PeopleOpsAccessGrantStatusSchema = z.enum([
  "requested",
  "approval_pending",
  "granted",
  "denied",
  "revoked",
]);
export type PeopleOpsAccessGrantStatus = z.infer<typeof PeopleOpsAccessGrantStatusSchema>;

/** Permission level on a granted system. */
export const AccessPermissionLevelSchema = z.enum([
  "none",
  "read",
  "write",
  "admin",
  "owner",
]);
export type AccessPermissionLevel = z.infer<typeof AccessPermissionLevelSchema>;

/** Severity used across People Ops (own enum, NOT the shared RiskLevel). */
export const PeopleOpsSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type PeopleOpsSeverity = z.infer<typeof PeopleOpsSeveritySchema>;

/** A qualitative rating used in nurture + performance scoring. */
export const PeopleOpsRatingSchema = z.enum([
  "excellent",
  "strong",
  "meets",
  "below",
  "at_risk",
]);
export type PeopleOpsRating = z.infer<typeof PeopleOpsRatingSchema>;

/** State of a delegated task in the Delegation Engine. */
export const DelegationTaskStatusSchema = z.enum([
  "drafted",
  "assigned",
  "in_progress",
  "blocked",
  "submitted",
  "approved",
  "rejected",
  "completed",
]);
export type DelegationTaskStatus = z.infer<typeof DelegationTaskStatusSchema>;

/** Status of a single offboarding step. */
export const OffboardingStepStatusSchema = z.enum([
  "pending",
  "in_progress",
  "done",
  "skipped",
]);
export type OffboardingStepStatus = z.infer<typeof OffboardingStepStatusSchema>;

/** Which offboarding action a step represents. */
export const OffboardingStepKindSchema = z.enum([
  "revoke_access",
  "rotate_credentials",
  "collect_files",
  "transfer_ownership",
  "archive_docs",
  "document_status",
  "final_payment",
  "confidentiality_reminder",
]);
export type OffboardingStepKind = z.infer<typeof OffboardingStepKindSchema>;

// ---------------------------------------------------------------------------
// Stage 1 — Role Need Detection
// ---------------------------------------------------------------------------

export const RoleNeedSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid().nullable().default(null),
  /** What work repeats / blocks the founder / needs judgment — the surfaced need. */
  description: z.string().min(1),
  trigger: RoleNeedTriggerSchema,
  /** What the founder currently does that this would absorb. */
  founder_work_absorbed: z.array(z.string()).default([]),
  recommended_handler: RoleHandlerKindSchema.default("delegate_to_human"),
  worker_kind: PeopleOpsWorkerKindSchema.default("human"),
  frequency_per_week: z.number().int().nonnegative().default(0),
  severity: PeopleOpsSeveritySchema.default("medium"),
  /** Whether a role should actually be opened for this need. */
  role_recommended: z.boolean().default(false),
  notes: z.string().default(""),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type RoleNeed = z.infer<typeof RoleNeedSchema>;

export const DetectRoleNeedInputSchema = z.object({
  business_id: z.string().uuid().optional(),
  description: z.string().min(1),
  trigger: RoleNeedTriggerSchema.optional(),
  frequency_per_week: z.number().int().nonnegative().default(0),
  worker_kind: PeopleOpsWorkerKindSchema.default("human"),
  founder_work_absorbed: z.array(z.string()).default([]),
});
export type DetectRoleNeedInput = z.infer<typeof DetectRoleNeedInputSchema>;

// ---------------------------------------------------------------------------
// Stage 2 — Role Design
// ---------------------------------------------------------------------------

export const RoleDesignSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  need_id: z.string().uuid().nullable().default(null),
  worker_kind: PeopleOpsWorkerKindSchema.default("human"),
  title: z.string().min(1),
  mission: z.string().default(""),
  responsibilities: z.array(z.string()).default([]),
  outcomes: z.array(z.string()).default([]),
  required_skills: z.array(z.string()).default([]),
  tools_used: z.array(z.string()).default([]),
  business_or_project: z.string().default(""),
  time_commitment: RoleTimeCommitmentSchema.default("contract"),
  compensation_range: z.string().default(""),
  success_metrics: z.array(z.string()).default([]),
  access_required: z.array(AccessSystemSchema).default([]),
  stage: RoleLifecycleStageSchema.default("role_designed"),
  /** Set true once the role passes the Billion-Dollar Hiring Standard. */
  standard_passed: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type RoleDesign = z.infer<typeof RoleDesignSchema>;

export const DesignRoleInputSchema = z.object({
  need_id: z.string().uuid().optional(),
  worker_kind: PeopleOpsWorkerKindSchema.default("human"),
  title: z.string().min(1),
  mission: z.string().default(""),
  responsibilities: z.array(z.string()).default([]),
  outcomes: z.array(z.string()).default([]),
  required_skills: z.array(z.string()).default([]),
  tools_used: z.array(z.string()).default([]),
  business_or_project: z.string().default(""),
  time_commitment: RoleTimeCommitmentSchema.default("contract"),
  compensation_range: z.string().default(""),
  success_metrics: z.array(z.string()).default([]),
  access_required: z.array(AccessSystemSchema).default([]),
});
export type DesignRoleInput = z.infer<typeof DesignRoleInputSchema>;

// ---------------------------------------------------------------------------
// The "Billion-Dollar Hiring Standard"
// ---------------------------------------------------------------------------

export const HiringStandardEvaluationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  removes_work_from_founder: z.boolean().default(false),
  creates_revenue_capacity: z.boolean().default(false),
  reduces_bottlenecks: z.boolean().default(false),
  clearly_scoped: z.boolean().default(false),
  success_measurable: z.boolean().default(false),
  has_sop: z.boolean().default(false),
  access_limited: z.boolean().default(false),
  ip_protected: z.boolean().default(false),
  confidentiality_protected: z.boolean().default(false),
  operates_without_handholding: z.boolean().default(false),
  /** Overall verdict: true only when every criterion above is true. */
  passed: z.boolean().default(false),
  failed_criteria: z.array(z.string()).default([]),
  recommendation: z.string().default(""),
  created_at: z.string().datetime(),
});
export type HiringStandardEvaluation = z.infer<typeof HiringStandardEvaluationSchema>;

// ---------------------------------------------------------------------------
// Stage 3 — Job Post / Outreach
// ---------------------------------------------------------------------------

export const JobScreeningQuestionSchema = z.object({
  question: z.string().min(1),
  knockout: z.boolean().default(false),
});
export type JobScreeningQuestion = z.infer<typeof JobScreeningQuestionSchema>;

export const JobScorecardCriterionSchema = z.object({
  criterion: z.string().min(1),
  weight: z.number().min(0).max(1).default(0.2),
});
export type JobScorecardCriterion = z.infer<typeof JobScorecardCriterionSchema>;

export const JobPostSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  job_description: z.string().default(""),
  contractor_post: z.string().default(""),
  referral_ask: z.string().default(""),
  candidate_outreach: z.string().default(""),
  screening_questions: z.array(JobScreeningQuestionSchema).default([]),
  scorecard: z.array(JobScorecardCriterionSchema).default([]),
  created_at: z.string().datetime(),
});
export type JobPost = z.infer<typeof JobPostSchema>;

// ---------------------------------------------------------------------------
// Stage 4 — Candidate Pipeline
// ---------------------------------------------------------------------------

export const CandidateSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  applicant: z.string().min(1),
  source: CandidateSourceSchema.default("inbound"),
  resume_profile: z.string().default(""),
  skills: z.array(z.string()).default([]),
  fit_score: z.number().min(0).max(1).default(0),
  interview_status: CandidateInterviewStatusSchema.default("applied"),
  notes: z.string().default(""),
  red_flags: z.array(z.string()).default([]),
  next_step: z.string().default(""),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type Candidate = z.infer<typeof CandidateSchema>;

export const AddCandidateInputSchema = z.object({
  role_id: z.string().uuid(),
  applicant: z.string().min(1),
  source: CandidateSourceSchema.default("inbound"),
  resume_profile: z.string().default(""),
  skills: z.array(z.string()).default([]),
  fit_score: z.number().min(0).max(1).default(0),
});
export type AddCandidateInput = z.infer<typeof AddCandidateInputSchema>;

// ---------------------------------------------------------------------------
// Stage 5 — Interview Process
// ---------------------------------------------------------------------------

export const InterviewScorecardItemSchema = z.object({
  criterion: z.string().min(1),
  rating: PeopleOpsRatingSchema.default("meets"),
  notes: z.string().default(""),
});
export type InterviewScorecardItem = z.infer<typeof InterviewScorecardItemSchema>;

export const InterviewProcessSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
  questions: z.array(z.string()).default([]),
  test_task: z.string().default(""),
  evaluation_scorecard: z.array(InterviewScorecardItemSchema).default([]),
  culture_values_screen: z.array(z.string()).default([]),
  technical_skills_screen: z.array(z.string()).default([]),
  reference_check_checklist: z.array(z.string()).default([]),
  recommended: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type InterviewProcess = z.infer<typeof InterviewProcessSchema>;

// ---------------------------------------------------------------------------
// Stage 6 — Offer Process
// ---------------------------------------------------------------------------

export const OfferProcessSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  candidate_id: z.string().uuid(),
  offer_letter: z.string().default(""),
  contractor_agreement_checklist: z.array(z.string()).default([]),
  compensation_terms: z.string().default(""),
  scope: z.string().default(""),
  start_date: z.string().nullable().default(null),
  confidentiality_ip_clauses: z.array(z.string()).default([]),
  access_rules: z.array(z.string()).default([]),
  accepted: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type OfferProcess = z.infer<typeof OfferProcessSchema>;

// ---------------------------------------------------------------------------
// Stage 7 — Onboarding Documents (each tracked with a status)
// ---------------------------------------------------------------------------

export const OnboardingDocumentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  candidate_id: z.string().uuid().nullable().default(null),
  kind: OnboardingDocKindSchema,
  status: OnboardingDocStatusSchema.default("not_started"),
  link: z.string().default(""),
  notes: z.string().default(""),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type OnboardingDocument = z.infer<typeof OnboardingDocumentSchema>;

// ---------------------------------------------------------------------------
// Stage 8 — Access Setup (each as a trackable AccessGrant)
// ---------------------------------------------------------------------------

export const AccessGrantSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  candidate_id: z.string().uuid().nullable().default(null),
  system: AccessSystemSchema,
  permissions_level: AccessPermissionLevelSchema.default("read"),
  approval_required: z.boolean().default(true),
  status: PeopleOpsAccessGrantStatusSchema.default("requested"),
  granted_at: z.string().datetime().nullable().default(null),
  revoked_at: z.string().datetime().nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type AccessGrant = z.infer<typeof AccessGrantSchema>;

// ---------------------------------------------------------------------------
// Stage 9 — Training
// ---------------------------------------------------------------------------

export const TrainingPlanSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  candidate_id: z.string().uuid().nullable().default(null),
  onboarding_plan: z.array(z.string()).default([]),
  first_day_checklist: z.array(z.string()).default([]),
  first_week_checklist: z.array(z.string()).default([]),
  sops_to_review: z.array(z.string()).default([]),
  business_briefing: z.string().default(""),
  role_training: z.array(z.string()).default([]),
  sample_tasks: z.array(z.string()).default([]),
  quality_standards: z.array(z.string()).default([]),
  escalation_rules: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type TrainingPlan = z.infer<typeof TrainingPlanSchema>;

// ---------------------------------------------------------------------------
// Stage 10 — Nurture
// ---------------------------------------------------------------------------

export const NurtureCheckInSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  candidate_id: z.string().uuid().nullable().default(null),
  check_ins: z.array(z.string()).default([]),
  performance: PeopleOpsRatingSchema.default("meets"),
  blockers: z.array(z.string()).default([]),
  workload: PeopleOpsRatingSchema.default("meets"),
  morale: PeopleOpsRatingSchema.default("meets"),
  training_needs: z.array(z.string()).default([]),
  feedback: z.string().default(""),
  promotion_eligibility: z.boolean().default(false),
  retention_risk: PeopleOpsSeveritySchema.default("low"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type NurtureCheckIn = z.infer<typeof NurtureCheckInSchema>;

// ---------------------------------------------------------------------------
// Stage 11 — Performance Management
// ---------------------------------------------------------------------------

export const PerformanceReviewSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  candidate_id: z.string().uuid().nullable().default(null),
  deliverables: PeopleOpsRatingSchema.default("meets"),
  timeliness: PeopleOpsRatingSchema.default("meets"),
  quality: PeopleOpsRatingSchema.default("meets"),
  communication: PeopleOpsRatingSchema.default("meets"),
  reliability: PeopleOpsRatingSchema.default("meets"),
  sop_adherence: PeopleOpsRatingSchema.default("meets"),
  improvement_notes: z.array(z.string()).default([]),
  access_risk: PeopleOpsSeveritySchema.default("low"),
  compensation_review: z.string().default(""),
  overall: PeopleOpsRatingSchema.default("meets"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type PerformanceReview = z.infer<typeof PerformanceReviewSchema>;

// ---------------------------------------------------------------------------
// Stage 12 — Delegation Engine
// ---------------------------------------------------------------------------

export const DelegationTaskSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  candidate_id: z.string().uuid().nullable().default(null),
  task: z.string().min(1),
  context: z.string().default(""),
  sop: z.string().default(""),
  expected_output: z.string().default(""),
  deadline: z.string().nullable().default(null),
  quality_checklist: z.array(z.string()).default([]),
  files_needed: z.array(z.string()).default([]),
  approval_path: z.array(z.string()).default([]),
  escalation_rule: z.string().default(""),
  status: DelegationTaskStatusSchema.default("drafted"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type DelegationTask = z.infer<typeof DelegationTaskSchema>;

export const DelegateTaskInputSchema = z.object({
  role_id: z.string().uuid(),
  candidate_id: z.string().uuid().optional(),
  task: z.string().min(1),
  context: z.string().default(""),
  sop: z.string().default(""),
  expected_output: z.string().default(""),
  deadline: z.string().optional(),
  quality_checklist: z.array(z.string()).default([]),
  files_needed: z.array(z.string()).default([]),
  approval_path: z.array(z.string()).default([]),
  escalation_rule: z.string().default(""),
});
export type DelegateTaskInput = z.infer<typeof DelegateTaskInputSchema>;

// ---------------------------------------------------------------------------
// Stage 13 — Offboarding
// ---------------------------------------------------------------------------

export const OffboardingStepSchema = z.object({
  kind: OffboardingStepKindSchema,
  status: OffboardingStepStatusSchema.default("pending"),
  notes: z.string().default(""),
});
export type OffboardingStep = z.infer<typeof OffboardingStepSchema>;

export const OffboardingProcessSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role_id: z.string().uuid(),
  candidate_id: z.string().uuid().nullable().default(null),
  reason: z.string().default(""),
  steps: z.array(OffboardingStepSchema).default([]),
  access_revoked: z.boolean().default(false),
  completed: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type OffboardingProcess = z.infer<typeof OffboardingProcessSchema>;
