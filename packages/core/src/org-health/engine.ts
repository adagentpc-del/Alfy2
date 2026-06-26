import {
  AgentWellnessSnapshotSchema,
  CommunicationAuditSchema,
  AgentCorrectionSchema,
  OrgHealthReportSchema,
  CeoCoachingReportSchema,
  type AgentWellnessSnapshot,
  type CommunicationAudit,
  type AgentCorrection,
  type OrgHealthReport,
  type CeoCoachingReport,
  type WellnessRecommendation,
  type FailureDiagnosis,
  type CorrectionUpdate,
} from "@alfy2/shared";

/**
 * Org Health / CODO engine — the Chief Organizational Development Officer brain.
 *
 * Deterministic and infrastructure-free (in-memory reference store; real persistence arrives in a
 * later phase). It tracks AI-employee wellness, audits agent-to-agent communication, diagnoses +
 * corrects struggling agents (TRAIN, don't replace), and produces an org-health report plus a
 * monthly CEO coaching report for Alyssa.
 *
 * High-performing organizations are designed, not accidental — so the rules are encoded in code:
 *   - overloaded = high workload AND high approval delay AND high failure rate
 *   - a struggling agent is corrected by updating its instructions/skill/examples — never replaced
 */

// ---------------------------------------------------------------------------
// Tunable thresholds (deterministic; exported for reuse + tests)
// ---------------------------------------------------------------------------

/** Workload (queue size) above which an agent is considered heavily loaded. */
export const WORKLOAD_HIGH = 10;
/** Approval delay (ms) above which approvals are considered slow (15 min). */
export const APPROVAL_DELAY_HIGH_MS = 15 * 60 * 1000;
/** Failure rate above which an agent is considered struggling. */
export const FAILURE_RATE_HIGH = 0.3;
/** Failure rate above which an agent should be paused outright. */
export const FAILURE_RATE_PAUSE = 0.6;
/** Workload at/below which an agent is considered underutilized. */
export const WORKLOAD_UNDERUTILIZED = 1;
/** Communication dimension at/below which an issue is flagged. */
export const COMM_DIMENSION_THRESHOLD = 0.5;
/** Ambiguity at/above which an ambiguity issue is flagged (higher = worse). */
export const COMM_AMBIGUITY_THRESHOLD = 0.5;
/** Communication audit score at/below which a comm channel is a repeated mistake. */
export const COMM_SCORE_LOW = 0.5;

export interface OrgHealthEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

interface Stores {
  wellness: Map<string, AgentWellnessSnapshot>;
  commAudits: Map<string, CommunicationAudit>;
  corrections: Map<string, AgentCorrection>;
  reports: Map<string, OrgHealthReport>;
  coaching: Map<string, CeoCoachingReport>;
}

export interface RecordWellnessInput {
  agent: string;
  workload: number;
  waiting_tasks: number;
  avg_response_ms: number;
  approval_delay_ms: number;
  failure_rate: number;
  handoff_success: number;
  context_size: number;
  cost_per_run: number;
  token_efficiency: number;
}

export interface AuditCommunicationInput {
  from_agent: string;
  to_agent: string;
  packet_id?: string | null;
  clarity: number;
  completeness: number;
  context: number;
  resource_availability: number;
  ambiguity: number;
  handoff_quality: number;
  business_awareness: number;
  goal_awareness: number;
  kpi_awareness: number;
  approval_awareness: number;
}

export interface RecordCorrectionInput {
  agent: string;
  failure_diagnosis: FailureDiagnosis;
  updates_made?: CorrectionUpdate[];
  notes?: string;
}

export interface CeoCoachingSeeds {
  too_much_time_on?: string[];
  only_alyssa_can_do?: string[];
  ai_should_own?: string[];
  humans_should_own?: string[];
  should_disappear?: string[];
  decision_fatigue_points?: string[];
  perfectionism_points?: string[];
  missed_opportunities?: string[];
  leverage_increased?: string[];
  leverage_decreased?: string[];
  founder_health_indicators?: string[];
  recommended_focus_next_month?: string[];
}

/** Answers to the weekly organization review questions. */
export interface WeeklyOrgReview {
  tenant_id: string;
  where_agents_waiting_or_confused: string[];
  agents_duplicating_work: string[];
  approvals_slowing_things_down: string[];
  underutilized_specialists: string[];
  outdated_sops: string[];
  overloaded_employees: string[];
  what_to_automate: string[];
  what_to_remove: string[];
}

export class OrgHealthEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    wellness: new Map(),
    commAudits: new Map(),
    corrections: new Map(),
    reports: new Map(),
    coaching: new Map(),
  };

  constructor(options: OrgHealthEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Wellness ------------------------------------------------------------

  recordWellness(tenantId: string, input: RecordWellnessInput): AgentWellnessSnapshot {
    const overloaded =
      input.workload >= WORKLOAD_HIGH &&
      input.approval_delay_ms >= APPROVAL_DELAY_HIGH_MS &&
      input.failure_rate >= FAILURE_RATE_HIGH;

    const recommendation = recommendWellness({
      overloaded,
      workload: input.workload,
      approval_delay_ms: input.approval_delay_ms,
      failure_rate: input.failure_rate,
      handoff_success: input.handoff_success,
      token_efficiency: input.token_efficiency,
    });

    const snapshot = AgentWellnessSnapshotSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      agent: input.agent,
      workload: input.workload,
      waiting_tasks: input.waiting_tasks,
      avg_response_ms: input.avg_response_ms,
      approval_delay_ms: input.approval_delay_ms,
      failure_rate: input.failure_rate,
      handoff_success: input.handoff_success,
      context_size: input.context_size,
      cost_per_run: input.cost_per_run,
      token_efficiency: input.token_efficiency,
      overloaded,
      recommendation,
      created_at: this.clock().toISOString(),
    });
    this.s.wellness.set(snapshot.id, snapshot);
    return snapshot;
  }

  listWellness(tenantId: string): AgentWellnessSnapshot[] {
    return [...this.s.wellness.values()].filter((w) => w.tenant_id === tenantId);
  }

  // --- Communication audits ------------------------------------------------

  auditCommunication(tenantId: string, input: AuditCommunicationInput): CommunicationAudit {
    const positives = [
      input.clarity,
      input.completeness,
      input.context,
      input.resource_availability,
      input.handoff_quality,
      input.business_awareness,
      input.goal_awareness,
      input.kpi_awareness,
      input.approval_awareness,
    ];
    const avgPositive = positives.reduce((sum, v) => sum + v, 0) / positives.length;
    const score = clamp01(avgPositive - input.ambiguity);

    const issues: string[] = [];
    if (input.clarity <= COMM_DIMENSION_THRESHOLD) issues.push("unclear message");
    if (input.completeness <= COMM_DIMENSION_THRESHOLD) issues.push("incomplete information");
    if (input.context <= COMM_DIMENSION_THRESHOLD) issues.push("missing context");
    if (input.resource_availability <= COMM_DIMENSION_THRESHOLD)
      issues.push("required resources unavailable");
    if (input.handoff_quality <= COMM_DIMENSION_THRESHOLD) issues.push("unclear handoff");
    if (input.business_awareness <= COMM_DIMENSION_THRESHOLD) issues.push("low business awareness");
    if (input.goal_awareness <= COMM_DIMENSION_THRESHOLD) issues.push("low goal awareness");
    if (input.kpi_awareness <= COMM_DIMENSION_THRESHOLD) issues.push("missing KPI awareness");
    if (input.approval_awareness <= COMM_DIMENSION_THRESHOLD)
      issues.push("low approval-rule awareness");
    if (input.ambiguity >= COMM_AMBIGUITY_THRESHOLD) issues.push("high ambiguity");

    const audit = CommunicationAuditSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      from_agent: input.from_agent,
      to_agent: input.to_agent,
      packet_id: input.packet_id ?? null,
      clarity: input.clarity,
      completeness: input.completeness,
      context: input.context,
      resource_availability: input.resource_availability,
      ambiguity: input.ambiguity,
      handoff_quality: input.handoff_quality,
      business_awareness: input.business_awareness,
      goal_awareness: input.goal_awareness,
      kpi_awareness: input.kpi_awareness,
      approval_awareness: input.approval_awareness,
      score,
      issues,
      created_at: this.clock().toISOString(),
    });
    this.s.commAudits.set(audit.id, audit);
    return audit;
  }

  listCommunicationAudits(tenantId: string): CommunicationAudit[] {
    return [...this.s.commAudits.values()].filter((c) => c.tenant_id === tenantId);
  }

  // --- Corrections (train, don't replace) ----------------------------------

  recordCorrection(tenantId: string, input: RecordCorrectionInput): AgentCorrection {
    const correction = AgentCorrectionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      agent: input.agent,
      failure_diagnosis: input.failure_diagnosis,
      updates_made: input.updates_made ?? [],
      notes: input.notes ?? "",
      created_at: this.clock().toISOString(),
    });
    this.s.corrections.set(correction.id, correction);
    return correction;
  }

  listCorrections(tenantId: string): AgentCorrection[] {
    return [...this.s.corrections.values()].filter((c) => c.tenant_id === tenantId);
  }

  // --- Org health report ---------------------------------------------------

  generateOrgHealthReport(tenantId: string, period: string): OrgHealthReport {
    const wellness = this.listWellness(tenantId);
    const audits = this.listCommunicationAudits(tenantId);

    // Latest snapshot per agent (deterministic — keeps the last-recorded one).
    const latestByAgent = new Map<string, AgentWellnessSnapshot>();
    for (const w of wellness) latestByAgent.set(w.agent, w);
    const latest = [...latestByAgent.values()];

    const overloaded_agents: string[] = [];
    const underutilized_agents: string[] = [];
    const approval_delays: string[] = [];
    const bottlenecks: string[] = [];

    for (const w of latest) {
      if (w.overloaded) {
        overloaded_agents.push(w.agent);
        bottlenecks.push(`${w.agent} is overloaded (queue ${w.workload})`);
      } else if (w.workload <= WORKLOAD_UNDERUTILIZED) {
        underutilized_agents.push(w.agent);
      }
      if (w.approval_delay_ms >= APPROVAL_DELAY_HIGH_MS) {
        approval_delays.push(`${w.agent} waits on approvals`);
      }
    }

    const repeated_mistakes: string[] = [];
    for (const a of audits) {
      if (a.score <= COMM_SCORE_LOW) {
        repeated_mistakes.push(`${a.from_agent} → ${a.to_agent}: ${a.issues.join(", ") || "low communication score"}`);
      }
    }

    // outdated_sops: agents corrected for outdated memory / unclear instructions.
    const outdated_sops: string[] = [];
    for (const c of this.listCorrections(tenantId)) {
      if (c.failure_diagnosis === "outdated_memory" || c.failure_diagnosis === "unclear_instructions") {
        outdated_sops.push(`${c.agent}: ${c.failure_diagnosis}`);
      }
    }

    // Score: start at 100, penalize each problem signal, floor at 0.
    let score = 100;
    score -= overloaded_agents.length * 12;
    score -= approval_delays.length * 6;
    score -= repeated_mistakes.length * 8;
    score -= underutilized_agents.length * 3;
    score -= outdated_sops.length * 5;
    const org_health_score = Math.max(0, Math.min(100, score));

    const recommendations: string[] = [];
    for (const w of latest) {
      if (w.recommendation !== "ok") {
        recommendations.push(`${w.agent}: ${w.recommendation.replace(/_/g, " ")}`);
      }
    }
    if (approval_delays.length > 0) {
      recommendations.push("Reduce approval delays with persistent approvals for low-risk actions.");
    }
    if (repeated_mistakes.length > 0) {
      recommendations.push("Train agents on weak communication channels (don't replace them).");
    }
    if (recommendations.length === 0) {
      recommendations.push("Organization is healthy — maintain the operating rhythm.");
    }

    const report = OrgHealthReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      period,
      org_health_score,
      bottlenecks,
      overloaded_agents,
      underutilized_agents,
      approval_delays,
      repeated_mistakes,
      outdated_sops,
      recommendations,
      created_at: this.clock().toISOString(),
    });
    this.s.reports.set(report.id, report);
    return report;
  }

  listOrgHealthReports(tenantId: string): OrgHealthReport[] {
    return [...this.s.reports.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- CEO coaching report -------------------------------------------------

  generateCeoCoachingReport(
    tenantId: string,
    period: string,
    input: CeoCoachingSeeds = {},
  ): CeoCoachingReport {
    const wellness = this.listWellness(tenantId);
    const overloaded = [...new Set(wellness.filter((w) => w.overloaded).map((w) => w.agent))];
    const slowApprovals = [
      ...new Set(
        wellness.filter((w) => w.approval_delay_ms >= APPROVAL_DELAY_HIGH_MS).map((w) => w.agent),
      ),
    ];

    // Derive sensible defaults when seeds are absent.
    const ai_should_own =
      input.ai_should_own ??
      (overloaded.length > 0
        ? [`Offload routine work from: ${overloaded.join(", ")}`]
        : ["Repeatable execution the AI organization already handles well."]);

    const decision_fatigue_points =
      input.decision_fatigue_points ??
      (slowApprovals.length > 0
        ? [`Approvals queuing behind: ${slowApprovals.join(", ")}`]
        : ["No major decision-fatigue points detected this period."]);

    const recommended_focus_next_month =
      input.recommended_focus_next_month ??
      [
        overloaded.length > 0
          ? "Rebalance workload off overloaded agents."
          : "Push more delegation to the AI organization.",
        "Protect founder focus on the highest-leverage decisions.",
      ];

    const report = CeoCoachingReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      period,
      too_much_time_on: input.too_much_time_on ?? [],
      only_alyssa_can_do:
        input.only_alyssa_can_do ?? ["Set vision, strategy, and final go/no-go on major bets."],
      ai_should_own,
      humans_should_own: input.humans_should_own ?? [],
      should_disappear: input.should_disappear ?? [],
      decision_fatigue_points,
      perfectionism_points: input.perfectionism_points ?? [],
      missed_opportunities: input.missed_opportunities ?? [],
      leverage_increased: input.leverage_increased ?? [],
      leverage_decreased: input.leverage_decreased ?? [],
      founder_health_indicators: input.founder_health_indicators ?? [],
      recommended_focus_next_month,
      created_at: this.clock().toISOString(),
    });
    this.s.coaching.set(report.id, report);
    return report;
  }

  listCeoCoachingReports(tenantId: string): CeoCoachingReport[] {
    return [...this.s.coaching.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- Weekly org review ---------------------------------------------------

  /**
   * Answer the weekly organization review questions from the recorded signals:
   * where are agents waiting/confused, who is duplicating work, where are approvals slowing things,
   * which specialists are underutilized, which SOPs are outdated, who is overloaded, and what to
   * automate / remove.
   */
  weeklyOrgReview(tenantId: string): WeeklyOrgReview {
    const wellness = this.listWellness(tenantId);
    const audits = this.listCommunicationAudits(tenantId);
    const corrections = this.listCorrections(tenantId);

    const latestByAgent = new Map<string, AgentWellnessSnapshot>();
    for (const w of wellness) latestByAgent.set(w.agent, w);
    const latest = [...latestByAgent.values()];

    const where_agents_waiting_or_confused: string[] = [];
    for (const w of latest) {
      if (w.waiting_tasks > 0) {
        where_agents_waiting_or_confused.push(`${w.agent} has ${w.waiting_tasks} waiting tasks`);
      }
    }
    for (const a of audits) {
      if (a.score <= COMM_SCORE_LOW) {
        where_agents_waiting_or_confused.push(`${a.to_agent} confused by handoff from ${a.from_agent}`);
      }
    }

    const overloaded_employees = latest.filter((w) => w.overloaded).map((w) => w.agent);

    const approvals_slowing_things_down = latest
      .filter((w) => w.approval_delay_ms >= APPROVAL_DELAY_HIGH_MS)
      .map((w) => `${w.agent} (${Math.round(w.approval_delay_ms / 60000)} min approval delay)`);

    const underutilized_specialists = latest
      .filter((w) => !w.overloaded && w.workload <= WORKLOAD_UNDERUTILIZED)
      .map((w) => w.agent);

    const outdated_sops = corrections
      .filter(
        (c) =>
          c.failure_diagnosis === "outdated_memory" ||
          c.failure_diagnosis === "unclear_instructions",
      )
      .map((c) => `${c.agent}: ${c.failure_diagnosis}`);

    // Duplicating work: more than one agent receiving handoffs about the same packet.
    const agents_duplicating_work: string[] = [];
    const byPacket = new Map<string, Set<string>>();
    for (const a of audits) {
      if (!a.packet_id) continue;
      const set = byPacket.get(a.packet_id) ?? new Set<string>();
      set.add(a.to_agent);
      byPacket.set(a.packet_id, set);
    }
    for (const [packetId, agents] of byPacket) {
      if (agents.size > 1) {
        agents_duplicating_work.push(`packet ${packetId}: ${[...agents].join(", ")}`);
      }
    }

    const what_to_automate = latest
      .filter((w) => w.recommendation === "improve_automation" || w.overloaded)
      .map((w) => `Automate routine work for ${w.agent}`);

    const what_to_remove = latest
      .filter((w) => w.recommendation === "retire")
      .map((w) => `Retire ${w.agent}`);

    return {
      tenant_id: tenantId,
      where_agents_waiting_or_confused,
      agents_duplicating_work,
      approvals_slowing_things_down,
      underutilized_specialists,
      outdated_sops,
      overloaded_employees,
      what_to_automate,
      what_to_remove,
    };
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

interface WellnessSignals {
  overloaded: boolean;
  workload: number;
  approval_delay_ms: number;
  failure_rate: number;
  handoff_success: number;
  token_efficiency: number;
}

/**
 * Map wellness signals to a recommendation:
 *   - persistently failing (very high failure) → retire
 *   - high failure → pause
 *   - overloaded → split_responsibilities / add_specialist / improve_automation /
 *                  improve_delegation / simplify_sops (chosen by the dominant pressure)
 *   - else → ok
 */
export function recommendWellness(s: WellnessSignals): WellnessRecommendation {
  if (s.failure_rate >= 0.85) return "retire";
  if (s.failure_rate >= FAILURE_RATE_PAUSE) return "pause";

  if (s.overloaded) {
    if (s.approval_delay_ms >= APPROVAL_DELAY_HIGH_MS && s.handoff_success < 0.5) {
      return "improve_delegation";
    }
    if (s.token_efficiency < 0.5) return "improve_automation";
    if (s.workload >= WORKLOAD_HIGH * 2) return "split_responsibilities";
    if (s.handoff_success < 0.6) return "simplify_sops";
    return "add_specialist";
  }

  return "ok";
}
