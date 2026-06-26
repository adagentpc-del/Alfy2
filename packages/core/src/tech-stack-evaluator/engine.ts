import {
  EvaluateStackInputSchema,
  StackEvaluationSchema,
  type EvaluateStackInput,
  type StackEvaluation,
  type StackSignals,
  type StackDisposition,
} from "@alfy2/shared";

/**
 * Tech Stack Evaluator (docs/adr/ADR-0152-tech-stack-evaluator.md). Decides upgrade / replace / wait /
 * experiment / ignore for a stack component. The guard rail is absolute: with no measurable benefit it never
 * changes for novelty (ignore, or wait if there is real current pain). With measurable benefit it weighs
 * maturity, switching cost, risk, and current pain. Deterministic. Tenant-scoped. Append-only in-memory store.
 */
export class TechStackEvaluator {
  private readonly evaluations = new Map<string, StackEvaluation>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  evaluate(tenantId: string, input: EvaluateStackInput): StackEvaluation {
    const i = EvaluateStackInputSchema.parse(input);
    const s = i.signals;
    const hasBenefit = s.measurable_benefit >= 0.5;
    const disposition = this.decide(s, hasBenefit);

    const evaluation = StackEvaluationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      component: i.component,
      category: i.category,
      signals: i.signals,
      disposition,
      has_measurable_benefit: hasBenefit,
      reason: this.reason(i.component, disposition, hasBenefit),
      created_at: this.clock().toISOString(),
    });
    this.evaluations.set(evaluation.id, evaluation);
    return evaluation;
  }

  get(tenantId: string, id: string): StackEvaluation | undefined {
    const e = this.evaluations.get(id);
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  list(tenantId: string): StackEvaluation[] {
    return [...this.evaluations.values()].filter((e) => e.tenant_id === tenantId);
  }

  private decide(s: StackSignals, hasBenefit: boolean): StackDisposition {
    if (!hasBenefit) return s.current_pain >= 0.6 ? "wait" : "ignore";
    if (s.maturity < 0.4) return "experiment";
    if (s.switching_cost > 0.7 || s.risk > 0.7) return "wait";
    if (s.current_pain >= 0.5) return "replace";
    return "upgrade";
  }

  private reason(component: string, disposition: StackDisposition, hasBenefit: boolean): string {
    if (!hasBenefit) {
      return disposition === "wait"
        ? `${component}: no measurable benefit yet, but real current pain — wait for a better option, do not change for novelty.`
        : `${component}: no measurable benefit — ignore. Newer is not a reason to change.`;
    }
    const map: Record<StackDisposition, string> = {
      upgrade: "measurable benefit, low friction — upgrade in place.",
      replace: "measurable benefit and real pain — replace it.",
      wait: "measurable benefit but high switching cost or risk — wait until that lowers.",
      experiment: "measurable benefit but immature — experiment behind a flag first.",
      ignore: "no action.",
    };
    return `${component}: ${map[disposition]}`;
  }
}
