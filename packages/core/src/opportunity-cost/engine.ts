import {
  CompareOptionsInputSchema,
  OpportunityComparisonSchema,
  type CompareOptionsInput,
  type OpportunityComparison,
  type CostOption,
  type EvaluatedOption,
} from "@alfy2/shared";

/**
 * The Opportunity Cost Engine (docs/adr/ADR-0089-opportunity-cost.md). Compares options A/B/C/D, computing
 * for each an expected value, a composite score, and the opportunity cost (the value forgone versus the
 * best alternative). It then names the best financial / strategic / long-term / low-risk / fastest /
 * highest-leverage choice, and — crucially — always shows what is NOT being chosen and why. The
 * recommendation is the option with the highest composite score. Deterministic. Tenant-scoped.
 */

export class OpportunityCostEngine {
  private readonly comparisons = new Map<string, OpportunityComparison>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Compare the options and recommend the highest composite score. */
  compare(tenantId: string, input: CompareOptionsInput): OpportunityComparison {
    const i = CompareOptionsInputSchema.parse(input);
    const opts = i.options;

    // Expected value per option (capital_required intentionally weighted at 0 per the spec).
    const ev = (o: CostOption): number =>
      o.expected_upside_usd * o.confidence - o.expected_downside_usd * (1 - o.confidence) - o.capital_required_usd * 0;

    const evs = opts.map(ev);
    const maxAbsEv = Math.max(1, ...evs.map((v) => Math.abs(v)));

    // Composite score: normalized EV plus leverage, minus risk, stress, and complexity.
    const composite = (o: CostOption): number =>
      round(
        ev(o) / maxAbsEv +
          o.future_leverage * 0.3 -
          o.risk * 0.3 -
          o.stress_cost * 0.2 -
          o.complexity * 0.1,
      );

    const evaluated: EvaluatedOption[] = opts.map((o) => {
      const myEv = ev(o);
      // Best OTHER option's EV; the best option's own opportunity cost references the second-best EV.
      const otherEvs = opts.filter((x) => x !== o).map(ev);
      const bestOther = otherEvs.length > 0 ? Math.max(...otherEvs) : myEv;
      const opportunity_cost_usd = Math.max(0, round(bestOther - myEv));
      return {
        label: o.label,
        expected_value_usd: round(myEv),
        opportunity_cost_usd,
        composite_score: composite(o),
      };
    });

    const pick = (score: (o: CostOption) => number, mode: "max" | "min"): string => {
      let best: CostOption = opts[0]!;
      for (const o of opts) {
        if (mode === "max" ? score(o) > score(best) : score(o) < score(best)) best = o;
      }
      return best.label;
    };

    const best_financial = pick((o) => ev(o), "max");
    const best_strategic = pick((o) => o.future_leverage, "max");
    const best_long_term = pick((o) => o.future_leverage * o.confidence, "max");
    const best_low_risk = pick((o) => o.risk, "min");
    const fastest = pick((o) => o.time_required_days, "min");
    const highest_leverage = pick((o) => o.future_leverage, "max");

    let winner: CostOption = opts[0]!;
    for (const o of opts) if (composite(o) > composite(winner)) winner = o;

    const not_chosen = opts
      .filter((o) => o !== winner)
      .map((o) => {
        const reasons: string[] = [];
        if (ev(o) < ev(winner)) reasons.push("lower expected value");
        if (o.future_leverage < winner.future_leverage) reasons.push("less future leverage");
        if (o.risk > winner.risk) reasons.push("higher risk");
        if (o.stress_cost > winner.stress_cost) reasons.push("higher stress");
        if (o.complexity > winner.complexity) reasons.push("more complex");
        const why = reasons.length > 0 ? reasons.join(", ") : "lower overall composite score";
        return `${o.label}: not chosen — ${why} than "${winner.label}".`;
      });

    const recommendation =
      `Choose "${winner.label}" — it has the highest composite score (${composite(winner)}), ` +
      `expected value $${Math.round(ev(winner))}.`;

    const comparison = OpportunityComparisonSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      question: i.question,
      evaluated,
      best_financial,
      best_strategic,
      best_long_term,
      best_low_risk,
      fastest,
      highest_leverage,
      not_chosen,
      recommendation,
      created_at: this.clock().toISOString(),
    });
    this.comparisons.set(comparison.id, comparison);
    return comparison;
  }

  get(tenantId: string, id: string): OpportunityComparison | undefined {
    const c = this.comparisons.get(id);
    return c && c.tenant_id === tenantId ? c : undefined;
  }

  list(tenantId: string): OpportunityComparison[] {
    return [...this.comparisons.values()].filter((c) => c.tenant_id === tenantId);
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
