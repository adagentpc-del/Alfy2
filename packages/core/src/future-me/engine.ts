import {
  AssessFutureInputSchema,
  FutureMeAssessmentSchema,
  type AssessFutureInput,
  type FutureMeAssessment,
  type FutureSignals,
  type FutureMeVerdict,
} from "@alfy2/shared";

/**
 * Future Me Engine (docs/adr/ADR-0148-future-me.md). Scores a decision for how Future Alyssa (1/5/10 years
 * out) will feel about it: regret rises with technical debt and falls with optionality, future opportunity,
 * reduced stress, future thanks, and reusable infrastructure. Low regret → she thanks you; high → she
 * regrets, and a better path is recommended. Deterministic. Tenant-scoped. Append-only in-memory store.
 */
export class FutureMeEngine {
  private readonly assessments = new Map<string, FutureMeAssessment>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  assess(tenantId: string, input: AssessFutureInput): FutureMeAssessment {
    const i = AssessFutureInputSchema.parse(input);
    const regret = round(this.regretRisk(i.signals));
    const verdict: FutureMeVerdict =
      regret <= 0.33 ? "future_alyssa_thanks_you" : regret <= 0.6 ? "mixed" : "future_alyssa_regrets";

    const assessment = FutureMeAssessmentSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      decision: i.decision,
      signals: i.signals,
      regret_risk: regret,
      verdict,
      better_path:
        verdict === "future_alyssa_regrets"
          ? `Reduce technical debt and preserve optionality on "${i.decision}" before committing, or stage it so future choices stay open.`
          : null,
      reason: this.reason(i.decision, verdict, regret),
      created_at: this.clock().toISOString(),
    });
    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  get(tenantId: string, id: string): FutureMeAssessment | undefined {
    const a = this.assessments.get(id);
    return a && a.tenant_id === tenantId ? a : undefined;
  }

  list(tenantId: string): FutureMeAssessment[] {
    return [...this.assessments.values()].filter((a) => a.tenant_id === tenantId);
  }

  private regretRisk(s: FutureSignals): number {
    // Costs raise regret; benefits lower it. Average of the cost-direction terms.
    const terms = [
      s.creates_technical_debt,
      1 - s.preserves_optionality,
      1 - s.increases_future_opportunity,
      1 - s.reduces_future_stress,
      1 - s.future_thanks,
      1 - s.creates_reusable_infrastructure,
    ];
    return terms.reduce((a, b) => a + b, 0) / terms.length;
  }

  private reason(decision: string, verdict: FutureMeVerdict, regret: number): string {
    if (verdict === "future_alyssa_thanks_you") return `Future Alyssa thanks you for "${decision}" (regret risk ${regret}).`;
    if (verdict === "mixed") return `"${decision}" is a mixed bet for Future Alyssa (regret risk ${regret}) — tighten the weak signals.`;
    return `Future Alyssa likely regrets "${decision}" (regret risk ${regret}) — take the better path.`;
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
