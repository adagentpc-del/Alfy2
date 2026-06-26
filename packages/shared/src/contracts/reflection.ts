import { z } from "zod";

/**
 * Reflection Engine contracts. Every week, month, quarter, and year, Alfy² automatically reviews
 * operations — revenue, missed opportunities, follow-up failures, automation and agent performance,
 * workflow bottlenecks, time allocation, energy, decision quality, and goal progress — and generates
 * lessons, improvements, workflows to automate or retire, new agents to build, risks, and next-period
 * priorities. It is the institutional memory of Alfy². See docs/adr/ADR-0053-reflection-engine.md.
 * Mirrored in workers (Pydantic).
 */

export const ReflectionPeriodSchema = z.enum(["weekly", "monthly", "quarterly", "yearly"]);
export type ReflectionPeriod = z.infer<typeof ReflectionPeriodSchema>;

/** The operational signals fed into a reflection. */
export const ReflectionInputSchema = z.object({
  period: ReflectionPeriodSchema,
  period_label: z.string().default(""),
  revenue_created_usd: z.number().default(0),
  opportunities_missed: z.number().int().nonnegative().default(0),
  follow_up_failures: z.number().int().nonnegative().default(0),
  /** Per-automation success rate 0..1, keyed by name. */
  automation_performance: z.record(z.string(), z.number().min(0).max(1)).default({}),
  agent_performance: z.record(z.string(), z.number().min(0).max(1)).default({}),
  workflow_bottlenecks: z.array(z.string()).default([]),
  time_allocation: z.record(z.string(), z.number().nonnegative()).default({}),
  energy_notes: z.array(z.string()).default([]),
  decision_quality: z.number().min(0).max(1).default(0.5),
  goals_progressed: z.number().int().nonnegative().default(0),
  goals_total: z.number().int().nonnegative().default(0),
});
export type ReflectionInput = z.infer<typeof ReflectionInputSchema>;

/** A reflection's generated output. */
export const ReflectionReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  period: ReflectionPeriodSchema,
  period_label: z.string().default(""),
  lessons_learned: z.array(z.string()).default([]),
  recommended_improvements: z.array(z.string()).default([]),
  workflows_to_automate: z.array(z.string()).default([]),
  workflows_to_retire: z.array(z.string()).default([]),
  new_agents_to_build: z.array(z.string()).default([]),
  risks_to_address: z.array(z.string()).default([]),
  next_period_priorities: z.array(z.string()).default([]),
  summary: z.string().min(1),
  created_at: z.string().datetime(),
});
export type ReflectionReport = z.infer<typeof ReflectionReportSchema>;
