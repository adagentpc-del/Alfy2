import {
  AllocateInputSchema,
  AllocationPlanSchema,
  type AllocateInput,
  type AllocationPlan,
  type AllocationCandidate,
  type AllocationHorizon,
} from "@alfy2/shared";

/**
 * The Executive Capital Allocator (docs/adr/ADR-0088-capital-allocator.md). Every day it determines the
 * highest-value allocation of Alyssa's limited capital — time, money, energy, attention, relationships,
 * reputation, knowledge, technology, assets, employees, agents, automation capacity. It answers a different
 * question per horizon: daily — what creates the highest return today? weekly — where should we invest next?
 * quarterly — what should we stop investing in? It never optimizes one resource while unknowingly destroying
 * another, so it always surfaces trade-offs (what each top pick depletes). Deterministic. Tenant-scoped.
 */

const HORIZON_QUESTION: Record<AllocationHorizon, string> = {
  daily: "What creates the highest return today?",
  weekly: "Where should we invest next?",
  quarterly: "What should we stop investing in?",
};

export class ExecutiveCapitalAllocator {
  private readonly plans = new Map<string, AllocationPlan>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Produce the allocation plan for a horizon over the candidate uses of capital. */
  allocate(tenantId: string, input: AllocateInput): AllocationPlan {
    const i = AllocateInputSchema.parse(input);
    const cs = i.candidates;

    const highest = (pick: (c: AllocationCandidate) => number): string | null => {
      let best: AllocationCandidate | null = null;
      for (const c of cs) if (best === null || pick(c) > pick(best)) best = c;
      return best ? best.label : null;
    };

    const highest_roi = highest((c) => c.expected_return);
    const highest_leverage = highest((c) => c.leverage);
    const highest_compounding = highest((c) => c.compounding);
    const highest_strategic_value = highest((c) => c.strategic_value);
    const highest_founder_freedom = highest((c) => c.founder_freedom);

    // Strongest across leverage + compounding + strategic value + founder freedom.
    const strategicScore = (c: AllocationCandidate): number =>
      c.leverage + c.compounding + c.strategic_value + c.founder_freedom;
    let top: AllocationCandidate = cs[0]!;
    for (const c of cs) if (strategicScore(c) > strategicScore(top)) top = c;

    const recommendation =
      `For the ${i.horizon} horizon (${HORIZON_QUESTION[i.horizon]}) invest in "${top.label}" — ` +
      `it is strongest across leverage, compounding, strategic value, and founder freedom ` +
      `(combined ${round(strategicScore(top))}/4).`;

    const tradeoffs = [
      `${top.label} depletes: ${top.depletes.length > 0 ? top.depletes.join(", ") : "no tracked capital"}`,
    ];

    const stop_investing_in =
      i.horizon === "quarterly"
        ? cs.filter((c) => c.expected_return < 0.3).map((c) => c.label)
        : [];

    const plan = AllocationPlanSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      horizon: i.horizon,
      question: HORIZON_QUESTION[i.horizon],
      highest_roi: highest_roi ?? null,
      highest_leverage: highest_leverage ?? null,
      highest_compounding: highest_compounding ?? null,
      highest_strategic_value: highest_strategic_value ?? null,
      highest_founder_freedom: highest_founder_freedom ?? null,
      recommendation,
      tradeoffs,
      stop_investing_in,
      created_at: this.clock().toISOString(),
    });
    this.plans.set(plan.id, plan);
    return plan;
  }

  get(tenantId: string, id: string): AllocationPlan | undefined {
    const p = this.plans.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): AllocationPlan[] {
    return [...this.plans.values()].filter((p) => p.tenant_id === tenantId);
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
