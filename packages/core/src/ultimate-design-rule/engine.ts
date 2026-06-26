import {
  EvaluateFeatureInputSchema,
  DesignRuleVerdictSchema,
  type EvaluateFeatureInput,
  type DesignRuleVerdict,
  type DesignRuleCriterion,
} from "@alfy2/shared";

/**
 * The Ultimate Design Rule (docs/adr/ADR-0121-ultimate-design-rule.md). The admission gate above the README
 * and the Constitution: a feature belongs in Alfy² only if it increases leverage, reduces friction,
 * compounds knowledge, protects trust, generates measurable value, or increases founder freedom. `evaluate()`
 * collects every criterion whose signal meets the threshold; the feature belongs when at least one is
 * satisfied. Tenant-scoped; verdicts persist. Deterministic. The criteria catalog is a frozen constant.
 */

/** The six admission criteria, in order — the frozen catalog. */
export const DESIGN_RULE_CRITERIA: DesignRuleCriterion[] = [
  "increases_leverage",
  "reduces_friction",
  "compounds_knowledge",
  "protects_trust",
  "generates_measurable_value",
  "increases_founder_freedom",
];

export class UltimateDesignRule {
  private readonly verdicts = new Map<string, DesignRuleVerdict>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /**
   * Evaluate a feature against the Ultimate Design Rule. `satisfied` lists every criterion whose signal is
   * at or above the threshold; `belongs` is true when at least one criterion is satisfied. Persists.
   */
  evaluate(tenantId: string, input: EvaluateFeatureInput): DesignRuleVerdict {
    const i = EvaluateFeatureInputSchema.parse(input);

    const satisfied: DesignRuleCriterion[] = DESIGN_RULE_CRITERIA.filter(
      (criterion) => i[criterion] >= i.threshold,
    );
    const belongs = satisfied.length >= 1;

    const verdict = belongs
      ? `Belongs — satisfies ${satisfied.length} criteria.`
      : "Does not belong in Alfy² — fails the Ultimate Design Rule.";

    const v = DesignRuleVerdictSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      feature: i.feature,
      satisfied,
      belongs,
      verdict,
      created_at: this.clock().toISOString(),
    });
    this.verdicts.set(v.id, v);
    return v;
  }

  get(tenantId: string, id: string): DesignRuleVerdict | undefined {
    const v = this.verdicts.get(id);
    return v && v.tenant_id === tenantId ? v : undefined;
  }

  list(tenantId: string): DesignRuleVerdict[] {
    return [...this.verdicts.values()].filter((v) => v.tenant_id === tenantId);
  }
}
