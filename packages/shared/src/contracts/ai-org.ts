import { z } from "zod";

/**
 * AI Organization / Chain of Command.
 *
 * Sits ON TOP of the Department OS (departments live in department-os.ts / migration 0226). It turns
 * the flat set of agents into a structured, accountable AI company with a real chain of command:
 *   Specialist Agent → AI Employee → Department Leader → Executive → Alyssa.
 *
 * The accountability rules are enforced in code, not just documented:
 *   - an agent cannot begin work without a DelegationPacket (the engine REFUSES startWork())
 *   - every output/action produces an AccountabilityRecord
 *   - escalation always follows the chain of command
 *   - the chain of command is validated (no role without a department, no non-executive without a
 *     leader to report to, no specialist that acted without a packet)
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 *
 * NOTE: every exported schema + type is uniquely prefixed (AiOrg / RoleCard / OrgLayer / Delegation /
 * AgentReport / Escalation / PermissionScope / Accountability / DepartmentReport) to avoid barrel
 * export-name collisions with department-os.ts (which already owns Department*, AiEmployee*, Dept*,
 * Kpi*).
 */

// ---------------------------------------------------------------------------
// Enums (uniquely named to avoid barrel collisions)
// ---------------------------------------------------------------------------

/** Where a role card sits in the org's chain of command. */
export const OrgLayerSchema = z.enum([
  "executive",
  "department_leader",
  "ai_employee",
  "specialist_agent",
]);
export type OrgLayer = z.infer<typeof OrgLayerSchema>;

/** How often a role card is reviewed. */
export const RoleCardReviewCadenceSchema = z.enum(["daily", "weekly", "monthly", "per_task"]);
export type RoleCardReviewCadence = z.infer<typeof RoleCardReviewCadenceSchema>;

/** Graduated permission scope — what a role card is allowed to do without escalation. */
export const PermissionScopeSchema = z.enum([
  "observe_only",
  "research_only",
  "draft_only",
  "recommend_only",
  "create_internal_task",
  "prepare_external_asset",
  "execute_low_risk",
  "execute_with_approval",
  "admin_disabled",
]);
export type PermissionScope = z.infer<typeof PermissionScopeSchema>;

/** Operating status of a role card. */
export const RoleCardStatusSchema = z.enum(["active", "testing", "paused", "retired"]);
export type RoleCardStatus = z.infer<typeof RoleCardStatusSchema>;

/** Lifecycle of a delegation packet. */
export const DelegationStatusSchema = z.enum([
  "issued",
  "accepted",
  "in_progress",
  "reported",
  "approved",
  "rejected",
  "escalated",
]);
export type DelegationStatus = z.infer<typeof DelegationStatusSchema>;

/** Priority of delegated work. */
export const DelegationPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export type DelegationPriority = z.infer<typeof DelegationPrioritySchema>;

/** Whether a report's underlying work actually finished. */
export const AgentReportExecutionStatusSchema = z.enum(["done", "partial", "blocked", "failed"]);
export type AgentReportExecutionStatus = z.infer<typeof AgentReportExecutionStatusSchema>;

/** How thoroughly an agent's output was checked. */
export const AgentReportVerificationStatusSchema = z.enum([
  "unverified",
  "self_checked",
  "verified",
]);
export type AgentReportVerificationStatus = z.infer<typeof AgentReportVerificationStatusSchema>;

/** Why an escalation was raised. */
export const EscalationReasonSchema = z.enum([
  "high_risk",
  "approval_required",
  "context_conflict",
  "source_conflict",
  "execution_failed",
  "low_confidence",
  "legal_medical_financial",
  "high_stakes_public",
  "cost_threshold",
  "live_system_change",
  "revenue_pricing_contract",
]);
export type EscalationReason = z.infer<typeof EscalationReasonSchema>;

/** Cadence of a department report. */
export const DepartmentReportCadenceSchema = z.enum(["daily", "weekly", "monthly"]);
export type DepartmentReportCadence = z.infer<typeof DepartmentReportCadenceSchema>;

// ---------------------------------------------------------------------------
// 1. Role Card — the rich role card for each AI employee
// ---------------------------------------------------------------------------

export const RoleCardSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  /** Department this role belongs to (governance: must be non-empty). References Department OS keys. */
  department_key: z.string().min(1),
  org_layer: OrgLayerSchema,
  is_leader: z.boolean().default(false),
  mission: z.string().default(""),
  businesses_used_by: z.array(z.string()).default([]),
  primary_responsibilities: z.array(z.string()).default([]),
  /** Ordered steps of this role's operating loop. */
  operating_loop: z.array(z.string()).default([]),
  allowed_actions: z.array(z.string()).default([]),
  requires_approval_for: z.array(z.string()).default([]),
  inputs: z.array(z.string()).default([]),
  outputs: z.array(z.string()).default([]),
  tools_integrations: z.array(z.string()).default([]),
  kpis: z.array(z.string()).default([]),
  failure_signals: z.array(z.string()).default([]),
  escalation_rules: z.array(z.string()).default([]),
  review_cadence: RoleCardReviewCadenceSchema.default("weekly"),
  permission_scope: PermissionScopeSchema.default("recommend_only"),
  /** Name of the leader this role reports to (null only for the top of the chain). */
  reports_to: z.string().nullable().default(null),
  status: RoleCardStatusSchema.default("active"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable().default(null),
});
export type RoleCard = z.infer<typeof RoleCardSchema>;

// ---------------------------------------------------------------------------
// 2. Delegation Packet (append-only) — created whenever work is assigned
// ---------------------------------------------------------------------------

export const DelegationPacketSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  assigning_employee: z.string().min(1),
  assigned_agent: z.string().min(1),
  business: z.string().default(""),
  project: z.string().default(""),
  objective: z.string().min(1),
  context_stack: z.array(z.string()).default([]),
  source_of_truth_refs: z.array(z.string()).default([]),
  required_output: z.string().default(""),
  allowed_tools: z.array(z.string()).default([]),
  prohibited_actions: z.array(z.string()).default([]),
  approval_required: z.boolean().default(false),
  deadline: z.string().nullable().default(null),
  priority: DelegationPrioritySchema.default("medium"),
  success_criteria: z.array(z.string()).default([]),
  reporting_format: z.string().default(""),
  escalation_trigger: z.string().default(""),
  status: DelegationStatusSchema.default("issued"),
  created_at: z.string().datetime(),
});
export type DelegationPacket = z.infer<typeof DelegationPacketSchema>;

// ---------------------------------------------------------------------------
// 3. Agent Report (append-only) — the report-back
// ---------------------------------------------------------------------------

export const AgentReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  packet_id: z.string().uuid(),
  agent: z.string().min(1),
  task_completed: z.boolean().default(false),
  output_produced: z.string().default(""),
  sources_used: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  risks: z.array(z.string()).default([]),
  approval_needed: z.boolean().default(false),
  recommended_next_step: z.string().default(""),
  execution_status: AgentReportExecutionStatusSchema.default("done"),
  verification_status: AgentReportVerificationStatusSchema.default("unverified"),
  created_at: z.string().datetime(),
});
export type AgentReport = z.infer<typeof AgentReportSchema>;

// ---------------------------------------------------------------------------
// 4. Escalation Event (append-only)
// ---------------------------------------------------------------------------

export const EscalationEventSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  from_layer: OrgLayerSchema,
  to_layer: OrgLayerSchema,
  reason: EscalationReasonSchema,
  detail: z.string().default(""),
  packet_id: z.string().uuid().nullable().default(null),
  resolved: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type EscalationEvent = z.infer<typeof EscalationEventSchema>;

// ---------------------------------------------------------------------------
// 5. Accountability Record (append-only) — every output / action
// ---------------------------------------------------------------------------

export const AccountabilityRecordSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  requesting_leader: z.string().default(""),
  responsible_employee: z.string().default(""),
  executing_agent: z.string().min(1),
  approving_authority: z.string().nullable().default(null),
  business: z.string().default(""),
  task: z.string().default(""),
  status: z.string().default(""),
  result: z.string().default(""),
  kpi_impact: z.string().default(""),
  audit_log: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type AccountabilityRecord = z.infer<typeof AccountabilityRecordSchema>;

// ---------------------------------------------------------------------------
// 6. Department Report (append-only)
// ---------------------------------------------------------------------------

/** KPI snapshot for a department report (kpi_name -> value). */
export const DepartmentReportKpisSchema = z.record(z.string(), z.number());
export type DepartmentReportKpis = z.infer<typeof DepartmentReportKpisSchema>;

export const DepartmentReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  department_key: z.string().min(1),
  cadence: DepartmentReportCadenceSchema,
  completed_work: z.array(z.string()).default([]),
  pending_approvals: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  revenue_opportunities: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  next_actions: z.array(z.string()).default([]),
  kpis: DepartmentReportKpisSchema.default({}),
  wins: z.array(z.string()).default([]),
  failures: z.array(z.string()).default([]),
  lessons_learned: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type DepartmentReport = z.infer<typeof DepartmentReportSchema>;

// ---------------------------------------------------------------------------
// Chain-of-command validation
// ---------------------------------------------------------------------------

/** Kinds of chain-of-command violation the engine can flag. */
export const AiOrgViolationKindSchema = z.enum([
  "role_without_department",
  "non_executive_without_reports_to",
  "specialist_acted_without_packet",
]);
export type AiOrgViolationKind = z.infer<typeof AiOrgViolationKindSchema>;

export const AiOrgViolationSchema = z.object({
  kind: AiOrgViolationKindSchema,
  /** What the violation is about (role name or agent name). */
  subject: z.string(),
  detail: z.string().default(""),
});
export type AiOrgViolation = z.infer<typeof AiOrgViolationSchema>;

export const AiOrgChainReportSchema = z.object({
  tenant_id: z.string().uuid(),
  ok: z.boolean(),
  violations: z.array(AiOrgViolationSchema).default([]),
  roles_checked: z.number().int().nonnegative().default(0),
});
export type AiOrgChainReport = z.infer<typeof AiOrgChainReportSchema>;
