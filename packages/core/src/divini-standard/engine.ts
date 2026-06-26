import {
  EvaluateDiviniInputSchema,
  DiviniEvaluationSchema,
  type EvaluateDiviniInput,
  type DiviniEvaluation,
  type DiviniCriterion,
  type DiviniRecommendation,
} from "@alfy2/shared";

/** The 14 criteria the Divini Standard weighs (equal weight unless a criterion is omitted). */
const ALL_CRITERIA: DiviniCriterion[] = [
  "trust", "security", "elegance", "simplicity", "scalability", "compounding_value", "founder_freedom",
  "customer_value", "ethical_alignment", "financial_sustainability", "technical_quality", "documentation",
  "reusability", "long_term_maintainability",
];

/**
 * The Divini Standard (docs/adr/ADR-0142-divini-standard.md). Scores a proposal across the 14 criteria into a
 * 0..1 Divini Score (mean of supplied criteria), then recommends proceed (>= 0.7 and both headline checks
 * true), redesign (>= 0.45), or reject. The headline checks — would we still build this as a billion-dollar
 * company, and would we be proud in ten years — are derived from the ethical_alignment, trust, and
 * compounding_value signals and can veto a proceed. Deterministic. Tenant-scoped. Append-only store.
 */
export class DiviniStandard {
  private readonly evaluations = new Map<string, DiviniEvaluation>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  evaluate(tenantId: string, input: EvaluateDiviniInput): DiviniEvaluation {
    const i = EvaluateDiviniInputSchema.parse(input);

    const scores = new Map<DiviniCriterion, number>();
    for (const c of i.criteria) scores.set(c.criterion, c.score);
    const supplied = i.criteria.map((c) => c.score);
    const diviniScore = supplied.length ? round(supplied.reduce((a, b) => a + b, 0) / supplied.length) : 0;

    const ethics = scores.get("ethical_alignment") ?? 0;
    const trust = scores.get("trust") ?? 0;
    const compounding = scores.get("compounding_value") ?? 0;
    const billionDollarWorthy = diviniScore >= 0.7 && compounding >= 0.6;
    const proudInTenYears = ethics >= 0.7 && trust >= 0.7;

    const recommendation: DiviniRecommendation =
      diviniScore >= 0.7 && billionDollarWorthy && proudInTenYears
        ? "proceed"
        : diviniScore >= 0.45
          ? "redesign"
          : "reject";

    const evaluation = DiviniEvaluationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      subject: i.subject,
      subject_kind: i.subject_kind,
      criteria: i.criteria,
      divini_score: diviniScore,
      recommendation,
      billion_dollar_worthy: billionDollarWorthy,
      proud_in_ten_years: proudInTenYears,
      reason: this.reason(i.subject, recommendation, diviniScore, ALL_CRITERIA.length - i.criteria.length),
      created_at: this.clock().toISOString(),
    });
    this.evaluations.set(evaluation.id, evaluation);
    return evaluation;
  }

  get(tenantId: string, id: string): DiviniEvaluation | undefined {
    const e = this.evaluations.get(id);
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  list(tenantId: string): DiviniEvaluation[] {
    return [...this.evaluations.values()].filter((e) => e.tenant_id === tenantId);
  }

  private reason(subject: string, rec: DiviniRecommendation, score: number, missing: number): string {
    const gap = missing > 0 ? ` (${missing} criteria unscored)` : "";
    if (rec === "proceed") return `"${subject}" meets the Divini Standard at ${score}${gap} — proceed.`;
    if (rec === "redesign") return `"${subject}" is close at ${score}${gap} — redesign the weak criteria before proceeding.`;
    return `"${subject}" falls short at ${score}${gap} — recommend rejection or a fundamental rethink.`;
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
