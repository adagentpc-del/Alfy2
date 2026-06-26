import {
  RevenueTruthInputSchema,
  RevenueTruthReportSchema,
  type RevenueTruthInput,
  type TruthDeal,
  type RevenueStage,
  type RevenueTruthReport,
} from "@alfy2/shared";

/**
 * The Revenue Truth System (docs/adr/ADR-0101-revenue-truth.md). Prevents fake progress by separating
 * the pipeline into honest stages and never treating activity as revenue: ideas and leads are not
 * money. It prioritizes cash collected, then signed contracts, then invoices sent, then qualified
 * pipeline, then booked calls — and surfaces the closest-to-cash deal as the next money action plus
 * the deals that have stalled. Deterministic. Tenant-scoped.
 */

export class RevenueTruthSystem {
  private readonly reports = new Map<string, RevenueTruthReport>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Produce the honest revenue report — real money first. */
  report(tenantId: string, input: RevenueTruthInput): RevenueTruthReport {
    const i = RevenueTruthInputSchema.parse(input);

    const sumWhere = (pred: (d: TruthDeal) => boolean): number =>
      round(i.deals.filter(pred).reduce((s, d) => s + d.value_usd, 0));

    const cashCollected = sumWhere((d) => d.stage === "cash_collected");
    const signed = sumWhere((d) => d.stage === "signed");
    const invoicesSent = sumWhere((d) => d.stage === "invoice_sent");
    const qualifiedPipeline = sumWhere((d) => QUALIFIED_PIPELINE.has(d.stage));

    // Booked calls ≈ deals that have reached qualification or beyond (a real conversation happened).
    const bookedCalls = i.deals.filter((d) => STAGE_RANK[d.stage] >= STAGE_RANK.qualified).length;

    // Probability-weighted value of everything NOT yet cash. Activity (idea/lead) still only counts at
    // its own probability — it is never treated as collected money.
    const probWeighted = round(
      i.deals
        .filter((d) => d.stage !== "cash_collected")
        .reduce((s, d) => s + d.value_usd * d.probability, 0),
    );

    const stalled = i.deals
      .filter((d) => d.stage !== "cash_collected" && d.days_idle >= i.stalled_after_days)
      .map((d) => d.name);

    // Next money action = the non-collected deal closest to cash (highest stage, then highest value).
    const nonCollected = i.deals.filter((d) => d.stage !== "cash_collected");
    const closest = [...nonCollected].sort(
      (a, b) => STAGE_RANK[b.stage] - STAGE_RANK[a.stage] || b.value_usd - a.value_usd,
    )[0];
    const nextMoneyAction = closest
      ? `Push "${closest.name}" from ${closest.stage} to cash ($${Math.round(closest.value_usd)}).`
      : "No open deals — every deal is collected or there is nothing yet. Create real pipeline.";

    const report = RevenueTruthReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_name: i.business_name,
      cash_collected_usd: cashCollected,
      signed_usd: signed,
      invoices_sent_usd: invoicesSent,
      qualified_pipeline_usd: qualifiedPipeline,
      booked_calls: bookedCalls,
      probability_weighted_pipeline_usd: probWeighted,
      stalled_deals: stalled,
      next_money_action: nextMoneyAction,
      created_at: this.clock().toISOString(),
    });
    this.reports.set(report.id, report);
    return report;
  }

  get(tenantId: string, id: string): RevenueTruthReport | undefined {
    const r = this.reports.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): RevenueTruthReport[] {
    return [...this.reports.values()].filter((r) => r.tenant_id === tenantId);
  }
}

/** The honest ladder, weakest → strongest, as numeric ranks for ordering. */
const STAGE_RANK: Record<RevenueStage, number> = {
  idea: 0,
  lead: 1,
  warm_lead: 2,
  qualified: 3,
  proposal: 4,
  verbal_yes: 5,
  signed: 6,
  invoice_sent: 7,
  cash_collected: 8,
};

const QUALIFIED_PIPELINE: ReadonlySet<RevenueStage> = new Set<RevenueStage>(["qualified", "proposal", "verbal_yes"]);

const round = (n: number): number => Math.round(n * 100) / 100;
