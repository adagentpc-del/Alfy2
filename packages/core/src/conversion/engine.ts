import {
  ConversionProfileSchema,
  StartTestInputSchema,
  TestResultInputSchema,
  type ConversionProfile,
  type StartTestInput,
  type TestResultInput,
  type ConversionTest,
  type ConversionSurface,
  type VariantKeyConv,
} from "@alfy2/shared";

/**
 * The Conversion Engine (docs/adr/ADR-0032-conversion-engine.md). Tracks and improves the surfaces that
 * turn attention into revenue and maintains a per-business profile: baseline, active tests, winning and
 * losing copy, objections, best offers, and the next optimization. Crucially, A/B winners are decided
 * by REVENUE PER UNIT (conversion × value), not vanity conversion — the goal is revenue. Deterministic.
 * Tenant-scoped.
 */

export class ConversionEngineError extends Error {}

export interface ConversionEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

export class ConversionEngine {
  private readonly profiles = new Map<string, ConversionProfile>();
  /** tenant|business_name → profile id. */
  private readonly byBusiness = new Map<string, string>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: ConversionEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Get or create the conversion profile for a business. */
  profileFor(tenantId: string, businessName: string, businessId: string | null = null): ConversionProfile {
    const key = `${tenantId}|${businessName}`;
    const existing = this.byBusiness.get(key);
    if (existing) return this.profiles.get(existing)!;
    const now = this.clock().toISOString();
    const profile = ConversionProfileSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_id: businessId,
      business_name: businessName,
      created_at: now,
      updated_at: now,
    });
    this.profiles.set(profile.id, profile);
    this.byBusiness.set(key, profile.id);
    return profile;
  }

  /** Set the conversion baseline (revenue per unit, with the raw conversion alongside). */
  setBaseline(tenantId: string, businessName: string, conversion: number, revenuePerUnitUsd: number): ConversionProfile {
    const p = this.profileFor(tenantId, businessName);
    return this.save({ ...p, baseline_conversion: conversion, baseline_revenue_per_unit_usd: revenuePerUnitUsd });
  }

  /** Start an A/B test on a surface (added to active_tests). */
  startTest(tenantId: string, businessName: string, input: StartTestInput): ConversionTest {
    const i = StartTestInputSchema.parse(input);
    const p = this.profileFor(tenantId, businessName);
    const test: ConversionTest = {
      id: this.newId(),
      surface: i.surface,
      hypothesis: i.hypothesis,
      variant_a: i.variant_a,
      variant_b: i.variant_b,
      status: "active",
      winner: null,
      revenue_per_unit_a_usd: 0,
      revenue_per_unit_b_usd: 0,
      conversion_a: 0,
      conversion_b: 0,
      created_at: this.clock().toISOString(),
    };
    this.save({ ...p, active_tests: [...p.active_tests, test] });
    return test;
  }

  /**
   * Record a test's results and resolve it BY REVENUE PER UNIT (not raw conversion). The winner's copy
   * goes to winning_copy, the loser's to losing_copy, the baseline lifts if beaten, and a next
   * optimization is set. Returns the updated profile.
   */
  recordResult(tenantId: string, businessName: string, testId: string, result: TestResultInput): ConversionProfile {
    const p = this.profileFor(tenantId, businessName);
    const test = p.active_tests.find((t) => t.id === testId);
    if (!test) throw new ConversionEngineError(`No active test ${testId} for ${businessName}.`);
    const r = TestResultInputSchema.parse(result);

    // Decide by revenue per unit; fall back to conversion if neither has revenue.
    const rpuA = r.revenue_per_unit_a_usd;
    const rpuB = r.revenue_per_unit_b_usd;
    const metricA = rpuA > 0 || rpuB > 0 ? rpuA : r.conversion_a;
    const metricB = rpuA > 0 || rpuB > 0 ? rpuB : r.conversion_b;
    let winner: VariantKeyConv | null = null;
    let status: ConversionTest["status"] = "inconclusive";
    if (metricA !== metricB) {
      winner = metricA > metricB ? "A" : "B";
      status = "won";
    }

    const resolved: ConversionTest = {
      ...test,
      status,
      winner,
      conversion_a: r.conversion_a,
      conversion_b: r.conversion_b,
      revenue_per_unit_a_usd: rpuA,
      revenue_per_unit_b_usd: rpuB,
    };

    const winText = winner === "A" ? test.variant_a : winner === "B" ? test.variant_b : null;
    const loseText = winner === "A" ? test.variant_b : winner === "B" ? test.variant_a : null;
    const winRpu = winner === "A" ? rpuA : rpuB;
    const winConv = winner === "A" ? r.conversion_a : r.conversion_b;
    const loseRpu = winner === "A" ? rpuB : rpuA;
    const loseConv = winner === "A" ? r.conversion_b : r.conversion_a;

    const winning_copy = winText
      ? [...p.winning_copy, { surface: test.surface, text: winText, conversion_rate: winConv, revenue_per_unit_usd: winRpu }]
      : p.winning_copy;
    const losing_copy = loseText
      ? [...p.losing_copy, { surface: test.surface, text: loseText, conversion_rate: loseConv, revenue_per_unit_usd: loseRpu }]
      : p.losing_copy;

    // Lift the baseline if the winner beats it (on revenue per unit).
    const beatsBaseline = winRpu > p.baseline_revenue_per_unit_usd;
    const baseline_revenue_per_unit_usd = beatsBaseline ? round4(winRpu) : p.baseline_revenue_per_unit_usd;
    const baseline_conversion = beatsBaseline ? round4(winConv) : p.baseline_conversion;

    const next_optimization = winner
      ? `Iterate on the winning ${surfaceLabel(test.surface)} ("${truncate(winText!)}") — test the next-highest-leverage element.`
      : `${surfaceLabel(test.surface)} test was inconclusive — re-run with a sharper hypothesis or more volume.`;

    return this.save({
      ...p,
      active_tests: p.active_tests.filter((t) => t.id !== testId),
      winning_copy,
      losing_copy,
      baseline_revenue_per_unit_usd,
      baseline_conversion,
      next_optimization,
    });
  }

  /** Record an objection raised on a surface. */
  addObjection(tenantId: string, businessName: string, objection: string): ConversionProfile {
    const p = this.profileFor(tenantId, businessName);
    if (p.objections.includes(objection)) return p;
    return this.save({ ...p, objections: [...p.objections, objection] });
  }

  /** Record/replace an offer's performance (kept sorted by revenue, best first). */
  recordOffer(tenantId: string, businessName: string, offer: { name: string; conversion_rate: number; revenue_usd: number }): ConversionProfile {
    const p = this.profileFor(tenantId, businessName);
    const best_offers = [...p.best_offers.filter((o) => o.name !== offer.name), offer].sort((a, b) => b.revenue_usd - a.revenue_usd);
    return this.save({ ...p, best_offers });
  }

  get(tenantId: string, id: string): ConversionProfile | undefined {
    const p = this.profiles.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): ConversionProfile[] {
    return [...this.profiles.values()].filter((p) => p.tenant_id === tenantId);
  }

  private save(p: ConversionProfile): ConversionProfile {
    const next = ConversionProfileSchema.parse({ ...p, updated_at: this.clock().toISOString() });
    this.profiles.set(next.id, next);
    return next;
  }
}

function surfaceLabel(s: ConversionSurface): string {
  return s.replace(/_/g, " ");
}
const truncate = (s: string): string => (s.length > 40 ? `${s.slice(0, 37)}...` : s);
