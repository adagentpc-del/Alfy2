import {
  EvaluateAcquisitionInputSchema,
  AcquisitionEvaluationSchema,
  StrategyVerdictSchema,
  type EvaluateAcquisitionInput,
  type AcquisitionEvaluation,
  type StrategyVerdict,
  type StrategySignals,
  type AcquisitionStrategy,
} from "@alfy2/shared";

/**
 * The Acquisition Engine (docs/adr/ADR-0112-acquisition.md). For any opportunity it evaluates every path to
 * capture it — build, buy, partner, license, white-label, acquire, invest, or ignore — scoring each on
 * revenue, leverage, and strategic value, penalized by risk, time, cost, and complexity. Infeasible paths
 * are scored out. It sorts the verdicts and recommends the single best path, teaching Alfy² to think like a
 * capital allocator. Deterministic. Tenant-scoped.
 */

export class AcquisitionEngine {
  private readonly evaluations = new Map<string, AcquisitionEvaluation>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Score every path to the opportunity and recommend one. */
  evaluate(tenantId: string, input: EvaluateAcquisitionInput): AcquisitionEvaluation {
    const i = EvaluateAcquisitionInputSchema.parse(input);

    const scored = i.options.map((o) => ({ option: o, score: this.score(o) }));

    const verdicts: StrategyVerdict[] = [...scored]
      .sort((a, b) => b.score - a.score)
      .map((s) =>
        StrategyVerdictSchema.parse({
          strategy: s.option.strategy,
          score: round(s.score),
          note: this.note(s.option, s.score),
        }),
      );

    const best = scored.reduce((max, s) => (s.score > max.score ? s : max));
    const recommendation: AcquisitionStrategy =
      best.option.feasible && best.score > 0 ? best.option.strategy : "ignore";

    const evaluation = AcquisitionEvaluationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      opportunity: i.opportunity,
      verdicts,
      recommendation,
      reason: this.reason(i.opportunity, recommendation, best.score),
      created_at: this.clock().toISOString(),
    });
    this.evaluations.set(evaluation.id, evaluation);
    return evaluation;
  }

  get(tenantId: string, id: string): AcquisitionEvaluation | undefined {
    const e = this.evaluations.get(id);
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  list(tenantId: string): AcquisitionEvaluation[] {
    return [...this.evaluations.values()].filter((e) => e.tenant_id === tenantId);
  }

  // --- internals ---

  private score(o: StrategySignals): number {
    if (!o.feasible) return -1;
    return (
      o.revenue * 0.3 +
      o.leverage * 0.25 +
      o.strategic_value * 0.25 -
      o.risk * 0.2 -
      o.time * 0.15 -
      o.cost * 0.2 -
      o.complexity * 0.15
    );
  }

  private note(o: StrategySignals, score: number): string {
    if (!o.feasible) return `${STRATEGY_LABEL[o.strategy]} is not feasible for this opportunity — scored out.`;
    const base =
      `${STRATEGY_LABEL[o.strategy]} scored ${round(score)} (revenue ${o.revenue}, leverage ${o.leverage}, ` +
      `strategic ${o.strategic_value}, risk ${o.risk}, time ${o.time}, cost ${o.cost}, complexity ${o.complexity}).`;
    const verdict =
      score >= 0.3 ? "Strong path — worth pursuing." : score > 0 ? "Viable but modest — weigh against alternatives." : "Weak path — likely not worth it.";
    return `${base} ${verdict}`;
  }

  private reason(opportunity: string, recommendation: AcquisitionStrategy, bestScore: number): string {
    if (recommendation === "ignore") {
      return `No feasible, positive-scoring path to "${opportunity}" — recommend ignore for now.`;
    }
    return `Best path to "${opportunity}" is ${STRATEGY_LABEL[recommendation]} at score ${round(bestScore)} — recommend ${recommendation}.`;
  }
}

const STRATEGY_LABEL: Record<AcquisitionStrategy, string> = {
  build: "Build",
  buy: "Buy",
  partner: "Partner",
  license: "License",
  white_label: "White-label",
  acquire: "Acquire",
  invest: "Invest",
  ignore: "Ignore",
};

const round = (n: number): number => Math.round(n * 1000) / 1000;
