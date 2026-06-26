import {
  EvaluateCompoundingInputSchema,
  CompoundingEvaluationSchema,
  AssetLineageSchema,
  type EvaluateCompoundingInput,
  type CompoundingEvaluation,
  type AssetLineage,
  type CompoundingMetrics,
  type ReusableForm,
} from "@alfy2/shared";

/**
 * The Compounding Engine (docs/adr/ADR-0084-compounding-engine.md). Nothing should be created only once if
 * it can create value repeatedly. Every completed task is evaluated for whether it can become reusable IP,
 * automation, knowledge, or revenue; the engine recommends reusable forms, computes a Compounding Score
 * (the mean of the eight compounding dimensions), and maintains an Asset Lineage Graph so every asset knows
 * what created it and what it created. Deterministic. Tenant-scoped.
 */

export class CompoundingEngine {
  private readonly evals = new Map<string, CompoundingEvaluation>();
  private readonly lineages = new Map<string, AssetLineage>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Evaluate a completed task, recommend reusable forms, and seed its lineage record. */
  evaluate(tenantId: string, input: EvaluateCompoundingInput): CompoundingEvaluation {
    const i = EvaluateCompoundingInputSchema.parse(input);
    const m = i.metrics;
    const score = round(
      mean([
        m.reuse_frequency,
        m.businesses_using,
        m.revenue_generated,
        m.time_saved,
        m.automation_potential,
        m.knowledge_value,
        m.strategic_importance,
        m.longevity,
      ]),
    );

    const forms = new Set<ReusableForm>();
    if (m.automation_potential >= 0.5) {
      forms.add("automation");
      forms.add("agent");
      forms.add("workflow");
    }
    if (m.knowledge_value >= 0.5) {
      forms.add("knowledge_article");
      forms.add("sop");
      forms.add("playbook");
      forms.add("training_doc");
      forms.add("podcast_topic");
      forms.add("blog");
      forms.add("social_post");
      forms.add("newsletter");
    }
    if (m.reuse_frequency >= 0.5) {
      forms.add("template");
      forms.add("checklist");
    }
    if (m.revenue_generated >= 0.5) {
      forms.add("sales_asset");
    }
    if (m.strategic_importance >= 0.6) {
      forms.add("founderos_feature");
      forms.add("consulting_framework");
    }

    const now = this.clock().toISOString();

    const lineage = AssetLineageSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      asset_title: i.task_title,
      created_by: i.created_by,
      created_assets: [],
      businesses_using: [],
      revenue_influenced_usd: round(m.revenue_generated * 1000),
      agents_using: [],
      workflows_using: [],
      version: 1,
      last_updated: now,
    });
    this.lineages.set(lineage.id, lineage);

    const evaluation = CompoundingEvaluationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      task_title: i.task_title,
      recommended_forms: [...forms],
      metrics: m,
      compounding_score: score,
      recommend_create_reusable: score >= 0.5,
      lineage_id: lineage.id,
      created_at: now,
    });
    this.evals.set(evaluation.id, evaluation);
    return evaluation;
  }

  get(tenantId: string, id: string): CompoundingEvaluation | undefined {
    const e = this.evals.get(id);
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  list(tenantId: string): CompoundingEvaluation[] {
    return [...this.evals.values()].filter((e) => e.tenant_id === tenantId);
  }

  /** All lineage records for a tenant. */
  lineage(tenantId: string): AssetLineage[] {
    return [...this.lineages.values()].filter((l) => l.tenant_id === tenantId);
  }

  getLineage(tenantId: string, id: string): AssetLineage | undefined {
    const l = this.lineages.get(id);
    return l && l.tenant_id === tenantId ? l : undefined;
  }

  /** Record a derivative asset against a lineage record and bump its version. */
  recordDerivative(tenantId: string, lineageId: string, derivativeTitle: string): AssetLineage | undefined {
    const prev = this.getLineage(tenantId, lineageId);
    if (!prev) return undefined;
    const updated = AssetLineageSchema.parse({
      ...prev,
      created_assets: [...prev.created_assets, derivativeTitle],
      version: prev.version + 1,
      last_updated: this.clock().toISOString(),
    });
    this.lineages.set(updated.id, updated);
    return updated;
  }

  /** Highest-compounding evaluations — the assets worth improving this quarter. */
  quarterlyImproveList(tenantId: string): CompoundingEvaluation[] {
    return this.list(tenantId).sort((a, b) => b.compounding_score - a.compounding_score);
  }
}

const mean = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;
const round = (n: number): number => Math.round(n * 1000) / 1000;
