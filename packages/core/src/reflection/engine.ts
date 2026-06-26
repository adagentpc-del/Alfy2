import {
  ReflectionInputSchema,
  ReflectionReportSchema,
  type ReflectionInput,
  type ReflectionReport,
} from "@alfy2/shared";

/**
 * The Reflection Engine (docs/adr/ADR-0053-reflection-engine.md). Every week, month, quarter, and year it
 * reviews operations — revenue, missed opportunities, follow-up failures, automation/agent performance,
 * workflow bottlenecks, time, energy, decision quality, goal progress — and generates lessons,
 * improvements, workflows to automate or retire, new agents, risks, and next-period priorities. It is the
 * institutional memory of Alfy². Deterministic. Tenant-scoped. Append-only.
 */

export class ReflectionEngine {
  private readonly reports = new Map<string, ReflectionReport>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Run a reflection for a period and generate its report. */
  reflect(tenantId: string, input: ReflectionInput): ReflectionReport {
    const i = ReflectionInputSchema.parse(input);

    const lessons: string[] = [];
    const improvements: string[] = [];
    const automate: string[] = [];
    const retire: string[] = [];
    const newAgents: string[] = [];
    const risks: string[] = [];

    if (i.follow_up_failures > 0) {
      lessons.push(`${i.follow_up_failures} follow-up(s) were dropped this ${i.period}.`);
      improvements.push("Tighten Follow-Up Autopilot cadence and escalation.");
      risks.push("Revenue leaking through missed follow-up.");
    }
    if (i.opportunities_missed > 0) {
      lessons.push(`${i.opportunities_missed} opportunit(ies) went unactioned.`);
      improvements.push("Lower the Opportunity Intelligence surfacing threshold.");
    }
    // Low automations → automate or retire; weak automations get retired.
    for (const [name, rate] of Object.entries(i.automation_performance)) {
      if (rate < 0.4) retire.push(`${name} (success ${Math.round(rate * 100)}%)`);
      else if (rate < 0.7) improvements.push(`Tune automation "${name}".`);
    }
    for (const [name, rate] of Object.entries(i.agent_performance)) {
      if (rate < 0.5) retire.push(`agent ${name} (score ${Math.round(rate * 100)}%)`);
    }
    for (const b of i.workflow_bottlenecks) {
      automate.push(`Automate the bottleneck: ${b}.`);
      newAgents.push(`Agent to own "${b}".`);
    }
    if (i.decision_quality < 0.6) {
      lessons.push("Decision quality was below target — capture more rationale in Institutional Memory.");
      risks.push("Low decision quality compounding over time.");
    }
    const goalRate = i.goals_total > 0 ? i.goals_progressed / i.goals_total : 1;
    if (goalRate < 0.5) risks.push("Goal progress is behind — re-plan priorities.");

    const priorities: string[] = [];
    if (i.revenue_created_usd <= 0) priorities.push("Re-focus on the fastest path to cash.");
    priorities.push(...risks.slice(0, 2).map((r) => `Address: ${r}`));
    if (automate.length) priorities.push(automate[0]!);
    if (priorities.length === 0) priorities.push("Maintain momentum; deepen what's working.");

    const report = ReflectionReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      period: i.period,
      period_label: i.period_label,
      lessons_learned: unique(lessons),
      recommended_improvements: unique(improvements),
      workflows_to_automate: unique(automate),
      workflows_to_retire: unique(retire),
      new_agents_to_build: unique(newAgents),
      risks_to_address: unique(risks),
      next_period_priorities: unique(priorities),
      summary: `${cap(i.period)} reflection${i.period_label ? ` (${i.period_label})` : ""}: $${Math.round(i.revenue_created_usd)} revenue, ${Math.round(goalRate * 100)}% goal progress, ${retire.length} item(s) to retire, ${priorities.length} priorit(ies) next.`,
      created_at: this.clock().toISOString(),
    });
    this.reports.set(report.id, report);
    return report;
  }

  list(tenantId: string): ReflectionReport[] {
    return [...this.reports.values()].filter((r) => r.tenant_id === tenantId);
  }

  /** Reflections of a given period — the institutional record over time. */
  history(tenantId: string, period: ReflectionReport["period"]): ReflectionReport[] {
    return this.list(tenantId).filter((r) => r.period === period);
  }
}

const unique = (xs: string[]): string[] => [...new Set(xs)];
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
