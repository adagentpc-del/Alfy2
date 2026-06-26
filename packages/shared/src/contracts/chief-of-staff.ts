import { z } from "zod";
import { DecisionCategorySchema, PriorityLevelSchema } from "./decision.js";

/**
 * Chief of Staff contracts — Alfy2's executive layer. The Chief of Staff COORDINATES work; it never
 * executes it. It reads decisions and memory and assembles a structured executive briefing the
 * operator can act on. See docs/adr/ADR-0004-chief-of-staff.md. Mirrored in workers (Pydantic).
 */

/** A single actionable line item in a briefing section. */
export const BriefingItemSchema = z.object({
  title: z.string().min(1),
  detail: z.string().default(""),
  priority_level: PriorityLevelSchema,
  /** 0..1 — the score that placed this item in its section (priority, revenue, or risk). */
  score: z.number().min(0).max(1),
  category: DecisionCategorySchema.nullable().default(null),
  /** Pointer to the underlying decision or memory id, when available. */
  ref: z.string().nullable().default(null),
  due: z.string().datetime().nullable().default(null),
  /** Approvals the operator must give before any irreversible step (coordination, not execution). */
  required_approvals: z.array(z.string()).default([]),
  /** Agent registry keys the operator could dispatch this to — SUGGESTIONS ONLY. */
  recommended_agents: z.array(z.string()).default([]),
});
export type BriefingItem = z.infer<typeof BriefingItemSchema>;

/** Prep package for one upcoming meeting. */
export const MeetingPrepSchema = z.object({
  title: z.string().min(1),
  when: z.string().datetime().nullable().default(null),
  attendees: z.array(z.string()).default([]),
  /** Memory ids surfaced as relevant context for this meeting. */
  related_memory_ids: z.array(z.string()).default([]),
  prep_points: z.array(z.string()).default([]),
  recommended_agents: z.array(z.string()).default([]),
});
export type MeetingPrep = z.infer<typeof MeetingPrepSchema>;

/** A suggested calendar/time block. */
export const CalendarBlockSchema = z.object({
  label: z.string().min(1),
  when: z.string().datetime().nullable().default(null),
  recommendation: z.string().min(1),
});
export type CalendarBlock = z.infer<typeof CalendarBlockSchema>;

/** Energy-aware sequencing of the day's work. */
export const EnergyPlanSchema = z.object({
  summary: z.string().min(1),
  /** Hard/important work to place at peak energy. */
  deep_work: z.array(BriefingItemSchema).default([]),
  /** Low-effort items to batch when energy dips. */
  quick_wins: z.array(BriefingItemSchema).default([]),
  /** Recovery/wellbeing suggestions. */
  recovery: z.array(z.string()).default([]),
});
export type EnergyPlan = z.infer<typeof EnergyPlanSchema>;

/** Compact, glanceable summary metrics + a rendered markdown dashboard. */
export const DashboardSummarySchema = z.object({
  total_items: z.number().int().nonnegative(),
  critical_count: z.number().int().nonnegative(),
  high_count: z.number().int().nonnegative(),
  medium_count: z.number().int().nonnegative(),
  low_count: z.number().int().nonnegative(),
  revenue_opportunities: z.number().int().nonnegative(),
  open_risks: z.number().int().nonnegative(),
  blocked_count: z.number().int().nonnegative(),
  decisions_awaiting: z.number().int().nonnegative(),
  top_focus: z.string(),
  /** Deterministic markdown rendering of the briefing. */
  markdown: z.string(),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

export const BriefingHorizonSchema = z.enum(["today", "week"]);
export type BriefingHorizon = z.infer<typeof BriefingHorizonSchema>;

/** The full executive briefing — one per generation. */
export const ChiefOfStaffBriefingSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  generated_at: z.string().datetime(),
  horizon: BriefingHorizonSchema.default("today"),

  daily_priorities: z.array(BriefingItemSchema).default([]),
  revenue_focus: z.array(BriefingItemSchema).default([]),
  calendar_preparation: z.array(CalendarBlockSchema).default([]),
  meeting_preparation: z.array(MeetingPrepSchema).default([]),
  follow_ups: z.array(BriefingItemSchema).default([]),
  risk_alerts: z.array(BriefingItemSchema).default([]),
  blocked_projects: z.array(BriefingItemSchema).default([]),
  personal_reminders: z.array(BriefingItemSchema).default([]),
  energy_optimization: EnergyPlanSchema,
  decision_queue: z.array(BriefingItemSchema).default([]),
  /**
   * The morning headline: the (at most) three decisions ONLY Alyssa can make today — those requiring
   * irreversible executive judgment. Everything else should already be delegated, automated, scheduled,
   * or queued. Drawn from decision_queue, filtered to executive-only.
   */
  three_decisions_only_you_can_make: z.array(BriefingItemSchema).max(3).default([]),
  dashboard: DashboardSummarySchema,

  /** Plain-language summary of the day — always present. */
  explanation: z.string().min(1),
  /** Coordination notes (e.g. "3 items need your decision"). */
  notes: z.array(z.string()).default([]),
});
export type ChiefOfStaffBriefing = z.infer<typeof ChiefOfStaffBriefingSchema>;
