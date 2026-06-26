import {
  AllocateBoardInputSchema,
  CapitalBoardDecisionSchema,
  BoardOptionVerdictSchema,
  type AllocateBoardInput,
  type BoardOptionInput,
  type CapitalBoardDecision,
  type BoardOptionVerdict,
  type CapitalDisposition,
} from "@alfy2/shared";

/**
 * The Capital Allocation Board (docs/adr/ADR-0099-capital-board.md). Allocates cash, time, attention,
 * energy, team capacity, agent capacity, technology spend, relationships, and brand equity. For every
 * option it computes a composite score (expected return and leverage and compounding, penalized by
 * risk, liquidity impact, and payback), the opportunity cost against the best alternative, and a
 * disposition — invest / test / delay / automate / delegate / kill / sell / package into FounderOS.
 * Deterministic. Tenant-scoped.
 */

export class CapitalAllocationBoardError extends Error {}

export class CapitalAllocationBoard {
  private readonly decisions = new Map<string, CapitalBoardDecision>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Score every option, assign a disposition, and pick the top allocation. */
  allocate(tenantId: string, input: AllocateBoardInput): CapitalBoardDecision {
    const i = AllocateBoardInputSchema.parse(input);

    const scored = i.options.map((o) => ({ option: o, composite: this.composite(o) }));

    const verdicts = scored.map((s, idx): BoardOptionVerdict => {
      // Opportunity cost = how much better the best OTHER option scores than this one (never negative).
      const bestOther = scored.reduce(
        (max, other, j) => (j === idx ? max : Math.max(max, other.composite)),
        Number.NEGATIVE_INFINITY,
      );
      const opportunityCost = bestOther === Number.NEGATIVE_INFINITY ? 0 : Math.max(0, round(bestOther - s.composite));
      const disposition = this.disposition(s.option, s.composite);
      return BoardOptionVerdictSchema.parse({
        label: s.option.label,
        composite_score: round(s.composite),
        opportunity_cost: opportunityCost,
        disposition,
        reason: this.reason(s.option, s.composite, disposition),
      });
    });

    const topPick = scored.reduce((best, s) => (s.composite > best.composite ? s : best)).option.label;

    const decision = CapitalBoardDecisionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      verdicts,
      top_pick: topPick,
      created_at: this.clock().toISOString(),
    });
    this.decisions.set(decision.id, decision);
    return decision;
  }

  get(tenantId: string, id: string): CapitalBoardDecision | undefined {
    const d = this.decisions.get(id);
    return d && d.tenant_id === tenantId ? d : undefined;
  }

  list(tenantId: string): CapitalBoardDecision[] {
    return [...this.decisions.values()].filter((d) => d.tenant_id === tenantId);
  }

  // --- internals ---

  private composite(o: BoardOptionInput): number {
    return (
      o.expected_return * 0.4 +
      o.leverage * 0.25 +
      o.compounding * 0.25 -
      o.risk * 0.2 -
      o.liquidity_impact * 0.1 -
      (o.payback_months / 24) * 0.1
    );
  }

  /** Disposition rules, evaluated in priority order. */
  private disposition(o: BoardOptionInput, composite: number): CapitalDisposition {
    if (composite <= 0.2 && o.expected_return < 0.3) return "kill";
    if (o.packageable && o.compounding >= 0.5) return "package_founderos";
    if (o.automatable && o.expected_return >= 0.4) return "automate";
    if (o.delegatable && o.expected_return >= 0.4) return "delegate";
    if (o.risk >= 0.7 || o.liquidity_impact >= 0.7) return "delay";
    if (composite >= 0.3 && composite < 0.5) return "test";
    return "invest";
  }

  private reason(o: BoardOptionInput, composite: number, disposition: CapitalDisposition): string {
    const base =
      `Composite ${round(composite)} (return ${o.expected_return}, leverage ${o.leverage}, ` +
      `compounding ${o.compounding}, risk ${o.risk}, liquidity ${o.liquidity_impact}, payback ${o.payback_months}mo).`;
    const verdict: Record<CapitalDisposition, string> = {
      kill: "Low return and low score — kill it and free the capital.",
      package_founderos: "Compounding and packageable — package into FounderOS.",
      automate: "Automatable with real return — automate it.",
      delegate: "Delegatable with real return — delegate it.",
      delay: "Too much risk or liquidity drag right now — delay.",
      test: "Promising but unproven — test small before committing.",
      invest: "Strong composite — invest.",
      sell: "Better realized as a sale.",
    };
    return `${base} ${verdict[disposition]}`;
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
