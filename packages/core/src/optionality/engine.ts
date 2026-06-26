import {
  AssessOptionalityInputSchema,
  OptionalityAssessmentSchema,
  type AssessOptionalityInput,
  type OptionalityAssessment,
  type OptionalityPath,
  type OptionalityVerdict,
} from "@alfy2/shared";

/**
 * Optionality Engine (docs/adr/ADR-0149-optionality.md). Scores each path on long-term optionality — net new
 * opportunities, flexibility, reusable assets, and strategic options, minus lock-in — and recommends the
 * highest. When two paths are within a small expected-value band, it explicitly prefers the one that
 * preserves the most choices. Deterministic. Tenant-scoped. Append-only in-memory store.
 */
export class OptionalityEngine {
  private readonly assessments = new Map<string, OptionalityAssessment>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  assess(tenantId: string, input: AssessOptionalityInput): OptionalityAssessment {
    const i = AssessOptionalityInputSchema.parse(input);

    const scored = i.paths.map((p) => ({ path: p, score: this.score(p) }));
    const verdicts: OptionalityVerdict[] = scored
      .slice()
      .sort((a, b) => b.score - a.score)
      .map((s) => ({
        path: s.path.path,
        optionality_score: round(s.score),
        note:
          `${s.path.path}: +${s.path.opportunities_created} / -${s.path.opportunities_eliminated} opportunities, ` +
          `flexibility ${s.path.flexibility}, reuse ${s.path.reusable_assets}, options ${s.path.strategic_options}, ` +
          `lock-in ${s.path.lock_in}.`,
      }));

    const best = scored.reduce((max, s) => (s.score > max.score ? s : max));
    // EV tie-break: among paths within 0.05 EV of the best, prefer the highest optionality (already the sort key).
    const evBand = scored.filter((s) => Math.abs(s.path.expected_value - best.path.expected_value) <= 0.05);
    const recommended = evBand.reduce((max, s) => (s.score > max.score ? s : max), best);

    const assessment = OptionalityAssessmentSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      decision: i.decision,
      verdicts,
      recommended_path: recommended.path.path,
      reason:
        `Recommend "${recommended.path.path}" — highest long-term optionality (score ${round(recommended.score)}). ` +
        (evBand.length > 1 ? "Chosen on the optionality tie-break among similar-EV paths." : ""),
      created_at: this.clock().toISOString(),
    });
    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  get(tenantId: string, id: string): OptionalityAssessment | undefined {
    const a = this.assessments.get(id);
    return a && a.tenant_id === tenantId ? a : undefined;
  }

  list(tenantId: string): OptionalityAssessment[] {
    return [...this.assessments.values()].filter((a) => a.tenant_id === tenantId);
  }

  private score(p: OptionalityPath): number {
    const net = Math.max(-1, Math.min(1, (p.opportunities_created - p.opportunities_eliminated) / 5));
    return net * 0.3 + p.flexibility * 0.2 + p.reusable_assets * 0.2 + p.strategic_options * 0.2 - p.lock_in * 0.2;
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
