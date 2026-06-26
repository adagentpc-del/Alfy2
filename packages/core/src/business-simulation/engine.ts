import {
  SimulateDecisionInputSchema,
  BusinessSimulationSchema,
  OptionOutcomeSchema,
  type SimulateDecisionInput,
  type BusinessSimulation,
  type OptionOutcome,
  type DecisionOption,
} from "@alfy2/shared";

/**
 * The Business Simulation Engine (docs/adr/ADR-0048-business-simulation-engine.md). Before a major
 * decision, it simulates two options head-to-head — focus business A vs B, campaign A vs B, hire vs
 * automate, lower price vs premium, warm vs cold leads, build vs sell — projecting each into a best /
 * likely / worst case with revenue impact, risk, time cost, and stress cost, and recommends one.
 * Deterministic. Tenant-scoped. This is the A-vs-B decision comparator; the scenario Simulation Engine
 * (ADR-0021) models a single scenario's three cases.
 */

export class BusinessSimulationEngine {
  private readonly sims = new Map<string, BusinessSimulation>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Simulate option A vs option B and recommend the winner. */
  simulate(tenantId: string, input: SimulateDecisionInput): BusinessSimulation {
    const i = SimulateDecisionInputSchema.parse(input);
    const a = this.project(i.option_a);
    const b = this.project(i.option_b);
    const winner = a.score >= b.score ? a : b;
    const loser = winner === a ? b : a;
    const margin = round(winner.score - loser.score);

    const reason =
      `${winner.label} wins on the composite (score ${winner.score} vs ${loser.score}). ` +
      `Expected value $${Math.round(winner.expected_value_usd)} vs $${Math.round(loser.expected_value_usd)}, ` +
      `risk ${winner.risk} vs ${loser.risk}, stress ${winner.stress_cost} vs ${loser.stress_cost}, ` +
      `time ${winner.time_cost_days}d vs ${loser.time_cost_days}d.` +
      (margin < 0.05 ? " Close call — the options are nearly even." : "");

    const sim = BusinessSimulationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      question: i.question,
      a,
      b,
      recommendation: winner.label,
      reason,
      created_at: this.clock().toISOString(),
    });
    this.sims.set(sim.id, sim);
    return sim;
  }

  get(tenantId: string, id: string): BusinessSimulation | undefined {
    const s = this.sims.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  list(tenantId: string): BusinessSimulation[] {
    return [...this.sims.values()].filter((s) => s.tenant_id === tenantId);
  }

  // --- internals ---

  private project(o: DecisionOption): OptionOutcome {
    const ev = o.projected_revenue_usd * o.probability;
    const best = o.projected_revenue_usd * 1.3;
    const likely = ev;
    const worst = o.projected_revenue_usd * o.probability * 0.4 - o.projected_revenue_usd * o.risk * 0.5;
    // Composite: expected value (scaled), penalized by risk, stress, and time cost.
    const score = round(ev / 50_000 - o.risk * 0.6 - o.stress_cost * 0.4 - (o.time_cost_days / 30) * 0.3);
    return OptionOutcomeSchema.parse({
      label: o.label,
      best_case_usd: round(best),
      likely_case_usd: round(likely),
      worst_case_usd: round(worst),
      expected_value_usd: round(ev),
      risk: o.risk,
      time_cost_days: o.time_cost_days,
      stress_cost: o.stress_cost,
      score,
    });
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
