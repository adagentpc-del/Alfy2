import {
  WorkflowCostInputSchema,
  WorkflowCostReportSchema,
  type WorkflowCostInput,
  type WorkflowCostReport,
  type CostCategory,
  type CfoRecommendation,
} from "@alfy2/shared";

/**
 * The Cost & Token CFO (docs/adr/ADR-0047-cost-token-cfo.md). Tracks model, API, automation, tool, compute,
 * and storage costs against human time saved and revenue, and for every workflow computes cost per task /
 * lead / booked call / sale, ROI, and break-even — then recommends a cheaper model, a better workflow,
 * pausing an expensive agent, batch processing, local-model use, or upgrading when ROI supports it.
 * Deterministic. Tenant-scoped. Complements Workflow ROI Tracking (ADR-0023) with cost decomposition,
 * per-unit costs, break-even, and concrete model/infra recommendations.
 */

export class CostCfo {
  private readonly clock: () => Date;

  constructor(options: { clock?: () => Date } = {}) {
    this.clock = options.clock ?? (() => new Date());
  }

  /** Analyze a workflow's economics and recommend cost actions. */
  analyze(_tenantId: string, input: WorkflowCostInput): WorkflowCostReport {
    const i = WorkflowCostInputSchema.parse(input);
    const c = i.costs;
    const total = c.model + c.api + c.automation + c.tool_subscription + c.compute + c.storage;
    const value = i.revenue_created_usd + i.human_time_saved_hours * i.human_hourly_rate_usd;
    const roi = total > 0 ? round((value - total) / total) : null;

    const categories: [CostCategory, number][] = [
      ["model", c.model], ["api", c.api], ["automation", c.automation],
      ["tool_subscription", c.tool_subscription], ["compute", c.compute], ["storage", c.storage],
    ];
    const largest = total > 0 ? categories.reduce((a, b) => (b[1] > a[1] ? b : a))[0] : null;
    const modelShare = total > 0 ? c.model / total : 0;

    const recs = new Set<CfoRecommendation>();
    const why: string[] = [];
    if (roi !== null && roi < 0) { recs.add("pause_expensive_agent"); why.push("ROI is negative — pause until it earns its keep."); }
    if (modelShare >= 0.5) {
      recs.add("cheaper_model"); recs.add("local_model");
      why.push("Model cost dominates — try a cheaper or local model.");
      if (i.tasks >= 100) { recs.add("batch_processing"); why.push("High task volume — batch to cut per-call overhead."); }
    }
    if (roi !== null && roi >= 2) { recs.add("upgrade_when_roi_supports"); why.push("ROI is strong — scaling/upgrading is justified."); }
    if ((roi === null || (roi >= 0 && roi < 1)) && recs.size === 0) { recs.add("better_workflow"); why.push("Thin margin — redesign the workflow for leverage."); }

    return WorkflowCostReportSchema.parse({
      workflow_name: i.workflow_name,
      total_cost_usd: round(total),
      value_usd: round(value),
      cost_per_task: perUnit(total, i.tasks),
      cost_per_lead: perUnit(total, i.leads),
      cost_per_booked_call: perUnit(total, i.booked_calls),
      cost_per_sale: perUnit(total, i.sales),
      roi,
      break_even_revenue_usd: round(total),
      largest_cost_category: largest,
      recommendations: [...recs],
      rationale: why.join(" ") || "Costs are balanced; no action needed.",
      generated_at: this.clock().toISOString(),
    });
  }
}

const perUnit = (total: number, denom: number): number | null => (denom > 0 ? round(total / denom) : null);
const round = (n: number): number => Math.round(n * 10000) / 10000;
