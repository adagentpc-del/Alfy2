import { z } from "zod";

/**
 * Org Health / CODO — the Chief Organizational Development Officer brain.
 *
 * Continuously improves the health, performance, communication, and efficiency of the AI
 * organization. High-performing organizations are designed, not accidental. This engine:
 *   - tracks AI-employee wellness (workload, response time, approval delay, failure rate, …)
 *   - audits agent-to-agent communication (clarity, completeness, context, KPI awareness, …)
 *   - diagnoses + corrects struggling agents (TRAIN, don't replace)
 *   - produces an org-health report and a monthly CEO coaching report for Alyssa
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 *
 * NOTE: every exported schema + type is uniquely prefixed (OrgHealth / AgentWellness / CommAudit /
 * AgentCorrection / CeoCoaching) to avoid barrel export-name collisions with other contracts.
 */

// ---------------------------------------------------------------------------
// Enums (uniquely named to avoid barrel collisions)
// ---------------------------------------------------------------------------

/** What to do about an AI employee's wellness. */
export const WellnessRecommendationSchema = z.enum([
  "ok",
  "split_responsibilities",
  "add_specialist",
  "improve_automation",
  "improve_delegation",
  "simplify_sops",
  "pause",
  "retire",
]);
export type WellnessRecommendation = z.infer<typeof WellnessRecommendationSchema>;

/** Diagnosed root cause when an agent struggles. */
export const FailureDiagnosisSchema = z.enum([
  "wrong_business_context",
  "wrong_audience",
  "wrong_skill",
  "missing_source_data",
  "unclear_instructions",
  "outdated_memory",
  "insufficient_examples",
  "weak_prompt",
  "wrong_model",
  "missing_approval_rule",
  "poor_handoff",
]);
export type FailureDiagnosis = z.infer<typeof FailureDiagnosisSchema>;

/** What was updated to correct a struggling agent (train, don't replace). */
export const CorrectionUpdateSchema = z.enum([
  "instructions",
  "skill_playbook",
  "business_profile",
  "templates",
  "examples",
  "source_of_truth",
  "qa_checklist",
]);
export type CorrectionUpdate = z.infer<typeof CorrectionUpdateSchema>;

// ---------------------------------------------------------------------------
// Agent Wellness Snapshot (append-only)
// ---------------------------------------------------------------------------

export const AgentWellnessSnapshotSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  agent: z.string().min(1),
  /** Queue size — number of tasks currently assigned. */
  workload: z.number().int().nonnegative(),
  waiting_tasks: z.number().int().nonnegative(),
  avg_response_ms: z.number().nonnegative(),
  approval_delay_ms: z.number().nonnegative(),
  failure_rate: z.number().min(0).max(1),
  handoff_success: z.number().min(0).max(1),
  context_size: z.number().int().nonnegative(),
  cost_per_run: z.number().nonnegative(),
  token_efficiency: z.number().min(0).max(1),
  overloaded: z.boolean(),
  recommendation: WellnessRecommendationSchema,
  created_at: z.string().datetime(),
});
export type AgentWellnessSnapshot = z.infer<typeof AgentWellnessSnapshotSchema>;

// ---------------------------------------------------------------------------
// Communication Audit (append-only)
// ---------------------------------------------------------------------------

export const CommunicationAuditSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  from_agent: z.string().min(1),
  to_agent: z.string().min(1),
  packet_id: z.string().uuid().nullable().default(null),
  clarity: z.number().min(0).max(1),
  completeness: z.number().min(0).max(1),
  context: z.number().min(0).max(1),
  resource_availability: z.number().min(0).max(1),
  /** Higher is worse — how ambiguous the handoff was. */
  ambiguity: z.number().min(0).max(1),
  handoff_quality: z.number().min(0).max(1),
  business_awareness: z.number().min(0).max(1),
  goal_awareness: z.number().min(0).max(1),
  kpi_awareness: z.number().min(0).max(1),
  approval_awareness: z.number().min(0).max(1),
  /** Computed: average of positive dimensions minus ambiguity, clamped to [0,1]. */
  score: z.number().min(0).max(1),
  issues: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type CommunicationAudit = z.infer<typeof CommunicationAuditSchema>;

// ---------------------------------------------------------------------------
// Agent Correction (append-only) — "when an agent struggles, train it, don't replace it."
// ---------------------------------------------------------------------------

export const AgentCorrectionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  agent: z.string().min(1),
  failure_diagnosis: FailureDiagnosisSchema,
  updates_made: z.array(CorrectionUpdateSchema).default([]),
  notes: z.string().default(""),
  created_at: z.string().datetime(),
});
export type AgentCorrection = z.infer<typeof AgentCorrectionSchema>;

// ---------------------------------------------------------------------------
// Org Health Report (append-only)
// ---------------------------------------------------------------------------

export const OrgHealthReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  period: z.string().min(1),
  org_health_score: z.number().min(0).max(100),
  bottlenecks: z.array(z.string()).default([]),
  overloaded_agents: z.array(z.string()).default([]),
  underutilized_agents: z.array(z.string()).default([]),
  approval_delays: z.array(z.string()).default([]),
  repeated_mistakes: z.array(z.string()).default([]),
  outdated_sops: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type OrgHealthReport = z.infer<typeof OrgHealthReportSchema>;

// ---------------------------------------------------------------------------
// CEO Coaching Report (append-only) — the monthly coaching report for Alyssa
// ---------------------------------------------------------------------------

export const CeoCoachingReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  period: z.string().min(1),
  too_much_time_on: z.array(z.string()).default([]),
  only_alyssa_can_do: z.array(z.string()).default([]),
  ai_should_own: z.array(z.string()).default([]),
  humans_should_own: z.array(z.string()).default([]),
  should_disappear: z.array(z.string()).default([]),
  decision_fatigue_points: z.array(z.string()).default([]),
  perfectionism_points: z.array(z.string()).default([]),
  missed_opportunities: z.array(z.string()).default([]),
  leverage_increased: z.array(z.string()).default([]),
  leverage_decreased: z.array(z.string()).default([]),
  founder_health_indicators: z.array(z.string()).default([]),
  recommended_focus_next_month: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type CeoCoachingReport = z.infer<typeof CeoCoachingReportSchema>;
