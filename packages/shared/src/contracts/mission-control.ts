import { z } from "zod";

/**
 * Executive Mission Control contracts. The primary one-screen dashboard for Alyssa: everything important
 * visible at once — enterprise and company health, revenue, pipeline, cash flow, active goals, blocked
 * items, risks, approvals waiting, top opportunities, agent / automation / system health, AI costs, ROI,
 * and daily priorities. It is a read model that composes the Control Tower, the Cost CFO, and Agent
 * Observability into a single screen. See docs/adr/ADR-0058-mission-control.md. Mirrored in workers.
 */

/** A health reading, 0..1, with a label. */
export const HealthReadingSchema = z.object({
  score: z.number().min(0).max(1),
  label: z.string().min(1),
});
export type HealthReading = z.infer<typeof HealthReadingSchema>;

/** The inputs Mission Control aggregates (already-summarized from the source engines). */
export const MissionControlInputSchema = z.object({
  enterprise_health: z.number().min(0).max(1).default(0.5),
  company_health: z.record(z.string(), z.number().min(0).max(1)).default({}),
  revenue_mtd_usd: z.number().default(0),
  weighted_pipeline_usd: z.number().nonnegative().default(0),
  cash_usd: z.number().default(0),
  monthly_burn_usd: z.number().nonnegative().default(0),
  active_goals: z.number().int().nonnegative().default(0),
  blocked_items: z.number().int().nonnegative().default(0),
  open_risks: z.number().int().nonnegative().default(0),
  approvals_waiting: z.number().int().nonnegative().default(0),
  top_opportunities: z.array(z.string()).default([]),
  agent_health: z.number().min(0).max(1).default(1),
  automation_health: z.number().min(0).max(1).default(1),
  system_health: z.number().min(0).max(1).default(1),
  ai_cost_mtd_usd: z.number().nonnegative().default(0),
  roi: z.number().nullable().default(null),
  daily_priorities: z.array(z.string()).default([]),
});
export type MissionControlInput = z.infer<typeof MissionControlInputSchema>;

/** The assembled one-screen snapshot. */
export const MissionControlSnapshotSchema = z.object({
  tenant_id: z.string().uuid(),
  enterprise_health: HealthReadingSchema,
  company_health: z.record(z.string(), HealthReadingSchema).default({}),
  revenue_mtd_usd: z.number(),
  weighted_pipeline_usd: z.number().nonnegative(),
  cash_usd: z.number(),
  runway_months: z.number().nullable().default(null),
  active_goals: z.number().int().nonnegative(),
  blocked_items: z.number().int().nonnegative(),
  open_risks: z.number().int().nonnegative(),
  approvals_waiting: z.number().int().nonnegative(),
  top_opportunities: z.array(z.string()).default([]),
  agent_health: HealthReadingSchema,
  automation_health: HealthReadingSchema,
  system_health: HealthReadingSchema,
  ai_cost_mtd_usd: z.number().nonnegative(),
  roi: z.number().nullable().default(null),
  daily_priorities: z.array(z.string()).default([]),
  /** The single most pressing headline across the whole screen. */
  headline: z.string().min(1),
  generated_at: z.string().datetime(),
});
export type MissionControlSnapshot = z.infer<typeof MissionControlSnapshotSchema>;
