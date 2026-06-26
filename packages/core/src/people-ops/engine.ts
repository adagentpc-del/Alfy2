import type { z } from "zod";
import {
  RoleNeedSchema,
  DetectRoleNeedInputSchema,
  RoleDesignSchema,
  DesignRoleInputSchema,
  HiringStandardEvaluationSchema,
  JobPostSchema,
  CandidateSchema,
  AddCandidateInputSchema,
  InterviewProcessSchema,
  OfferProcessSchema,
  OnboardingDocumentSchema,
  AccessGrantSchema,
  TrainingPlanSchema,
  NurtureCheckInSchema,
  PerformanceReviewSchema,
  DelegationTaskSchema,
  DelegateTaskInputSchema,
  OffboardingProcessSchema,
  type RoleNeed,
  type RoleDesign,
  type RoleHandlerKind,
  type RoleLifecycleStage,
  type HiringStandardEvaluation,
  type JobPost,
  type JobScreeningQuestion,
  type JobScorecardCriterion,
  type Candidate,
  type CandidateInterviewStatus,
  type InterviewProcess,
  type InterviewScorecardItem,
  type OfferProcess,
  type OnboardingDocument,
  type OnboardingDocKind,
  type OnboardingDocStatus,
  type AccessGrant,
  type AccessSystem,
  type AccessPermissionLevel,
  type PeopleOpsAccessGrantStatus,
  type TrainingPlan,
  type NurtureCheckIn,
  type PerformanceReview,
  type DelegationTask,
  type DelegationTaskStatus,
  type OffboardingProcess,
  type OffboardingStep,
  type OffboardingStepKind,
} from "@alfy2/shared";

/**
 * People Operations + Hiring Lifecycle engine — the full hiring + team operations loop for humans
 * OR AI employees, across 13 stages plus the Billion-Dollar Hiring Standard.
 *
 * Deterministic and infrastructure-free (in-memory reference store; real persistence + AI-assisted
 * drafting arrive in Phase 2 behind the AI Gateway flag). The NON-NEGOTIABLE rule is enforced in
 * code: {@link generateJobPost} refuses to post a role that has not PASSED the Billion-Dollar Hiring
 * Standard via {@link evaluateHiringStandard}. Never hire for vague help — hire for specific outcomes.
 */

export interface PeopleOpsEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class PeopleOpsEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PeopleOpsEngineError";
  }
}

interface Stores {
  needs: Map<string, RoleNeed>;
  roles: Map<string, RoleDesign>;
  evaluations: Map<string, HiringStandardEvaluation>;
  jobPosts: Map<string, JobPost>;
  candidates: Map<string, Candidate>;
  interviews: Map<string, InterviewProcess>;
  offers: Map<string, OfferProcess>;
  onboardingDocs: Map<string, OnboardingDocument>;
  accessGrants: Map<string, AccessGrant>;
  trainingPlans: Map<string, TrainingPlan>;
  nurture: Map<string, NurtureCheckIn>;
  performance: Map<string, PerformanceReview>;
  delegations: Map<string, DelegationTask>;
  offboardings: Map<string, OffboardingProcess>;
}

/** The ten criteria that make up the Billion-Dollar Hiring Standard. */
const STANDARD_CRITERIA = [
  "removes_work_from_founder",
  "creates_revenue_capacity",
  "reduces_bottlenecks",
  "clearly_scoped",
  "success_measurable",
  "has_sop",
  "access_limited",
  "ip_protected",
  "confidentiality_protected",
  "operates_without_handholding",
] as const;

type StandardCriterion = (typeof STANDARD_CRITERIA)[number];

export class PeopleOpsEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    needs: new Map(),
    roles: new Map(),
    evaluations: new Map(),
    jobPosts: new Map(),
    candidates: new Map(),
    interviews: new Map(),
    offers: new Map(),
    onboardingDocs: new Map(),
    accessGrants: new Map(),
    trainingPlans: new Map(),
    nurture: new Map(),
    performance: new Map(),
    delegations: new Map(),
    offboardings: new Map(),
  };

  constructor(options: PeopleOpsEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Stage 1: Role Need Detection ---------------------------------------

  detectRoleNeed(tenantId: string, input: z.input<typeof DetectRoleNeedInputSchema>): RoleNeed {
    const parsed = DetectRoleNeedInputSchema.parse(input);
    const now = this.clock().toISOString();
    const trigger = parsed.trigger ?? classifyTrigger(parsed.description, parsed.frequency_per_week);
    const handler = handlerFor(trigger, parsed.worker_kind);
    const severity = parsed.frequency_per_week >= 5 ? "high" : parsed.frequency_per_week >= 2 ? "medium" : "low";
    const need = RoleNeedSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      ...(parsed.business_id !== undefined ? { business_id: parsed.business_id } : { business_id: null }),
      description: parsed.description,
      trigger,
      founder_work_absorbed: parsed.founder_work_absorbed,
      recommended_handler: handler,
      worker_kind: parsed.worker_kind,
      frequency_per_week: parsed.frequency_per_week,
      severity,
      role_recommended: handler === "delegate_to_human" || handler === "delegate_to_ai",
      notes: "",
      created_at: now,
      updated_at: null,
    });
    this.s.needs.set(need.id, need);
    return need;
  }

  getRoleNeed(tenantId: string, needId: string): RoleNeed {
    const n = this.s.needs.get(needId);
    if (!n || n.tenant_id !== tenantId) throw new PeopleOpsEngineError("role need not found");
    return n;
  }

  listRoleNeeds(tenantId: string): RoleNeed[] {
    return [...this.s.needs.values()].filter((n) => n.tenant_id === tenantId);
  }

  // --- Stage 2: Role Design ------------------------------------------------

  designRole(tenantId: string, input: z.input<typeof DesignRoleInputSchema>): RoleDesign {
    const parsed = DesignRoleInputSchema.parse(input);
    if (parsed.need_id !== undefined) this.getRoleNeed(tenantId, parsed.need_id); // assert exists + tenant
    const now = this.clock().toISOString();
    const role = RoleDesignSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      need_id: parsed.need_id ?? null,
      worker_kind: parsed.worker_kind,
      title: parsed.title,
      mission: parsed.mission,
      responsibilities: parsed.responsibilities,
      outcomes: parsed.outcomes,
      required_skills: parsed.required_skills,
      tools_used: parsed.tools_used,
      business_or_project: parsed.business_or_project,
      time_commitment: parsed.time_commitment,
      compensation_range: parsed.compensation_range,
      success_metrics: parsed.success_metrics,
      access_required: parsed.access_required,
      stage: "role_designed",
      standard_passed: false,
      created_at: now,
      updated_at: null,
    });
    this.s.roles.set(role.id, role);
    return role;
  }

  getRole(tenantId: string, roleId: string): RoleDesign {
    const r = this.s.roles.get(roleId);
    if (!r || r.tenant_id !== tenantId) throw new PeopleOpsEngineError("role not found");
    return r;
  }

  listRoles(tenantId: string): RoleDesign[] {
    return [...this.s.roles.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- The Billion-Dollar Hiring Standard ----------------------------------

  /**
   * Evaluate a role against the ten-criterion Billion-Dollar Hiring Standard. A scoped role — one
   * with a mission, outcomes, success_metrics, an SOP-ready responsibility set, limited access, and
   * IP/confidentiality protection — PASSES. A vague role ("help out generally") FAILS. The verdict
   * is recorded on the role (standard_passed) and gates {@link generateJobPost}.
   */
  evaluateHiringStandard(tenantId: string, roleId: string): HiringStandardEvaluation {
    const role = this.getRole(tenantId, roleId);
    const need = role.need_id ? this.s.needs.get(role.need_id) : undefined;

    const criteria: Record<StandardCriterion, boolean> = {
      removes_work_from_founder:
        (need?.founder_work_absorbed.length ?? 0) > 0 || role.responsibilities.length > 0,
      creates_revenue_capacity:
        role.outcomes.some((o) => /revenue|sales|growth|pipeline|capacity|deliver/i.test(o)) ||
        role.success_metrics.length > 0,
      reduces_bottlenecks:
        need?.trigger === "founder_bottleneck" ||
        need?.recommended_handler === "delegate_to_human" ||
        need?.recommended_handler === "delegate_to_ai" ||
        role.responsibilities.length >= 2,
      clearly_scoped:
        role.mission.trim().length > 0 && role.responsibilities.length > 0 && role.outcomes.length > 0,
      success_measurable: role.success_metrics.length > 0,
      has_sop: role.responsibilities.length > 0 && role.tools_used.length > 0,
      access_limited: role.access_required.length > 0,
      ip_protected: role.access_required.length > 0,
      confidentiality_protected: role.worker_kind === "ai_employee" || role.access_required.length > 0,
      operates_without_handholding:
        role.outcomes.length > 0 && role.success_metrics.length > 0 && role.responsibilities.length > 0,
    };

    const failed: string[] = STANDARD_CRITERIA.filter((c) => !criteria[c]);
    const passed = failed.length === 0;
    const evaluation = HiringStandardEvaluationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      role_id: roleId,
      removes_work_from_founder: criteria.removes_work_from_founder,
      creates_revenue_capacity: criteria.creates_revenue_capacity,
      reduces_bottlenecks: criteria.reduces_bottlenecks,
      clearly_scoped: criteria.clearly_scoped,
      success_measurable: criteria.success_measurable,
      has_sop: criteria.has_sop,
      access_limited: criteria.access_limited,
      ip_protected: criteria.ip_protected,
      confidentiality_protected: criteria.confidentiality_protected,
      operates_without_handholding: criteria.operates_without_handholding,
      passed,
      failed_criteria: failed,
      recommendation: passed
        ? "Role passes the Billion-Dollar Hiring Standard — cleared to post."
        : `Do not post. Hire for specific outcomes, not vague help. Fix: ${failed.join(", ")}.`,
      created_at: this.clock().toISOString(),
    });
    this.s.evaluations.set(evaluation.id, evaluation);
    this.s.roles.set(role.id, { ...role, standard_passed: passed, updated_at: this.clock().toISOString() });
    return evaluation;
  }

  listEvaluations(tenantId: string, roleId: string): HiringStandardEvaluation[] {
    return [...this.s.evaluations.values()].filter(
      (e) => e.tenant_id === tenantId && e.role_id === roleId,
    );
  }

  // --- Stage 3: Job Post / Outreach (GATED by the standard) ----------------

  /**
   * Generate the job post + outreach pack. ENFORCES the non-negotiable rule: a role that has not
   * PASSED the Billion-Dollar Hiring Standard cannot reach the job-post stage.
   */
  generateJobPost(tenantId: string, roleId: string): JobPost {
    const role = this.getRole(tenantId, roleId);
    if (!role.standard_passed) {
      throw new PeopleOpsEngineError(
        "role has not passed the Billion-Dollar Hiring Standard; cannot post (hire for specific outcomes, not vague help)",
      );
    }
    const now = this.clock().toISOString();
    const screening: JobScreeningQuestion[] = role.required_skills.map((skill) => ({
      question: `Describe concrete experience with ${skill}.`,
      knockout: false,
    }));
    if (role.outcomes[0]) {
      screening.push({ question: `How would you deliver: ${role.outcomes[0]}?`, knockout: true });
    }
    const scorecard: JobScorecardCriterion[] = role.success_metrics.map((m) => ({
      criterion: m,
      weight: role.success_metrics.length > 0 ? Number((1 / role.success_metrics.length).toFixed(2)) : 0.2,
    }));
    const post = JobPostSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      role_id: roleId,
      job_description: `${role.title} — ${role.mission}`.trim(),
      contractor_post: `Contract ${role.title} (${role.time_commitment}). Outcomes: ${role.outcomes.join("; ")}.`,
      referral_ask: `Know a great ${role.title}? Outcomes we need: ${role.outcomes.join("; ")}.`,
      candidate_outreach: `We're hiring a ${role.title} to own: ${role.responsibilities.join("; ")}.`,
      screening_questions: screening,
      scorecard,
      created_at: now,
    });
    this.s.jobPosts.set(post.id, post);
    this.s.roles.set(role.id, { ...role, stage: "job_posted", updated_at: now });
    return post;
  }

  listJobPosts(tenantId: string, roleId: string): JobPost[] {
    return [...this.s.jobPosts.values()].filter((p) => p.tenant_id === tenantId && p.role_id === roleId);
  }

  // --- Stage 4: Candidate Pipeline -----------------------------------------

  addCandidate(tenantId: string, input: z.input<typeof AddCandidateInputSchema>): Candidate {
    const parsed = AddCandidateInputSchema.parse(input);
    this.getRole(tenantId, parsed.role_id); // assert exists + tenant
    const now = this.clock().toISOString();
    const candidate = CandidateSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      role_id: parsed.role_id,
      applicant: parsed.applicant,
      source: parsed.source,
      resume_profile: parsed.resume_profile,
      skills: parsed.skills,
      fit_score: parsed.fit_score,
      interview_status: "applied",
      notes: "",
      red_flags: [],
      next_step: "Screen against scorecard.",
      created_at: now,
      updated_at: null,
    });
    this.s.candidates.set(candidate.id, candidate);
    this.setRoleStage(tenantId, parsed.role_id, "pipeline_open");
    return candidate;
  }

  advanceCandidate(
    tenantId: string,
    candidateId: string,
    status: CandidateInterviewStatus,
    next_step?: string,
  ): Candidate {
    const c = this.s.candidates.get(candidateId);
    if (!c || c.tenant_id !== tenantId) throw new PeopleOpsEngineError("candidate not found");
    const next: Candidate = {
      ...c,
      interview_status: status,
      ...(next_step !== undefined ? { next_step } : {}),
      updated_at: this.clock().toISOString(),
    };
    this.s.candidates.set(next.id, next);
    return next;
  }

  listCandidates(tenantId: string, roleId: string): Candidate[] {
    return [...this.s.candidates.values()].filter((c) => c.tenant_id === tenantId && c.role_id === roleId);
  }

  // --- Stage 5: Interview Process ------------------------------------------

  startInterview(tenantId: string, roleId: string, candidateId: string): InterviewProcess {
    const role = this.getRole(tenantId, roleId);
    const candidate = this.s.candidates.get(candidateId);
    if (!candidate || candidate.tenant_id !== tenantId) throw new PeopleOpsEngineError("candidate not found");
    const now = this.clock().toISOString();
    const scorecard: InterviewScorecardItem[] = role.success_metrics.map((m) => ({
      criterion: m,
      rating: "meets",
      notes: "",
    }));
    const interview = InterviewProcessSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      role_id: roleId,
      candidate_id: candidateId,
      questions: role.responsibilities.map((r) => `Walk me through how you'd handle: ${r}`),
      test_task: role.outcomes[0] ? `Produce a sample for: ${role.outcomes[0]}` : "Sample deliverable.",
      evaluation_scorecard: scorecard,
      culture_values_screen: ["Operates without handholding", "Communicates blockers early"],
      technical_skills_screen: role.required_skills,
      reference_check_checklist: ["Confirm scope of prior work", "Confirm reliability", "Confirm confidentiality"],
      recommended: false,
      created_at: now,
      updated_at: null,
    });
    this.s.interviews.set(interview.id, interview);
    this.advanceCandidate(tenantId, candidateId, "interviewing", "Run interview + test task.");
    this.setRoleStage(tenantId, roleId, "interviewing");
    return interview;
  }

  recordInterviewOutcome(tenantId: string, interviewId: string, recommended: boolean): InterviewProcess {
    const i = this.s.interviews.get(interviewId);
    if (!i || i.tenant_id !== tenantId) throw new PeopleOpsEngineError("interview not found");
    const next: InterviewProcess = { ...i, recommended, updated_at: this.clock().toISOString() };
    this.s.interviews.set(next.id, next);
    return next;
  }

  listInterviews(tenantId: string, roleId: string): InterviewProcess[] {
    return [...this.s.interviews.values()].filter((i) => i.tenant_id === tenantId && i.role_id === roleId);
  }

  // --- Stage 6: Offer Process ----------------------------------------------

  extendOffer(
    tenantId: string,
    roleId: string,
    candidateId: string,
    input: { compensation_terms?: string; scope?: string; start_date?: string } = {},
  ): OfferProcess {
    const role = this.getRole(tenantId, roleId);
    const candidate = this.s.candidates.get(candidateId);
    if (!candidate || candidate.tenant_id !== tenantId) throw new PeopleOpsEngineError("candidate not found");
    const now = this.clock().toISOString();
    const offer = OfferProcessSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      role_id: roleId,
      candidate_id: candidateId,
      offer_letter: `Offer: ${role.title} for ${candidate.applicant}.`,
      contractor_agreement_checklist: ["Scope agreed", "Comp agreed", "IP assignment signed", "NDA signed"],
      compensation_terms: input.compensation_terms ?? role.compensation_range,
      scope: input.scope ?? role.responsibilities.join("; "),
      start_date: input.start_date ?? null,
      confidentiality_ip_clauses: ["Confidentiality of all business data", "Full IP assignment of work product"],
      access_rules: role.access_required.map((a) => `${a}: least-privilege, approval-gated`),
      accepted: false,
      created_at: now,
      updated_at: null,
    });
    this.s.offers.set(offer.id, offer);
    this.advanceCandidate(tenantId, candidateId, "offer", "Await acceptance.");
    this.setRoleStage(tenantId, roleId, "offer_extended");
    return offer;
  }

  acceptOffer(tenantId: string, offerId: string): OfferProcess {
    const o = this.s.offers.get(offerId);
    if (!o || o.tenant_id !== tenantId) throw new PeopleOpsEngineError("offer not found");
    const next: OfferProcess = { ...o, accepted: true, updated_at: this.clock().toISOString() };
    this.s.offers.set(next.id, next);
    this.advanceCandidate(tenantId, o.candidate_id, "hired", "Begin onboarding.");
    this.setRoleStage(tenantId, o.role_id, "onboarding");
    return next;
  }

  listOffers(tenantId: string, roleId: string): OfferProcess[] {
    return [...this.s.offers.values()].filter((o) => o.tenant_id === tenantId && o.role_id === roleId);
  }

  // --- Stage 7: Onboarding Documents (each tracked) ------------------------

  /** Create the standard onboarding-document packet, each tracked with a status. */
  createOnboardingPacket(tenantId: string, roleId: string, candidateId: string): OnboardingDocument[] {
    this.getRole(tenantId, roleId);
    const now = this.clock().toISOString();
    const kinds: OnboardingDocKind[] = [
      "nda",
      "contractor_agreement",
      "w9",
      "payment_info",
      "role_description",
      "code_of_conduct",
      "access_policy",
      "sop_packet",
      "tool_access_checklist",
    ];
    const docs: OnboardingDocument[] = kinds.map((kind) => {
      const doc = OnboardingDocumentSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        role_id: roleId,
        candidate_id: candidateId,
        kind,
        status: "not_started",
        link: "",
        notes: "",
        created_at: now,
        updated_at: null,
      });
      this.s.onboardingDocs.set(doc.id, doc);
      return doc;
    });
    return docs;
  }

  updateOnboardingDoc(tenantId: string, docId: string, status: OnboardingDocStatus): OnboardingDocument {
    const d = this.s.onboardingDocs.get(docId);
    if (!d || d.tenant_id !== tenantId) throw new PeopleOpsEngineError("onboarding document not found");
    const next: OnboardingDocument = { ...d, status, updated_at: this.clock().toISOString() };
    this.s.onboardingDocs.set(next.id, next);
    return next;
  }

  listOnboardingDocs(tenantId: string, roleId: string): OnboardingDocument[] {
    return [...this.s.onboardingDocs.values()].filter((d) => d.tenant_id === tenantId && d.role_id === roleId);
  }

  // --- Stage 8: Access Setup (trackable grants) ----------------------------

  requestAccessGrants(
    tenantId: string,
    roleId: string,
    candidateId: string,
    systems?: { system: AccessSystem; permissions_level?: AccessPermissionLevel; approval_required?: boolean }[],
  ): AccessGrant[] {
    const role = this.getRole(tenantId, roleId);
    const now = this.clock().toISOString();
    const requested: { system: AccessSystem; permissions_level?: AccessPermissionLevel; approval_required?: boolean }[] =
      systems ?? role.access_required.map((system) => ({ system }));
    const grants: AccessGrant[] = requested.map((req) => {
      const grant = AccessGrantSchema.parse({
        id: this.newId(),
        tenant_id: tenantId,
        role_id: roleId,
        candidate_id: candidateId,
        system: req.system,
        permissions_level: req.permissions_level ?? "read",
        approval_required: req.approval_required ?? true,
        status: "requested",
        granted_at: null,
        revoked_at: null,
        created_at: now,
        updated_at: null,
      });
      this.s.accessGrants.set(grant.id, grant);
      return grant;
    });
    this.setRoleStage(tenantId, roleId, "access_setup");
    return grants;
  }

  grantAccess(tenantId: string, grantId: string): AccessGrant {
    const g = this.s.accessGrants.get(grantId);
    if (!g || g.tenant_id !== tenantId) throw new PeopleOpsEngineError("access grant not found");
    const now = this.clock().toISOString();
    const next: AccessGrant = { ...g, status: "granted", granted_at: now, updated_at: now };
    this.s.accessGrants.set(next.id, next);
    return next;
  }

  revokeAccess(tenantId: string, grantId: string): AccessGrant {
    const g = this.s.accessGrants.get(grantId);
    if (!g || g.tenant_id !== tenantId) throw new PeopleOpsEngineError("access grant not found");
    const now = this.clock().toISOString();
    const next: AccessGrant = { ...g, status: "revoked", revoked_at: now, updated_at: now };
    this.s.accessGrants.set(next.id, next);
    return next;
  }

  setAccessStatus(tenantId: string, grantId: string, status: PeopleOpsAccessGrantStatus): AccessGrant {
    const g = this.s.accessGrants.get(grantId);
    if (!g || g.tenant_id !== tenantId) throw new PeopleOpsEngineError("access grant not found");
    const next: AccessGrant = { ...g, status, updated_at: this.clock().toISOString() };
    this.s.accessGrants.set(next.id, next);
    return next;
  }

  listAccessGrants(tenantId: string, roleId: string): AccessGrant[] {
    return [...this.s.accessGrants.values()].filter((g) => g.tenant_id === tenantId && g.role_id === roleId);
  }

  // --- Stage 9: Training ---------------------------------------------------

  createTrainingPlan(tenantId: string, roleId: string, candidateId: string): TrainingPlan {
    const role = this.getRole(tenantId, roleId);
    const now = this.clock().toISOString();
    const plan = TrainingPlanSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      role_id: roleId,
      candidate_id: candidateId,
      onboarding_plan: ["Read business briefing", "Review SOP packet", "Shadow first task"],
      first_day_checklist: ["Confirm access", "Review code of conduct", "Meet point of contact"],
      first_week_checklist: ["Complete sample tasks", "First check-in", "Confirm quality standards"],
      sops_to_review: role.tools_used.map((t) => `SOP: ${t}`),
      business_briefing: role.business_or_project || "Business briefing pending.",
      role_training: role.responsibilities.map((r) => `Train on: ${r}`),
      sample_tasks: role.outcomes.map((o) => `Sample: ${o}`),
      quality_standards: role.success_metrics,
      escalation_rules: ["Escalate blockers within 24h", "Escalate access issues immediately"],
      created_at: now,
      updated_at: null,
    });
    this.s.trainingPlans.set(plan.id, plan);
    this.setRoleStage(tenantId, roleId, "training");
    return plan;
  }

  listTrainingPlans(tenantId: string, roleId: string): TrainingPlan[] {
    return [...this.s.trainingPlans.values()].filter((p) => p.tenant_id === tenantId && p.role_id === roleId);
  }

  // --- Stage 10: Nurture ---------------------------------------------------

  recordNurtureCheckIn(
    tenantId: string,
    roleId: string,
    candidateId: string,
    input: Partial<Omit<NurtureCheckIn, "id" | "tenant_id" | "role_id" | "candidate_id" | "created_at" | "updated_at">> = {},
  ): NurtureCheckIn {
    this.getRole(tenantId, roleId);
    const now = this.clock().toISOString();
    const check = NurtureCheckInSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      role_id: roleId,
      candidate_id: candidateId,
      check_ins: input.check_ins ?? ["Weekly 1:1 held"],
      performance: input.performance ?? "meets",
      blockers: input.blockers ?? [],
      workload: input.workload ?? "meets",
      morale: input.morale ?? "meets",
      training_needs: input.training_needs ?? [],
      feedback: input.feedback ?? "",
      promotion_eligibility: input.promotion_eligibility ?? false,
      retention_risk: input.retention_risk ?? "low",
      created_at: now,
      updated_at: null,
    });
    this.s.nurture.set(check.id, check);
    this.setRoleStage(tenantId, roleId, "active");
    return check;
  }

  listNurtureCheckIns(tenantId: string, roleId: string): NurtureCheckIn[] {
    return [...this.s.nurture.values()].filter((c) => c.tenant_id === tenantId && c.role_id === roleId);
  }

  // --- Stage 11: Performance Management ------------------------------------

  recordPerformanceReview(
    tenantId: string,
    roleId: string,
    candidateId: string,
    input: Partial<Omit<PerformanceReview, "id" | "tenant_id" | "role_id" | "candidate_id" | "created_at" | "updated_at">> = {},
  ): PerformanceReview {
    this.getRole(tenantId, roleId);
    const now = this.clock().toISOString();
    const review = PerformanceReviewSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      role_id: roleId,
      candidate_id: candidateId,
      deliverables: input.deliverables ?? "meets",
      timeliness: input.timeliness ?? "meets",
      quality: input.quality ?? "meets",
      communication: input.communication ?? "meets",
      reliability: input.reliability ?? "meets",
      sop_adherence: input.sop_adherence ?? "meets",
      improvement_notes: input.improvement_notes ?? [],
      access_risk: input.access_risk ?? "low",
      compensation_review: input.compensation_review ?? "",
      overall: input.overall ?? "meets",
      created_at: now,
      updated_at: null,
    });
    this.s.performance.set(review.id, review);
    this.setRoleStage(tenantId, roleId, "performance_review");
    return review;
  }

  listPerformanceReviews(tenantId: string, roleId: string): PerformanceReview[] {
    return [...this.s.performance.values()].filter((r) => r.tenant_id === tenantId && r.role_id === roleId);
  }

  // --- Stage 12: Delegation Engine -----------------------------------------

  delegateTask(tenantId: string, input: z.input<typeof DelegateTaskInputSchema>): DelegationTask {
    const parsed = DelegateTaskInputSchema.parse(input);
    this.getRole(tenantId, parsed.role_id); // assert exists + tenant
    const now = this.clock().toISOString();
    const task = DelegationTaskSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      role_id: parsed.role_id,
      candidate_id: parsed.candidate_id ?? null,
      task: parsed.task,
      context: parsed.context,
      sop: parsed.sop,
      expected_output: parsed.expected_output,
      deadline: parsed.deadline ?? null,
      quality_checklist: parsed.quality_checklist,
      files_needed: parsed.files_needed,
      approval_path: parsed.approval_path,
      escalation_rule: parsed.escalation_rule,
      status: "assigned",
      created_at: now,
      updated_at: null,
    });
    this.s.delegations.set(task.id, task);
    return task;
  }

  setDelegationStatus(tenantId: string, taskId: string, status: DelegationTaskStatus): DelegationTask {
    const t = this.s.delegations.get(taskId);
    if (!t || t.tenant_id !== tenantId) throw new PeopleOpsEngineError("delegation task not found");
    const next: DelegationTask = { ...t, status, updated_at: this.clock().toISOString() };
    this.s.delegations.set(next.id, next);
    return next;
  }

  listDelegations(tenantId: string, roleId: string): DelegationTask[] {
    return [...this.s.delegations.values()].filter((t) => t.tenant_id === tenantId && t.role_id === roleId);
  }

  // --- Stage 13: Offboarding -----------------------------------------------

  startOffboarding(tenantId: string, roleId: string, candidateId: string, reason = ""): OffboardingProcess {
    this.getRole(tenantId, roleId);
    const now = this.clock().toISOString();
    const kinds: OffboardingStepKind[] = [
      "revoke_access",
      "rotate_credentials",
      "collect_files",
      "transfer_ownership",
      "archive_docs",
      "document_status",
      "final_payment",
      "confidentiality_reminder",
    ];
    const steps: OffboardingStep[] = kinds.map((kind) => ({ kind, status: "pending", notes: "" }));
    const process = OffboardingProcessSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      role_id: roleId,
      candidate_id: candidateId,
      reason,
      steps,
      access_revoked: false,
      completed: false,
      created_at: now,
      updated_at: null,
    });
    this.s.offboardings.set(process.id, process);
    this.setRoleStage(tenantId, roleId, "offboarding");
    return process;
  }

  /**
   * Run offboarding: revokes EVERY outstanding access grant for the role, marks the revoke_access
   * step done, and flags access_revoked. This is the hard guarantee that a departing worker loses
   * access.
   */
  completeOffboarding(tenantId: string, offboardingId: string): OffboardingProcess {
    const p = this.s.offboardings.get(offboardingId);
    if (!p || p.tenant_id !== tenantId) throw new PeopleOpsEngineError("offboarding process not found");
    const now = this.clock().toISOString();
    for (const grant of this.listAccessGrants(tenantId, p.role_id)) {
      if (grant.status !== "revoked") this.revokeAccess(tenantId, grant.id);
    }
    const steps: OffboardingStep[] = p.steps.map((step) =>
      step.kind === "revoke_access"
        ? { ...step, status: "done", notes: "All access grants revoked." }
        : { ...step, status: step.status === "pending" ? "done" : step.status },
    );
    const next: OffboardingProcess = {
      ...p,
      steps,
      access_revoked: true,
      completed: true,
      updated_at: now,
    };
    this.s.offboardings.set(next.id, next);
    this.setRoleStage(tenantId, p.role_id, "closed");
    return next;
  }

  listOffboardings(tenantId: string, roleId: string): OffboardingProcess[] {
    return [...this.s.offboardings.values()].filter((p) => p.tenant_id === tenantId && p.role_id === roleId);
  }

  // --- internals -----------------------------------------------------------

  private setRoleStage(tenantId: string, roleId: string, stage: RoleLifecycleStage): RoleDesign {
    const role = this.getRole(tenantId, roleId);
    const next: RoleDesign = { ...role, stage, updated_at: this.clock().toISOString() };
    this.s.roles.set(next.id, next);
    return next;
  }
}

// ===========================================================================
// Deterministic heuristics (AI-assisted versions arrive in Phase 2 behind a flag)
// ===========================================================================

function classifyTrigger(description: string, frequencyPerWeek: number): RoleNeed["trigger"] {
  const t = description.toLowerCase();
  if (/bottleneck|blocks me|stuck on|waiting on me|only i can/.test(t)) return "founder_bottleneck";
  if (/judgment|decide|strategy|negotiate|relationship/.test(t)) return "needs_human_judgment";
  if (/automat|repetitive|data entry|scheduling|formatting|categoriz/.test(t)) return "ai_can_handle";
  if (/every day|daily|weekly|again and again|keep doing|recurring/.test(t) || frequencyPerWeek >= 3) {
    return "repeating_work";
  }
  if (/delegate|hand off|offload|someone else/.test(t)) return "delegation_opportunity";
  if (/can't keep up|overloaded|too much|capacity/.test(t)) return "capacity_gap";
  if (/don't know how|lack|missing skill|need expert/.test(t)) return "skill_gap";
  return "delegation_opportunity";
}

function handlerFor(trigger: RoleNeed["trigger"], workerKind: RoleNeed["worker_kind"]): RoleHandlerKind {
  if (workerKind === "ai_employee") return "delegate_to_ai";
  switch (trigger) {
    case "ai_can_handle":
      return "delegate_to_ai";
    case "needs_human_judgment":
    case "founder_bottleneck":
    case "delegation_opportunity":
    case "repeating_work":
    case "capacity_gap":
    case "skill_gap":
    case "growth_demand":
      return "delegate_to_human";
    default:
      return "delegate_to_human";
  }
}
