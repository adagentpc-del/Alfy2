import {
  ProjectConsequencesInputSchema,
  ConsequenceProjectionSchema,
  type ProjectConsequencesInput,
  type ConsequenceProjection,
  type HorizonImpact,
  type Horizon,
} from "@alfy2/shared";

/**
 * The Consequence Horizon Engine (docs/adr/ADR-0109-consequence-horizon.md). For every decision Alfy² asks
 * "if Alyssa makes this today, what doors open later?" — projecting value across immediate, 30-day, 90-day,
 * 1-year, and 5-year horizons so the system optimizes for long-term leverage, not just immediate results.
 * Immediate horizons lean on direct value; later horizons lean on compounding. `project()` weights the long
 * tail heavier and recommends accordingly. Deterministic. Tenant-scoped.
 */

export class ConsequenceHorizonEngine {
  private readonly projections = new Map<string, ConsequenceProjection>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Project the decision across five horizons, weight the long tail, and recommend. Persists. */
  project(tenantId: string, input: ProjectConsequencesInput): ConsequenceProjection {
    const i = ProjectConsequencesInputSchema.parse(input);
    const iv = i.immediate_value;
    const c = i.compounding;

    const immediate = clamp01(round(iv));
    const thirtyDay = clamp01(round(iv * 0.9 + c * 0.2));
    const ninetyDay = clamp01(round(iv * 0.7 + c * 0.5));
    const oneYear = clamp01(round(iv * 0.4 + c * 0.9));
    const fiveYear = clamp01(round(c * 1.0));

    const horizons: HorizonImpact[] = [
      { horizon: "immediate", value: immediate, note: noteFor("immediate", immediate) },
      { horizon: "30_day", value: thirtyDay, note: noteFor("30_day", thirtyDay) },
      { horizon: "90_day", value: ninetyDay, note: noteFor("90_day", ninetyDay) },
      { horizon: "1_year", value: oneYear, note: noteFor("1_year", oneYear) },
      { horizon: "5_year", value: fiveYear, note: noteFor("5_year", fiveYear) },
    ];

    const longTermLeverage = clamp01(round(oneYear * 0.4 + fiveYear * 0.6));
    const recommendation =
      longTermLeverage > iv
        ? `Optimize for the doors this opens — long-term leverage (${longTermLeverage}) outweighs the immediate payoff (${iv}); play the compounding game.`
        : `The immediate value (${iv}) leads its long-term leverage (${longTermLeverage}) — capture the near-term win, but don't over-invest beyond it.`;

    const p = ConsequenceProjectionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      decision: i.decision,
      horizons,
      doors_opened: i.doors,
      long_term_leverage: longTermLeverage,
      recommendation,
      created_at: this.clock().toISOString(),
    });
    this.projections.set(p.id, p);
    return p;
  }

  get(tenantId: string, id: string): ConsequenceProjection | undefined {
    const p = this.projections.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): ConsequenceProjection[] {
    return [...this.projections.values()].filter((p) => p.tenant_id === tenantId);
  }
}

const LABELS: Record<Horizon, string> = {
  immediate: "today",
  "30_day": "in 30 days",
  "90_day": "in 90 days",
  "1_year": "in a year",
  "5_year": "in five years",
};

const noteFor = (horizon: Horizon, value: number): string => {
  const strength = value >= 0.66 ? "strong" : value >= 0.33 ? "moderate" : "thin";
  return `${strength} projected value ${LABELS[horizon]} (${value}).`;
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;
