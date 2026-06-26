import {
  MasterReviewDocSchema,
  ReviewDepartmentReportSchema,
  ReviewFeedbackSchema,
  type MasterReviewDoc,
  type ReviewLevel,
  type ReviewMeetingMode,
  type ReviewStatus,
  type ReviewSection,
  type ReviewKpiTable,
  type ApprovalChecklistItem,
  type ReviewDepartmentReport,
  type ReviewDeptKpis,
  type ReviewFeedback,
} from "@alfy2/shared";

/**
 * Executive Review Cadence + Master Docs engine.
 *
 * Runs structured monthly / quarterly / yearly review cycles for each business AND the portfolio.
 * Reviews are management meetings that UPDATE the operating system: department reports are collected,
 * rolled up into a board-quality master document with the EXACT sections for the level + a meeting
 * agenda, and Alyssa's feedback is captured and converted into decisions / priorities / tasks /
 * SOP changes / paused-killed items / next-review goals.
 *
 * Deterministic and infrastructure-free (in-memory reference store; real persistence + AI-assisted
 * authoring arrive in Phase 2 behind the AI Gateway flag).
 */

export interface ReviewCadenceEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export interface OpenReviewInput {
  level: ReviewLevel;
  business_key?: string;
  period: string;
  meeting_mode: ReviewMeetingMode;
}

export interface SubmitDepartmentReportInput {
  review_id: string;
  department_key: string;
  wins?: string[];
  failures?: string[];
  kpis?: ReviewDeptKpis;
  risks?: string[];
  blockers?: string[];
  recommendations?: string[];
  decisions_needed?: string[];
}

export interface CaptureFeedbackInput {
  decisions?: string[];
  updated_priorities?: string[];
  new_tasks?: string[];
  sop_changes?: string[];
  paused_or_killed?: string[];
  next_review_goals?: string[];
}

export interface ListReviewsFilter {
  level?: ReviewLevel;
  business_key?: string | null;
  period?: string;
  status?: ReviewStatus;
}

interface Stores {
  reviews: Map<string, MasterReviewDoc>;
  reports: Map<string, ReviewDepartmentReport>;
  feedback: Map<string, ReviewFeedback>;
}

// ---------------------------------------------------------------------------
// Required section titles per level (board-quality master docs).
// ---------------------------------------------------------------------------

const MONTHLY_BUSINESS_SECTIONS: readonly string[] = [
  "Executive Summary",
  "Current Status",
  "Revenue Activity",
  "Growth Activity",
  "Product / Platform Updates",
  "Campaigns",
  "KPIs",
  "Wins",
  "Losses",
  "Risks",
  "Blockers",
  "Broken Systems",
  "Overdue Follow-Ups",
  "Feedback",
  "Analytics",
  "Financial Notes",
  "Next Priorities",
  "Decisions Needed",
];

const QUARTERLY_BUSINESS_SECTIONS: readonly string[] = [
  "Executive Summary",
  "Quarter In Review",
  "Revenue & Growth Trajectory",
  "Product / Platform Evolution",
  "Market & Competitive Position",
  "KPIs vs Targets",
  "What Worked",
  "What Did Not Work",
  "Risks & Exposure",
  "Systems & Operating Model",
  "Capital & Resource Allocation",
  "Strategic Priorities (Next 90 Days)",
  "Focus / Scale / Pause / Simplify / Kill",
  "Decisions Needed",
];

const YEARLY_BUSINESS_SECTIONS: readonly string[] = [
  "Executive Summary",
  "Year In Review",
  "What We Built",
  "What We Learned",
  "What Became Valuable",
  "Revenue & Growth (Full Year)",
  "Product / Platform Maturity",
  "KPIs vs Annual Targets",
  "Wins",
  "Losses",
  "Risks & Structural Exposure",
  "Operating Model & Systems",
  "Strategy For Next Year",
  "Decisions Needed",
];

const MONTHLY_PORTFOLIO_SECTIONS: readonly string[] = [
  "Executive Summary",
  "Portfolio Status",
  "Business-by-Business Roll-Up",
  "Consolidated Revenue Activity",
  "Consolidated Growth Activity",
  "Cross-Business KPIs",
  "Wins",
  "Losses",
  "Portfolio Risks",
  "Portfolio Blockers",
  "Broken Systems",
  "Capital Allocation",
  "Next Priorities",
  "Decisions Needed",
];

const QUARTERLY_PORTFOLIO_SECTIONS: readonly string[] = [
  "Executive Summary",
  "Portfolio In Review",
  "Business-by-Business Roll-Up",
  "Consolidated Revenue & Growth Trajectory",
  "Cross-Business KPIs vs Targets",
  "What Worked Across The Portfolio",
  "What Did Not Work",
  "Portfolio Risks & Exposure",
  "Capital & Resource Allocation",
  "Strategic Priorities (Next 90 Days)",
  "Focus / Scale / Pause / Simplify / Kill",
  "Decisions Needed",
];

const YEARLY_PORTFOLIO_SECTIONS: readonly string[] = [
  "Executive Summary",
  "Portfolio Year In Review",
  "What We Built Across The Portfolio",
  "What We Learned",
  "What Became Valuable",
  "Consolidated Revenue & Growth (Full Year)",
  "Business-by-Business Roll-Up",
  "Cross-Business KPIs vs Annual Targets",
  "Wins",
  "Losses",
  "Portfolio Risks & Structural Exposure",
  "Capital Allocation & Operating Model",
  "Portfolio Strategy For Next Year",
  "Decisions Needed",
];

const SECTIONS_BY_LEVEL: Record<ReviewLevel, readonly string[]> = {
  monthly_business: MONTHLY_BUSINESS_SECTIONS,
  monthly_portfolio: MONTHLY_PORTFOLIO_SECTIONS,
  quarterly_business: QUARTERLY_BUSINESS_SECTIONS,
  quarterly_portfolio: QUARTERLY_PORTFOLIO_SECTIONS,
  yearly_business: YEARLY_BUSINESS_SECTIONS,
  yearly_portfolio: YEARLY_PORTFOLIO_SECTIONS,
};

// ---------------------------------------------------------------------------
// Meeting agenda questions per meeting mode (the 3 meeting questions).
// ---------------------------------------------------------------------------

const AGENDA_BY_MODE: Record<ReviewMeetingMode, readonly string[]> = {
  monthly_operator: [
    "What happened this month?",
    "What broke?",
    "What made money?",
    "What do we do next?",
  ],
  quarterly_ceo: [
    "What do we focus on for the next 90 days?",
    "What do we scale?",
    "What do we pause?",
    "What do we simplify?",
    "What do we kill?",
  ],
  yearly_portfolio: [
    "What did we build this year?",
    "What did we learn?",
    "What became valuable?",
    "What is the strategy for next year?",
  ],
};

export class ReviewCadenceEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    reviews: new Map(),
    reports: new Map(),
    feedback: new Map(),
  };

  constructor(options: ReviewCadenceEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Stage 1: open a review ------------------------------------------------

  openReview(tenantId: string, input: OpenReviewInput): MasterReviewDoc {
    const now = this.clock().toISOString();
    const doc = MasterReviewDocSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: input.business_key ?? null,
      level: input.level,
      period: input.period,
      meeting_mode: input.meeting_mode,
      executive_summary: "",
      sections: [],
      kpi_tables: [],
      decisions_needed: [],
      recommended_actions: [],
      risks: [],
      priorities: [],
      data_sources: [],
      approval_checklist: [],
      follow_up_tasks: [],
      agenda: [],
      status: "collecting",
      created_at: now,
      updated_at: null,
    });
    this.s.reviews.set(doc.id, doc);
    return doc;
  }

  // --- Stage 2: collect department reports (append-only) ---------------------

  submitDepartmentReport(
    tenantId: string,
    input: SubmitDepartmentReportInput,
  ): ReviewDepartmentReport {
    this.getReview(tenantId, input.review_id); // assert exists + tenant
    const report = ReviewDepartmentReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      review_id: input.review_id,
      department_key: input.department_key,
      wins: input.wins ?? [],
      failures: input.failures ?? [],
      kpis: input.kpis ?? {},
      risks: input.risks ?? [],
      blockers: input.blockers ?? [],
      recommendations: input.recommendations ?? [],
      decisions_needed: input.decisions_needed ?? [],
      created_at: this.clock().toISOString(),
    });
    this.s.reports.set(report.id, report);
    return report;
  }

  listDepartmentReports(tenantId: string, reviewId: string): ReviewDepartmentReport[] {
    return [...this.s.reports.values()].filter(
      (r) => r.tenant_id === tenantId && r.review_id === reviewId,
    );
  }

  // --- Stage 3: assemble the master document ---------------------------------

  generateMasterDoc(tenantId: string, reviewId: string): MasterReviewDoc {
    const review = this.getReview(tenantId, reviewId);
    const reports = this.listDepartmentReports(tenantId, reviewId);

    // Roll up collected department reports.
    const allWins = reports.flatMap((r) => r.wins.map((w) => `${r.department_key}: ${w}`));
    const allFailures = reports.flatMap((r) => r.failures.map((f) => `${r.department_key}: ${f}`));
    const allRisks = reports.flatMap((r) => r.risks.map((x) => `${r.department_key}: ${x}`));
    const allBlockers = reports.flatMap((r) => r.blockers.map((b) => `${r.department_key}: ${b}`));
    const allRecs = reports.flatMap((r) => r.recommendations.map((x) => `${r.department_key}: ${x}`));
    const allDecisions = reports.flatMap((r) =>
      r.decisions_needed.map((d) => `${r.department_key}: ${d}`),
    );

    // KPI tables — one per reporting department that supplied KPIs.
    const kpiTables: ReviewKpiTable[] = reports
      .filter((r) => Object.keys(r.kpis).length > 0)
      .map((r) => ({
        name: `${r.department_key} KPIs`,
        rows: Object.entries(r.kpis).map(([metric, value]) => ({ metric, value })),
      }));

    const titles = SECTIONS_BY_LEVEL[review.level];
    const sections: ReviewSection[] = titles.map((title) => ({
      title,
      body: this.bodyForSection(title, {
        review,
        wins: allWins,
        failures: allFailures,
        risks: allRisks,
        blockers: allBlockers,
        recommendations: allRecs,
        decisions: allDecisions,
        reports,
      }),
    }));

    const executiveSummary = this.buildExecutiveSummary(review, reports, {
      wins: allWins.length,
      failures: allFailures.length,
      risks: allRisks.length,
      blockers: allBlockers.length,
    });

    const decisionsNeeded = dedupe(allDecisions);
    const priorities = dedupe(allRecs);

    const approvalChecklist: ApprovalChecklistItem[] = [
      { item: "Executive summary reviewed", checked: false },
      { item: "All department reports collected", checked: false },
      { item: "KPIs reviewed against targets", checked: false },
      { item: "Risks & blockers acknowledged", checked: false },
      { item: "Decisions needed answered", checked: false },
      { item: "Next priorities confirmed", checked: false },
    ];

    const agenda = [...AGENDA_BY_MODE[review.meeting_mode]];
    const dataSources = dedupe(reports.map((r) => `department_report:${r.department_key}`));

    const next = this.updateReview(review.id, {
      executive_summary: executiveSummary,
      sections,
      kpi_tables: kpiTables,
      decisions_needed: decisionsNeeded,
      recommended_actions: priorities,
      risks: dedupe(allRisks),
      priorities,
      data_sources: dataSources,
      approval_checklist: approvalChecklist,
      follow_up_tasks: [],
      agenda,
      status: "sent_for_review",
    });
    return next;
  }

  // --- Stage 4: capture feedback (the Alyssa loop) ---------------------------

  captureFeedback(
    tenantId: string,
    reviewId: string,
    input: CaptureFeedbackInput,
  ): ReviewFeedback {
    const review = this.getReview(tenantId, reviewId);
    const feedback = ReviewFeedbackSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      review_id: reviewId,
      decisions: input.decisions ?? [],
      updated_priorities: input.updated_priorities ?? [],
      new_tasks: input.new_tasks ?? [],
      sop_changes: input.sop_changes ?? [],
      paused_or_killed: input.paused_or_killed ?? [],
      next_review_goals: input.next_review_goals ?? [],
      created_at: this.clock().toISOString(),
    });
    this.s.feedback.set(feedback.id, feedback);

    // Feedback converts into decisions / priorities / tasks on the review and moves it to actioned.
    // reviewed -> actioned: the OS has been updated by the meeting.
    this.updateReview(review.id, {
      decisions_needed: dedupe([...review.decisions_needed, ...feedback.decisions]),
      priorities: dedupe([...review.priorities, ...feedback.updated_priorities]),
      recommended_actions: dedupe([...review.recommended_actions, ...feedback.updated_priorities]),
      follow_up_tasks: dedupe([...review.follow_up_tasks, ...feedback.new_tasks]),
      status: "actioned",
    });
    return feedback;
  }

  listFeedback(tenantId: string, reviewId: string): ReviewFeedback[] {
    return [...this.s.feedback.values()].filter(
      (f) => f.tenant_id === tenantId && f.review_id === reviewId,
    );
  }

  // --- Reads -----------------------------------------------------------------

  getReview(tenantId: string, reviewId: string): MasterReviewDoc {
    const r = this.s.reviews.get(reviewId);
    if (!r || r.tenant_id !== tenantId) throw new Error("review not found");
    return r;
  }

  listReviews(tenantId: string, filter?: ListReviewsFilter): MasterReviewDoc[] {
    return [...this.s.reviews.values()].filter((r) => {
      if (r.tenant_id !== tenantId) return false;
      if (filter?.level && r.level !== filter.level) return false;
      if (filter?.status && r.status !== filter.status) return false;
      if (filter?.period && r.period !== filter.period) return false;
      if (filter?.business_key !== undefined && r.business_key !== filter.business_key) return false;
      return true;
    });
  }

  // --- internals -------------------------------------------------------------

  private updateReview(reviewId: string, patch: Partial<MasterReviewDoc>): MasterReviewDoc {
    const r = this.s.reviews.get(reviewId);
    if (!r) throw new Error("review not found");
    const next = { ...r, ...patch, updated_at: this.clock().toISOString() };
    this.s.reviews.set(reviewId, next);
    return next;
  }

  private buildExecutiveSummary(
    review: MasterReviewDoc,
    reports: ReviewDepartmentReport[],
    counts: { wins: number; failures: number; risks: number; blockers: number },
  ): string {
    const scope = review.business_key
      ? `business "${review.business_key}"`
      : "the portfolio";
    const label = review.level.replace(/_/g, " ");
    return (
      `This is the ${label} review for ${scope} covering ${review.period}. ` +
      `${reports.length} department report(s) were collected, surfacing ${counts.wins} win(s), ` +
      `${counts.failures} failure(s), ${counts.risks} risk(s), and ${counts.blockers} blocker(s). ` +
      `This meeting updates the operating system: decisions, priorities, and tasks are captured below.`
    );
  }

  private bodyForSection(
    title: string,
    ctx: {
      review: MasterReviewDoc;
      wins: string[];
      failures: string[];
      risks: string[];
      blockers: string[];
      recommendations: string[];
      decisions: string[];
      reports: ReviewDepartmentReport[];
    },
  ): string {
    const t = title.toLowerCase();
    if (t.includes("executive summary")) {
      return this.buildExecutiveSummary(ctx.review, ctx.reports, {
        wins: ctx.wins.length,
        failures: ctx.failures.length,
        risks: ctx.risks.length,
        blockers: ctx.blockers.length,
      });
    }
    if (t === "wins" || t.includes("what worked") || t.includes("what we built")) {
      return bullets(ctx.wins);
    }
    if (
      t === "losses" ||
      t.includes("what did not work") ||
      t.includes("failure")
    ) {
      return bullets(ctx.failures);
    }
    if (t.includes("risk")) return bullets(ctx.risks);
    if (t.includes("blocker")) return bullets(ctx.blockers);
    if (t.includes("broken systems")) return bullets(ctx.blockers);
    if (t.includes("kpi")) {
      const lines = ctx.reports
        .filter((r) => Object.keys(r.kpis).length > 0)
        .flatMap((r) =>
          Object.entries(r.kpis).map(([k, v]) => `${r.department_key}.${k} = ${v}`),
        );
      return bullets(lines);
    }
    if (t.includes("decisions needed")) return bullets(ctx.decisions);
    if (
      t.includes("priorities") ||
      t.includes("strategy") ||
      t.includes("focus / scale")
    ) {
      return bullets(ctx.recommendations);
    }
    if (t.includes("roll-up") || t.includes("status")) {
      return bullets(
        ctx.reports.map(
          (r) =>
            `${r.department_key}: ${r.wins.length} win(s), ${r.failures.length} failure(s), ` +
            `${r.risks.length} risk(s)`,
        ),
      );
    }
    // Generic sections (revenue, growth, campaigns, analytics, financial notes, etc.):
    // aggregate any department recommendations as the working narrative.
    return bullets(ctx.recommendations);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

function bullets(items: string[]): string {
  if (items.length === 0) return "No items reported this period.";
  return items.map((i) => `- ${i}`).join("\n");
}
