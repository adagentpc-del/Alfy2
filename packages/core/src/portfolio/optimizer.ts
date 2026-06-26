import {
  AnalyzePortfolioInputSchema,
  PortfolioReportSchema,
  type AnalyzePortfolioInput,
  type PortfolioReport,
  type PortfolioMetrics,
  type BusinessAssessment,
  type PortfolioRecommendation,
} from "@alfy2/shared";

/**
 * The Strategic Portfolio Optimizer (docs/adr/ADR-0029-strategic-portfolio-optimizer.md). It analyzes
 * all businesses together, scoring each across ten dimensions, ranks them by a composite attractiveness
 * score, and recommends focus now / delegate / automate / pause / kill / package for sale.
 * Deterministic. Tenant-scoped.
 */

export interface PortfolioOptimizerOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const avg = (xs: number[]): number => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/** Average of the five upside dimensions (higher is better). */
export function upsideScore(m: PortfolioMetrics): number {
  return round2(avg([m.revenue_potential, m.speed_to_cash, m.strategic_value, m.current_traction, m.monetization_path]));
}

/** Composite attractiveness: upside, minus half the cost dimensions' drag. */
export function compositeScore(m: PortfolioMetrics): number {
  const drag = avg([m.effort_required, m.stress_cost, m.operational_drag, m.capital_required, m.team_dependency]);
  return round2(Math.max(0, Math.min(1, upsideScore(m) - drag * 0.5)));
}

/**
 * Decide the recommendation. focus_now and kill key off the (drag-penalized) composite; delegate,
 * automate, and package_for_sale key off the upside + the offending cost dimension — because a business
 * worth delegating is precisely one whose upside is real but whose drag (you-dependency) is the problem.
 */
export function recommendFor(m: PortfolioMetrics, score: number): { recommendation: PortfolioRecommendation; rationale: string } {
  const r2 = (n: number) => round2(n);
  const upside = upsideScore(m);

  // Strong + real traction → focus now.
  if (score >= 0.55 && m.current_traction >= 0.5) {
    return { recommendation: "focus_now", rationale: `High composite (${r2(score)}) with real traction — focus here now.` };
  }
  // Monetizable but off-strategy with little traction → package for sale (checked before delegate).
  if (m.monetization_path >= 0.6 && m.strategic_value <= 0.4 && m.current_traction <= 0.4) {
    return { recommendation: "package_for_sale", rationale: `Monetizable but off-strategy with little traction — package it for sale.` };
  }
  // Real upside but too dependent on you (team/stress/effort) → delegate.
  if (upside >= 0.45 && (m.team_dependency >= 0.6 || m.stress_cost >= 0.6 || m.effort_required >= 0.6)) {
    return { recommendation: "delegate", rationale: `Real upside (${r2(upside)}) but too dependent on you (team/stress/effort) — delegate it.` };
  }
  // Decent upside dragged down by operational overhead → automate.
  if (m.operational_drag >= 0.6 && upside >= 0.35) {
    return { recommendation: "automate", rationale: `Usable upside (${r2(upside)}) with high operational drag — automate the workflow before scaling.` };
  }
  // Weak across the board → kill.
  if (score <= 0.2 && m.revenue_potential <= 0.4 && m.strategic_value <= 0.4) {
    return { recommendation: "kill", rationale: `Low composite (${r2(score)}), low revenue and strategic value — kill it to free capacity.` };
  }
  // Otherwise marginal → pause and revisit.
  return { recommendation: "pause", rationale: `Marginal composite (${r2(score)}) — pause and revisit when capacity frees up.` };
}

export class PortfolioOptimizer {
  private readonly reports = new Map<string, PortfolioReport>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: PortfolioOptimizerOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Analyze all businesses together; return a ranked report with a recommendation per business. */
  analyze(tenantId: string, input: AnalyzePortfolioInput): PortfolioReport {
    const i = AnalyzePortfolioInputSchema.parse(input);
    const assessments: BusinessAssessment[] = i.businesses
      .map((b) => {
        const score = compositeScore(b.metrics);
        const { recommendation, rationale } = recommendFor(b.metrics, score);
        return { business_name: b.business_name, metrics: b.metrics, score, recommendation, rationale };
      })
      .sort((a, b) => b.score - a.score);

    const focus = assessments.filter((a) => a.recommendation === "focus_now").map((a) => a.business_name);
    const cut = assessments.filter((a) => a.recommendation === "kill" || a.recommendation === "package_for_sale");
    const summary =
      `${assessments.length} business${assessments.length === 1 ? "" : "es"} analyzed. ` +
      (focus.length ? `Focus now: ${focus.join(", ")}. ` : "") +
      (cut.length ? `Consider exiting: ${cut.map((a) => `${a.business_name} (${a.recommendation.replace(/_/g, " ")})`).join(", ")}. ` : "") +
      `Ranked by composite attractiveness.`;

    const report: PortfolioReport = PortfolioReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      generated_at: this.clock().toISOString(),
      assessments,
      summary,
    });
    this.reports.set(report.id, report);
    return report;
  }

  get(tenantId: string, id: string): PortfolioReport | undefined {
    const r = this.reports.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): PortfolioReport[] {
    return [...this.reports.values()].filter((r) => r.tenant_id === tenantId);
  }
}
