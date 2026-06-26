import { z } from "zod";

/**
 * Executive Mission Control — Layer 0 (CEO read-model). See docs/ALFIE2_OPERATIONS_ARCHITECTURE.md §28.
 *
 * Mission Control monitors, routes, escalates, summarizes, and requests approval — it never performs
 * department work. It is a read-model + deterministic alert/priority rules composed over existing engines;
 * it owns no business logic of its own. This contract is the canonical shape mirrored 1:1 by Pydantic
 * models in workers/alfy_workers/contracts.
 *
 * All public names are uniquely prefixed `MissionControl*` to stay barrel-collision-free.
 *
 * NOTE: this file also retains the earlier one-screen "reading snapshot" placeholder (now exported under
 * `MissionControlReading*` names) so the original mission smoke + its Pydantic mirror keep working while
 * §28 is built out. The §28 read-model below is the live Release-1 surface.
 */

// ---------------------------------------------------------------------------
// §28 — Mission Control read-model (Release 1)
// ---------------------------------------------------------------------------

/** Alert severity (§28.2 `mission_control_alerts.severity`). */
export const MissionControlAlertSeveritySchema = z.enum(["info", "warn", "critical"]);
export type MissionControlAlertSeverity = z.infer<typeof MissionControlAlertSeveritySchema>;

/** Alert category (§28.2 `mission_control_alerts.category`). */
export const MissionControlAlertCategorySchema = z.enum([
  "revenue",
  "cash",
  "risk",
  "agent",
  "approval",
  "health",
  "launch",
]);
export type MissionControlAlertCategory = z.infer<typeof MissionControlAlertCategorySchema>;

/** Alert workflow status (§28.2 `mission_control_alerts.status`). */
export const MissionControlAlertStatusSchema = z.enum([
  "open",
  "acknowledged",
  "escalated",
  "resolved",
]);
export type MissionControlAlertStatus = z.infer<typeof MissionControlAlertStatusSchema>;

/** A single Mission Control alert (mirror of `mission_control_alerts`). */
export const MissionControlAlertSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid().nullable().default(null),
  severity: MissionControlAlertSeveritySchema,
  category: MissionControlAlertCategorySchema,
  title: z.string(),
  detail: z.string().default(""),
  source_ref: z.string().default(""),
  requires_approval: z.boolean().default(false),
  /** mission_control | department_leader | ceo */
  routed_to: z.string().default("mission_control"),
  status: MissionControlAlertStatusSchema.default("open"),
  created_at: z.string().datetime(),
  updated_at: z.string().nullable().default(null),
});
export type MissionControlAlert = z.infer<typeof MissionControlAlertSchema>;

/** One of the deterministic top-3 priorities (§28.1 "Top-3 priorities"). */
export const MissionControlPrioritySchema = z.object({
  rank: z.number().int().min(1).max(3),
  title: z.string(),
  why: z.string().default(""),
  category: MissionControlAlertCategorySchema,
});
export type MissionControlPriority = z.infer<typeof MissionControlPrioritySchema>;

/** The assembled one-screen read-model (mirror of `mission_control_snapshots`). */
export const MissionControlSnapshotSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid().nullable().default(null),
  as_of: z.string().datetime(),
  revenue_today: z.number().default(0),
  cash_position: z.number().default(0),
  cash_runway_days: z.number().nullable().default(null),
  kpi_status: z.record(z.unknown()).default({}),
  approval_queue: z.array(z.record(z.unknown())).default([]),
  critical_alerts: z.array(MissionControlAlertSchema).default([]),
  blocked_tasks: z.array(z.record(z.unknown())).default([]),
  active_builds: z.array(z.record(z.unknown())).default([]),
  agent_activity: z.record(z.unknown()).default({}),
  department_health: z.record(z.unknown()).default({}),
  business_health: z.record(z.unknown()).default({}),
  follow_ups_due: z.array(z.record(z.unknown())).default([]),
  meetings: z.array(z.record(z.unknown())).default([]),
  risk_alerts: z.array(MissionControlAlertSchema).default([]),
  founder_capacity: z.record(z.unknown()).default({}),
  top_priorities: z.array(MissionControlPrioritySchema).default([]),
  revenue_opportunities: z.array(z.record(z.unknown())).default([]),
  launch_readiness: z.record(z.unknown()).default({}),
  open_loops: z.array(z.record(z.unknown())).default([]),
  created_at: z.string().datetime(),
});
export type MissionControlSnapshot = z.infer<typeof MissionControlSnapshotSchema>;

// ---------------------------------------------------------------------------
// Earlier one-screen "reading snapshot" placeholder (kept under MissionControlReading* names).
// Superseded by the §28 read-model above; retained so the original mission smoke + its Pydantic
// mirror continue to validate. Do NOT extend — new work targets the §28 shapes.
// ---------------------------------------------------------------------------

/** A health reading, 0..1, with a label. */
export const HealthReadingSchema = z.object({
  score: z.number().min(0).max(1),
  label: z.string().min(1),
});
export type HealthReading = z.infer<typeof HealthReadingSchema>;

/** The inputs the reading-snapshot placeholder aggregates (already-summarized from source engines). */
export const MissionControlReadingInputSchema = z.object({
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
export type MissionControlReadingInput = z.infer<typeof MissionControlReadingInputSchema>;

/** The assembled one-screen reading snapshot (placeholder). */
export const MissionControlReadingSnapshotSchema = z.object({
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
export type MissionControlReadingSnapshot = z.infer<typeof MissionControlReadingSnapshotSchema>;
