import {
  EvaluateMultiplicationInputSchema,
  MultiplicationEvaluationSchema,
  type EvaluateMultiplicationInput,
  type MultiplicationEvaluation,
  type SharedForm,
} from "@alfy2/shared";

/**
 * The Multiplication Engine (docs/adr/ADR-0085-multiplication-engine.md). Never solve a problem only once.
 * Whenever a solution is found, the engine asks whether it can help another business, department, workflow,
 * agent, future founder, future FounderOS users, clients, or partners — and recommends converting it into
 * shared infrastructure, workflow, agent, asset, knowledge, or a FounderOS feature. The Multiplication Score
 * estimates how many future uses it will create (1 solution → 100 uses). Deterministic. Tenant-scoped.
 */

export class MultiplicationEngine {
  private readonly evals = new Map<string, MultiplicationEvaluation>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Evaluate a solution's multiplication leverage and recommend the shared forms it should take. */
  evaluate(tenantId: string, input: EvaluateMultiplicationInput): MultiplicationEvaluation {
    const i = EvaluateMultiplicationInputSchema.parse(input);

    const futureUses = Math.round(i.helps.length * i.estimated_uses_per_target);
    const score = clamp01(round(Math.min(1, futureUses / 100)));

    const targets = new Set(i.helps);
    const forms = new Set<SharedForm>();
    if (targets.has("another_business") || targets.has("another_department")) {
      forms.add("shared_infrastructure");
      forms.add("shared_workflow");
    }
    if (targets.has("another_workflow")) {
      forms.add("shared_workflow");
    }
    if (targets.has("another_agent")) {
      forms.add("shared_agent");
    }
    if (targets.has("future_founderos_users")) {
      forms.add("founderos_feature");
    }
    if (targets.has("clients") || targets.has("partners")) {
      forms.add("shared_asset");
      forms.add("shared_knowledge");
    }

    const evaluation = MultiplicationEvaluationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      solution_title: i.solution_title,
      helps: i.helps,
      recommended_shared_forms: [...forms],
      estimated_future_uses: futureUses,
      multiplication_score: score,
      recommend_share: futureUses >= 5,
      created_at: this.clock().toISOString(),
    });
    this.evals.set(evaluation.id, evaluation);
    return evaluation;
  }

  get(tenantId: string, id: string): MultiplicationEvaluation | undefined {
    const e = this.evals.get(id);
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  list(tenantId: string): MultiplicationEvaluation[] {
    return [...this.evals.values()].filter((e) => e.tenant_id === tenantId);
  }

  /** Solutions ranked by multiplication leverage — the biggest force-multipliers first. */
  topByMultiplication(tenantId: string): MultiplicationEvaluation[] {
    return this.list(tenantId).sort((a, b) => b.multiplication_score - a.multiplication_score);
  }
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;
