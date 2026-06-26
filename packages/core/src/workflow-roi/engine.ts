import {
  TrackWorkflowInputSchema,
  WorkflowRoiRecordSchema,
  type TrackWorkflowInput,
  type WorkflowRoiRecord,
  type WorkflowMetrics,
  type RoiRecommendation,
} from "@alfy2/shared";

/**
 * Workflow ROI Tracking (docs/adr/ADR-0023-workflow-roi-tracking.md). For every automation it values
 * what the workflow creates (revenue, cost reduced, time saved) against what it costs (operating,
 * model/tool, human time), computes an ROI, ranks workflows, and recommends scale / pause / improve /
 * delete. Deterministic. Tenant-scoped. Re-tracking the same workflow name upserts.
 */

export interface WorkflowRoiOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export class WorkflowRoiTracker {
  private readonly records = new Map<string, WorkflowRoiRecord>();
  /** tenant|workflow_name → id, for upsert on re-track. */
  private readonly byName = new Map<string, string>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: WorkflowRoiOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Track (or re-track) a workflow's ROI from its metrics. */
  track(tenantId: string, input: TrackWorkflowInput): WorkflowRoiRecord {
    const i = TrackWorkflowInputSchema.parse(input);
    const m = i.metrics;
    const rate = i.human_hourly_rate;

    const value = m.revenue_generated_usd + m.cost_reduced_usd + m.time_saved_hours * rate;
    const cost = m.operating_cost_usd + m.model_tool_cost_usd + m.human_time_required_hours * rate;
    const net = value - cost;
    const roi = cost > 0 ? round2(net / cost) : null;

    const { recommendation, rationale } = recommend(net, roi, m);
    const now = this.clock().toISOString();
    const key = `${tenantId}|${i.workflow_name}`;
    const existingId = this.byName.get(key);

    const base = {
      tenant_id: tenantId,
      workflow_name: i.workflow_name,
      metrics: m,
      value_usd: round2(value),
      total_cost_usd: round2(cost),
      net_value_usd: round2(net),
      roi_score: roi,
      recommendation,
      rationale,
      updated_at: now,
    };

    if (existingId) {
      const prev = this.records.get(existingId)!;
      const updated = WorkflowRoiRecordSchema.parse({ ...prev, ...base });
      this.records.set(existingId, updated);
      return updated;
    }
    const rec = WorkflowRoiRecordSchema.parse({ id: this.newId(), created_at: now, ...base });
    this.records.set(rec.id, rec);
    this.byName.set(key, rec.id);
    return rec;
  }

  get(tenantId: string, id: string): WorkflowRoiRecord | undefined {
    const r = this.records.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  /** All workflows ranked by ROI (desc; nulls last). */
  rank(tenantId: string): WorkflowRoiRecord[] {
    return [...this.records.values()]
      .filter((r) => r.tenant_id === tenantId)
      .sort((a, b) => (b.roi_score ?? -Infinity) - (a.roi_score ?? -Infinity));
  }

  /** Workflows carrying a given recommendation. */
  byRecommendation(tenantId: string, rec: RoiRecommendation): WorkflowRoiRecord[] {
    return this.rank(tenantId).filter((r) => r.recommendation === rec);
  }
}

/** Decide scale / pause / improve / delete from net value, ROI, and the metric mix. */
function recommend(
  net: number,
  roi: number | null,
  m: WorkflowMetrics,
): { recommendation: RoiRecommendation; rationale: string } {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  // Strong winner → scale.
  if (net > 0 && roi !== null && roi >= 2) {
    return {
      recommendation: "scale",
      rationale: `Net value $${r2(net)} at ${r2(roi)}x ROI — a clear winner; scale it.`,
    };
  }
  // Clearly value-destroying with little upside → delete.
  if (net < 0 && m.revenue_generated_usd === 0 && m.cost_reduced_usd === 0) {
    return {
      recommendation: "delete",
      rationale: `Net value $${r2(net)} with no revenue or cost savings — it costs more than it returns; delete it.`,
    };
  }
  // Positive but thin, or value-positive yet error/risk-heavy → improve.
  if (net > 0 && (roi === null || roi < 2)) {
    return {
      recommendation: "improve",
      rationale: `Net value $${r2(net)} but ROI ${roi === null ? "n/a" : `${r2(roi)}x`} is modest — improve cost or output before scaling.`,
    };
  }
  // Marginal/negative but with some redeeming value → pause and reassess.
  return {
    recommendation: "pause",
    rationale: `Net value $${r2(net)} is marginal — pause and reassess rather than invest further.`,
  };
}
