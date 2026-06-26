import { z } from "zod";

/**
 * Department Operating System + AI Employee KPI / Scorecard.
 *
 * Organizes AI agents like departments inside a billion-dollar operating company. The governance
 * rule is enforced in code, not just documented:
 *   - every AI employee belongs to a department
 *   - every department has an operating loop
 *   - every loop has KPIs
 *   - every KPI connects to a business outcome
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 *
 * NOTE: every exported schema + type is uniquely prefixed (Department / AiEmployee / Dept / Kpi)
 * to avoid barrel export-name collisions with other contracts (e.g. risk levels, statuses).
 */

// ---------------------------------------------------------------------------
// Enums (uniquely named to avoid barrel collisions)
// ---------------------------------------------------------------------------

/** Risk profile of an AI employee. (Dept-prefixed to avoid colliding with other RiskLevel enums.) */
export const DeptRiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export type DeptRiskLevel = z.infer<typeof DeptRiskLevelSchema>;

/** How often a department / AI employee is reviewed. */
export const DeptReviewCadenceSchema = z.enum(["daily", "weekly", "monthly"]);
export type DeptReviewCadence = z.infer<typeof DeptReviewCadenceSchema>;

/** Operating status of an AI employee scorecard. */
export const AiEmployeeStatusSchema = z.enum([
  "active",
  "testing",
  "needs_improvement",
  "paused",
  "retired",
]);
export type AiEmployeeStatus = z.infer<typeof AiEmployeeStatusSchema>;

/** Who a KPI record belongs to. */
export const KpiOwnerKindSchema = z.enum(["department", "ai_employee"]);
export type KpiOwnerKind = z.infer<typeof KpiOwnerKindSchema>;

// ---------------------------------------------------------------------------
// Department
// ---------------------------------------------------------------------------

export const DepartmentSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  key: z.string().min(1),
  name: z.string().min(1),
  mission: z.string().default(""),
  /** Ordered steps of the department's operating loop. */
  operating_loop: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  inputs: z.array(z.string()).default([]),
  outputs: z.array(z.string()).default([]),
  /** KPI names this department is measured on. */
  kpis: z.array(z.string()).default([]),
  review_cadence: DeptReviewCadenceSchema.default("weekly"),
  approval_rules: z.array(z.string()).default([]),
  escalation_rules: z.array(z.string()).default([]),
  failure_signals: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type Department = z.infer<typeof DepartmentSchema>;

// ---------------------------------------------------------------------------
// AI Employee (the scorecard)
// ---------------------------------------------------------------------------

/** Optional measured values for an AI employee's KPIs (kpi_name -> latest value). */
export const AiEmployeeKpiMetricsSchema = z.record(z.string(), z.number());
export type AiEmployeeKpiMetrics = z.infer<typeof AiEmployeeKpiMetricsSchema>;

export const AiEmployeeSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** The department this AI employee belongs to (governance: must be non-empty). */
  department_key: z.string().min(1),
  name: z.string().min(1),
  mission: z.string().default(""),
  businesses_used_by: z.array(z.string()).default([]),
  allowed_actions: z.array(z.string()).default([]),
  requires_approval_for: z.array(z.string()).default([]),
  inputs: z.array(z.string()).default([]),
  outputs: z.array(z.string()).default([]),
  tools_integrations: z.array(z.string()).default([]),
  risk_level: DeptRiskLevelSchema.default("low"),
  /** KPI names (e.g. output_quality, approval_rate, edit_rate, ...). */
  kpis: z.array(z.string()).default([]),
  /** Optional measured metric values keyed by KPI name. */
  metrics: AiEmployeeKpiMetricsSchema.default({}),
  review_cadence: DeptReviewCadenceSchema.default("weekly"),
  status: AiEmployeeStatusSchema.default("active"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type AiEmployee = z.infer<typeof AiEmployeeSchema>;

// ---------------------------------------------------------------------------
// KPI Record (append-only)
// ---------------------------------------------------------------------------

export const KpiRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  owner_kind: KpiOwnerKindSchema,
  /** Department key or AI employee name/key this KPI value belongs to. */
  owner_key: z.string().min(1),
  kpi_name: z.string().min(1),
  value: z.number(),
  /** Reporting period (e.g. "2026-06", "2026-W26", "2026-06-26"). */
  period: z.string().min(1),
  /** Links this KPI to a concrete business outcome (governance: must be non-empty). */
  business_outcome: z.string().min(1),
  created_at: z.string().datetime(),
});
export type KpiRecord = z.infer<typeof KpiRecordSchema>;

// ---------------------------------------------------------------------------
// Governance validation
// ---------------------------------------------------------------------------

/** Kinds of governance violation the engine can flag. */
export const DeptGovernanceViolationKindSchema = z.enum([
  "ai_employee_without_department",
  "department_without_operating_loop",
  "department_without_kpis",
  "kpi_without_business_outcome",
]);
export type DeptGovernanceViolationKind = z.infer<typeof DeptGovernanceViolationKindSchema>;

export const DeptGovernanceViolationSchema = z.object({
  kind: DeptGovernanceViolationKindSchema,
  /** What the violation is about (department key, AI employee name, or KPI name). */
  subject: z.string(),
  detail: z.string().default(""),
});
export type DeptGovernanceViolation = z.infer<typeof DeptGovernanceViolationSchema>;

export const DeptGovernanceReportSchema = z.object({
  tenant_id: z.string().uuid(),
  ok: z.boolean(),
  violations: z.array(DeptGovernanceViolationSchema).default([]),
  departments_checked: z.number().int().nonnegative().default(0),
  ai_employees_checked: z.number().int().nonnegative().default(0),
  kpis_checked: z.number().int().nonnegative().default(0),
});
export type DeptGovernanceReport = z.infer<typeof DeptGovernanceReportSchema>;
