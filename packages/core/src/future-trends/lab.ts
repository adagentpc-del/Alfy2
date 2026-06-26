import {
  TrackTrendInputSchema,
  TrendSchema,
  type TrackTrendInput,
  type Trend,
  type TrendHorizon,
} from "@alfy2/shared";

/**
 * The Future Trends Lab (docs/adr/ADR-0068-failure-trends.md). Tracks developments over 6mo / 1yr / 3yr /
 * 5yr / 10yr horizons with likelihood, impact, affected industries and businesses, and — generated
 * deterministically from the trend name, horizon, and impact — preparation steps, skills needed,
 * technology needed, investment opportunities, potential threats, and a readiness score (likelihood ×
 * impact). Prepares Alyssa before everyone else. Deterministic. Tenant-scoped.
 */

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Higher-impact trends warrant longer preparation lists. */
const depthFor = (impact: number): number => (impact >= 0.75 ? 4 : impact >= 0.5 ? 3 : impact >= 0.25 ? 2 : 1);

const HORIZON_LABEL: Record<TrendHorizon, string> = {
  "6_months": "the next 6 months",
  "1_year": "the next year",
  "3_years": "the next 3 years",
  "5_years": "the next 5 years",
  "10_years": "the next decade",
};

export class FutureTrendsLab {
  private readonly trends = new Map<string, Trend>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Track a trend, generating preparation guidance and a readiness score. */
  track(tenantId: string, input: TrackTrendInput): Trend {
    const i = TrackTrendInputSchema.parse(input);
    const depth = depthFor(i.impact);
    const horizon = HORIZON_LABEL[i.horizon];

    const preparation_steps = [
      `Monitor "${i.name}" signals over ${horizon}.`,
      `Brief the executive on how "${i.name}" affects the portfolio.`,
      `Run a what-if simulation for "${i.name}".`,
      `Allocate a small budget to experiment with "${i.name}".`,
    ].slice(0, depth);

    const skills_needed = [
      `Literacy in ${i.name}`,
      `Strategic planning for ${horizon}`,
      `Rapid experimentation`,
      `Change management`,
    ].slice(0, depth);

    const technology_needed = [
      `Tooling to track ${i.name}`,
      `A sandbox to pilot ${i.name}`,
      `Analytics to measure ${i.name} impact`,
    ].slice(0, Math.min(depth, 3));

    const investment_opportunities = [
      `Early position in ${i.name}`,
      `Partnerships with ${i.name} leaders`,
      `Build an offer around ${i.name}`,
    ].slice(0, Math.min(depth, 3));

    const potential_threats = [
      `Competitors adopting ${i.name} first`,
      `Disruption to existing revenue from ${i.name}`,
      `Regulatory or compliance shifts around ${i.name}`,
    ].slice(0, Math.min(depth, 3));

    const trend = TrendSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      name: i.name,
      horizon: i.horizon,
      description: i.description,
      likelihood: i.likelihood,
      impact: i.impact,
      industries_affected: i.industries_affected,
      businesses_affected: i.businesses_affected,
      preparation_steps,
      skills_needed,
      technology_needed,
      investment_opportunities,
      potential_threats,
      readiness_score: round(i.likelihood * i.impact),
      created_at: this.clock().toISOString(),
    });
    this.trends.set(trend.id, trend);
    return trend;
  }

  list(tenantId: string): Trend[] {
    return [...this.trends.values()].filter((t) => t.tenant_id === tenantId);
  }

  /** Trends on a given horizon. */
  byHorizon(tenantId: string, horizon: TrendHorizon): Trend[] {
    return this.list(tenantId).filter((t) => t.horizon === horizon);
  }

  /** The top-n trends by readiness score (highest first). */
  topByReadiness(tenantId: string, n = 5): Trend[] {
    return this.list(tenantId)
      .slice()
      .sort((a, b) => b.readiness_score - a.readiness_score)
      .slice(0, n);
  }
}
