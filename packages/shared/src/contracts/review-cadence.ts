import { z } from "zod";

/**
 * Executive Review Cadence + Master Docs.
 *
 * Runs structured monthly / quarterly / yearly review cycles for each business AND the portfolio.
 * Reviews are management MEETINGS that UPDATE the operating system — not static reports. Each cycle:
 *   1. opens a review (status collecting)
 *   2. collects append-only department reports (wins, failures, KPIs, risks, blockers, ...)
 *   3. assembles a board-quality master document with the EXACT sections for the level + a meeting agenda
 *   4. captures Alyssa's feedback, which converts into decisions / priorities / tasks / SOP changes
 *      and moves the review to actioned.
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 *
 * NOTE: every exported schema + type is uniquely prefixed (ReviewCadence / MasterReview / ReviewDept)
 * to avoid barrel export-name collisions with the existing review-board.ts (BoardReview / Reviewer*).
 */

// ---------------------------------------------------------------------------
// Enums (uniquely named to avoid barrel collisions)
// ---------------------------------------------------------------------------

/** Which review cycle + scope this document belongs to. */
export const ReviewLevelSchema = z.enum([
  "monthly_business",
  "monthly_portfolio",
  "quarterly_business",
  "quarterly_portfolio",
  "yearly_business",
  "yearly_portfolio",
]);
export type ReviewLevel = z.infer<typeof ReviewLevelSchema>;

/** The meeting "mode" — drives the agenda questions. */
export const ReviewMeetingModeSchema = z.enum([
  "monthly_operator",
  "quarterly_ceo",
  "yearly_portfolio",
]);
export type ReviewMeetingMode = z.infer<typeof ReviewMeetingModeSchema>;

/** Lifecycle of a master review document. */
export const ReviewStatusSchema = z.enum([
  "collecting",
  "drafted",
  "sent_for_review",
  "reviewed",
  "actioned",
  "archived",
]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

// ---------------------------------------------------------------------------
// Department report (append-only)
// ---------------------------------------------------------------------------

/** KPI values reported by a department (kpi_name -> number). */
export const ReviewDeptKpisSchema = z.record(z.string(), z.number());
export type ReviewDeptKpis = z.infer<typeof ReviewDeptKpisSchema>;

export const ReviewDepartmentReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  review_id: z.string().uuid(),
  department_key: z.string().min(1),
  wins: z.array(z.string()).default([]),
  failures: z.array(z.string()).default([]),
  /** KPI values reported this period (name -> number). */
  kpis: ReviewDeptKpisSchema.default({}),
  risks: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  decisions_needed: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type ReviewDepartmentReport = z.infer<typeof ReviewDepartmentReportSchema>;

// ---------------------------------------------------------------------------
// Master review document (mutable)
// ---------------------------------------------------------------------------

/** One titled section of the master doc. */
export const ReviewSectionSchema = z.object({
  title: z.string().min(1),
  body: z.string().default(""),
});
export type ReviewSection = z.infer<typeof ReviewSectionSchema>;

/** A KPI table embedded in the master doc (rows are free-form jsonb). */
export const ReviewKpiTableSchema = z.object({
  name: z.string().min(1),
  rows: z.array(z.record(z.string(), z.unknown())).default([]),
});
export type ReviewKpiTable = z.infer<typeof ReviewKpiTableSchema>;

/** A single item on the board-style approval checklist. */
export const ApprovalChecklistItemSchema = z.object({
  item: z.string().min(1),
  checked: z.boolean().default(false),
});
export type ApprovalChecklistItem = z.infer<typeof ApprovalChecklistItemSchema>;

export const MasterReviewDocSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** null for portfolio reviews. */
  business_key: z.string().nullable().default(null),
  level: ReviewLevelSchema,
  /** e.g. "2026-06" / "2026-Q2" / "2026". */
  period: z.string().min(1),
  meeting_mode: ReviewMeetingModeSchema,
  executive_summary: z.string().default(""),
  sections: z.array(ReviewSectionSchema).default([]),
  kpi_tables: z.array(ReviewKpiTableSchema).default([]),
  decisions_needed: z.array(z.string()).default([]),
  recommended_actions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  priorities: z.array(z.string()).default([]),
  data_sources: z.array(z.string()).default([]),
  approval_checklist: z.array(ApprovalChecklistItemSchema).default([]),
  follow_up_tasks: z.array(z.string()).default([]),
  agenda: z.array(z.string()).default([]),
  status: ReviewStatusSchema.default("collecting"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type MasterReviewDoc = z.infer<typeof MasterReviewDocSchema>;

// ---------------------------------------------------------------------------
// Review feedback (append-only — the Alyssa feedback loop)
// ---------------------------------------------------------------------------

export const ReviewFeedbackSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  review_id: z.string().uuid(),
  decisions: z.array(z.string()).default([]),
  updated_priorities: z.array(z.string()).default([]),
  new_tasks: z.array(z.string()).default([]),
  sop_changes: z.array(z.string()).default([]),
  paused_or_killed: z.array(z.string()).default([]),
  next_review_goals: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type ReviewFeedback = z.infer<typeof ReviewFeedbackSchema>;
