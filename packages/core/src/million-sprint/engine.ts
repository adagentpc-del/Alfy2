import {
  BuildSprintInputSchema,
  SprintPlanSchema,
  RankedCashPathSchema,
  type BuildSprintInput,
  type CashPathInput,
  type SprintPlan,
  type RankedCashPath,
} from "@alfy2/shared";

/**
 * The Million-Dollar Sprint Engine (docs/adr/ADR-0100-million-sprint.md). Builds an aggressive but
 * realistic path to a cash target, ranking paths by speed to cash, deal size, probability, effort,
 * legal/compliance risk, relationship leverage, asset readiness, and founder energy — with 7/30/90-day
 * plans and no fantasy math. Every path carries its own assumptions, risks, and required actions
 * through to the plan, and the expected total is the probability-weighted sum (never the headline
 * deal sizes). Deterministic. Tenant-scoped.
 */

export class MillionDollarSprintEngine {
  private readonly plans = new Map<string, SprintPlan>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Build a ranked, realistic sprint plan toward the cash target. */
  build(tenantId: string, input: BuildSprintInput): SprintPlan {
    const i = BuildSprintInputSchema.parse(input);

    // Each path's expected cash is probability-weighted — never the headline deal size.
    const scored = i.paths.map((p) => {
      const expectedCash = p.deal_size_usd * p.probability;
      const velocity = expectedCash / Math.max(1, p.speed_days);
      return { path: p, expectedCash, velocity };
    });

    // Normalize velocity into a 0..1 band so it composes with the other 0..1 levers without a single
    // big-but-slow deal dominating.
    const maxVelocity = scored.reduce((m, s) => Math.max(m, s.velocity), 0);

    const ranked: RankedCashPath[] = scored
      .map((s) => {
        const velocityNorm = maxVelocity > 0 ? s.velocity / maxVelocity : 0;
        const score =
          velocityNorm +
          s.path.relationship_leverage * 0.2 +
          s.path.asset_readiness * 0.2 -
          s.path.effort * 0.2 -
          s.path.legal_risk * 0.2 -
          (1 - s.path.founder_energy) * 0.1;
        return RankedCashPathSchema.parse({
          label: s.path.label,
          expected_cash_usd: round(s.expectedCash),
          velocity: round(s.velocity),
          score: round(score),
          assumptions: s.path.assumptions,
          risks: s.path.risks,
          required_actions: this.requiredActions(s.path),
        });
      })
      .sort((a, b) => b.score - a.score);

    const expectedTotal = round(scored.reduce((sum, s) => sum + s.expectedCash, 0));
    const realistic = expectedTotal >= i.target_usd;

    // 7-day = first required action of the top paths; 30-day = the rest of the top paths' actions;
    // 90-day = the longer-horizon paths. Carried straight from each path — no invented work.
    const top = ranked.slice(0, 3);
    const mid = ranked.slice(0, 5);
    const plan7 = top.map((p) => p.required_actions[0]).filter((a): a is string => Boolean(a));
    const plan30 = top.flatMap((p) => p.required_actions.slice(1));
    const plan90 = ranked
      .slice(3)
      .flatMap((p) => p.required_actions)
      .concat(ranked.slice(3).length === 0 ? mid.flatMap((p) => p.required_actions.slice(0, 1)) : []);

    const dailyMoneyActions = top
      .flatMap((p) => p.required_actions)
      .slice(0, 5);

    const plan = SprintPlanSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      target_usd: i.target_usd,
      ranked_paths: ranked,
      expected_total_cash_usd: expectedTotal,
      plan_7_day: plan7,
      plan_30_day: plan30,
      plan_90_day: plan90,
      daily_money_actions: dailyMoneyActions,
      realistic,
      created_at: this.clock().toISOString(),
    });
    this.plans.set(plan.id, plan);
    return plan;
  }

  get(tenantId: string, id: string): SprintPlan | undefined {
    const p = this.plans.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): SprintPlan[] {
    return [...this.plans.values()].filter((p) => p.tenant_id === tenantId);
  }

  // --- internals ---

  /** Templated, honest actions that carry the path's readiness gaps through. */
  private requiredActions(p: CashPathInput): string[] {
    const actions = [
      `Advance "${p.label}" toward $${Math.round(p.deal_size_usd)} ` +
        `(${Math.round(p.probability * 100)}% in ~${p.speed_days}d).`,
    ];
    if (p.asset_readiness < 0.7) actions.push(`Close the asset gap for "${p.label}" before pitching.`);
    if (p.relationship_leverage >= 0.5) actions.push(`Use the warm relationship behind "${p.label}".`);
    if (p.legal_risk >= 0.4) actions.push(`Clear the legal/compliance risk on "${p.label}" first.`);
    return actions;
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
