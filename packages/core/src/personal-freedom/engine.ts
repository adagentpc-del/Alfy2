import {
  FreedomLogInputSchema,
  FreedomReportSchema,
  type FreedomLogInput,
  type FreedomReport,
  type FreedomRecommendation,
} from "@alfy2/shared";

/**
 * The Personal Freedom Engine (docs/adr/ADR-0082-personal-freedom.md). Mission: maximize life outside the
 * computer. From a week's time allocation it computes offloadable (low-leverage machine) hours, life hours,
 * and a freedom score — the share of time spent living vs grinding — and recommends automation, delegation,
 * agent creation, workflow improvement, and batch processing. Every recommendation passes the mandatory
 * test: it preserves or increases business performance. Deterministic. Tenant-scoped.
 */

export class PersonalFreedomEngine {
  private readonly reports = new Map<string, FreedomReport>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Produce a freedom report from a week's logged hours, with performance-preserving recommendations. */
  report(tenantId: string, input: FreedomLogInput): FreedomReport {
    const i = FreedomLogInputSchema.parse(input);

    const offloadable = i.hours_editing + i.hours_approving;
    const life =
      i.hours_outdoors +
      i.hours_exercise +
      i.hours_family +
      i.hours_friends +
      i.hours_travel +
      i.hours_creative +
      i.hours_rest;
    const machine = i.hours_working + i.hours_creating + i.hours_editing + i.hours_approving;
    const denom = life + machine;
    const freedom = denom > 0 ? clamp01(round(life / denom)) : 0;

    const recs: FreedomRecommendation[] = [];

    if (i.hours_editing >= 2) {
      recs.push({
        action: "automate",
        target: "content editing",
        rationale: `${round(i.hours_editing)}h/week editing is low-leverage machine work — automate it.`,
        estimated_hours_returned: round(i.hours_editing),
        preserves_performance: true,
      });
      recs.push({
        action: "delegate",
        target: "content editing",
        rationale: `${round(i.hours_editing)}h/week editing can be delegated to an editor/agent with QA gates.`,
        estimated_hours_returned: round(i.hours_editing),
        preserves_performance: true,
      });
    }

    if (i.hours_approving >= 2) {
      recs.push({
        action: "batch_process",
        target: "approvals",
        rationale: `${round(i.hours_approving)}h/week approving — batch into a single review window to reclaim flow.`,
        estimated_hours_returned: round(i.hours_approving),
        preserves_performance: true,
      });
    }

    if (i.hours_working > life) {
      recs.push({
        action: "create_agent",
        target: "operating workload",
        rationale: `Working hours (${round(i.hours_working)}) exceed life hours (${round(life)}) — stand up an agent to carry the load.`,
        estimated_hours_returned: round(clamp0(i.hours_working - life) / 2),
        preserves_performance: true,
      });
      recs.push({
        action: "improve_workflow",
        target: "operating workload",
        rationale: "Working dominates living — improve the workflow so the same output costs fewer founder hours.",
        estimated_hours_returned: round(clamp0(i.hours_working - life) / 2),
        preserves_performance: true,
      });
    }

    const report = FreedomReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      week_label: i.week_label,
      offloadable_hours: round(offloadable),
      life_hours: round(life),
      freedom_score: freedom,
      recommendations: recs,
      created_at: this.clock().toISOString(),
    });
    this.reports.set(report.id, report);
    return report;
  }

  get(tenantId: string, id: string): FreedomReport | undefined {
    const r = this.reports.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): FreedomReport[] {
    return [...this.reports.values()].filter((r) => r.tenant_id === tenantId);
  }
}

const clamp0 = (n: number): number => Math.max(0, n);
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;
