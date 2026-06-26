import {
  CapitalReportInputSchema,
  CapitalReportSchema,
  type CapitalReportInput,
  type CapitalReport,
  type CapitalType,
} from "@alfy2/shared";

/**
 * The Capital Engine (docs/adr/ADR-0108-capital-engine.md). Alfy² optimizes for lifetime capital
 * accumulation across ten forms — financial, knowledge, relationship, reputation, operational, technology,
 * automation, intellectual property, health/energy, freedom — rather than short-term activity. For every
 * recommendation `report()` shows which capital grows or depletes, the net change, the compounding effect,
 * the payoff horizon, and plausible conversion paths into other forms. Deterministic. Tenant-scoped.
 */

const CAPITAL_TYPES: CapitalType[] = [
  "financial",
  "knowledge",
  "relationship",
  "reputation",
  "operational",
  "technology",
  "automation",
  "intellectual_property",
  "health_energy",
  "freedom",
];

/** Templated conversion chains, keyed by the capital that increased. */
const CONVERSION_PATHS: Record<CapitalType, string> = {
  financial: "financial → runway → bigger bets → assets → freedom",
  knowledge: "knowledge → better decisions → operational leverage → revenue → freedom",
  relationship: "relationships → trust → deals → revenue → freedom",
  reputation: "reputation → relationships → clients → revenue → freedom",
  operational: "operational → reliability → capacity → revenue → freedom",
  technology: "technology → automation → time saved → leverage → freedom",
  automation: "automation → time saved → reinvestment → revenue → freedom",
  intellectual_property: "IP → licensing → revenue → freedom",
  health_energy: "health/energy → sustained output → compounding execution → freedom",
  freedom: "freedom → focus → highest-leverage work → more freedom",
};

export class CapitalEngine {
  private readonly reports = new Map<string, CapitalReport>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Report how a recommendation moves every form of capital, and how that capital can convert. Persists. */
  report(tenantId: string, input: CapitalReportInput): CapitalReport {
    const i = CapitalReportInputSchema.parse(input);
    const increases = CAPITAL_TYPES.filter((t) => i.deltas[t] > 0);
    const decreases = CAPITAL_TYPES.filter((t) => i.deltas[t] < 0);
    const netCapital = clamp(round(sum(CAPITAL_TYPES.map((t) => i.deltas[t])) / 10), -1, 1);
    const conversionPaths = increases.map((t) => CONVERSION_PATHS[t]);

    const r = CapitalReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      recommendation: i.recommendation,
      deltas: i.deltas,
      increases,
      decreases,
      net_capital: netCapital,
      compounding: i.compounding,
      payoff_months: i.payoff_months,
      conversion_paths: conversionPaths,
      created_at: this.clock().toISOString(),
    });
    this.reports.set(r.id, r);
    return r;
  }

  get(tenantId: string, id: string): CapitalReport | undefined {
    const r = this.reports.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): CapitalReport[] {
    return [...this.reports.values()].filter((r) => r.tenant_id === tenantId);
  }

  /** The recommendations that built the most net capital, highest first. */
  topByNet(tenantId: string): CapitalReport[] {
    return this.list(tenantId).sort((a, b) => b.net_capital - a.net_capital);
  }
}

const sum = (xs: number[]): number => xs.reduce((acc, x) => acc + x, 0);
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;
