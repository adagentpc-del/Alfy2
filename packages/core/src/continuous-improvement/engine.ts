import {
  EvaluateWorkflowInputSchema,
  WorkflowEvaluationSchema,
  type EvaluateWorkflowInput,
  type WorkflowEvaluation,
  type ImprovementRecommendation,
  type ImprovementMetrics,
} from "@alfy2/shared";

/**
 * The Continuous Improvement Engine (docs/adr/ADR-0059-continuous-improvement.md). Every workflow is
 * evaluated continuously on speed, quality, cost, conversion, reliability, and user effort, and the engine
 * recommends simplify, automate, remove, merge, split, or delegate — each recommendation carrying an
 * expected impact and a confidence. Deterministic. Tenant-scoped.
 */

export class ContinuousImprovementEngine {
  private readonly evals = new Map<string, WorkflowEvaluation>();
  private readonly byWorkflow = new Map<string, string>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Evaluate a workflow and produce ranked improvement recommendations. */
  evaluate(tenantId: string, input: EvaluateWorkflowInput): WorkflowEvaluation {
    const i = EvaluateWorkflowInputSchema.parse(input);
    const m = i.metrics;
    const health = round(mean([m.speed, m.quality, m.cost_efficiency, m.conversion, m.reliability, m.user_ease]));
    const recs: ImprovementRecommendation[] = [];

    if (i.low_value) recs.push(rec("remove", "Low-value workflow — removing it frees capacity.", 1 - health, 0.7));
    if (i.manual_steps >= 2 && m.speed < 0.7) recs.push(rec("automate", `${i.manual_steps} manual steps and slow — automate the repetitive parts.`, gap(m.speed) * 0.8 + 0.2, 0.75));
    if (m.user_ease < 0.5) recs.push(rec("simplify", "High user effort — simplify the steps and inputs.", gap(m.user_ease), 0.7));
    if (i.overlaps_another) recs.push(rec("merge", "Overlaps another workflow — merge to cut duplication.", 0.4, 0.6));
    if (i.does_multiple_jobs && m.quality < 0.7) recs.push(rec("split", "Bundles unrelated jobs and quality is mixed — split for focus.", gap(m.quality) * 0.6 + 0.2, 0.6));
    if (m.reliability < 0.6) recs.push(rec("delegate", "Unreliable when self-run — delegate to a dedicated owner/agent.", gap(m.reliability), 0.55));

    recs.sort((a, b) => (b.expected_impact * b.confidence) - (a.expected_impact * a.confidence));

    const evaluation = WorkflowEvaluationSchema.parse({
      id: this.byWorkflow.get(`${tenantId}|${i.workflow_name}`) ?? this.newId(),
      tenant_id: tenantId,
      workflow_name: i.workflow_name,
      metrics: m,
      health_score: health,
      recommendations: recs,
      created_at: this.clock().toISOString(),
    });
    this.evals.set(evaluation.id, evaluation);
    this.byWorkflow.set(`${tenantId}|${i.workflow_name}`, evaluation.id);
    return evaluation;
  }

  get(tenantId: string, workflowName: string): WorkflowEvaluation | undefined {
    const id = this.byWorkflow.get(`${tenantId}|${workflowName}`);
    const e = id ? this.evals.get(id) : undefined;
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  list(tenantId: string): WorkflowEvaluation[] {
    return [...this.evals.values()].filter((e) => e.tenant_id === tenantId);
  }

  /** Workflows ranked worst-health-first — where improvement matters most. */
  worstFirst(tenantId: string): WorkflowEvaluation[] {
    return this.list(tenantId).sort((a, b) => a.health_score - b.health_score);
  }
}

const rec = (action: ImprovementRecommendation["action"], rationale: string, impact: number, confidence: number): ImprovementRecommendation => ({
  action, rationale, expected_impact: clamp01(round(impact)), confidence: clamp01(round(confidence)),
});
const gap = (v: number): number => clamp01(1 - v);
const mean = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;
export type { ImprovementMetrics };
