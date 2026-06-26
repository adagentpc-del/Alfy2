import {
  RevenueFactoryInputSchema,
  RevenueFactoryReportSchema,
  type RevenueFactoryInput,
  type RevenueFactoryReport,
} from "@alfy2/shared";

/**
 * The Revenue Factory (docs/adr/ADR-0041-revenue-factory.md). Turns goals, assets, contacts, and ideas
 * into money. For a business it reads offers, pricing, buyers, warm/cold leads, referral sources,
 * proposals, follow-ups, campaigns, conversion rates, booked calls, and revenue, and answers the one
 * question that matters: "what do we do today to make money?" Deterministic. Tenant-scoped (the report
 * is computed per call; nothing is persisted in-engine beyond the latest per-business snapshot).
 */

export class RevenueFactory {
  private readonly latest = new Map<string, RevenueFactoryReport>();
  private readonly clock: () => Date;

  constructor(options: { clock?: () => Date } = {}) {
    this.clock = options.clock ?? (() => new Date());
  }

  /** Compute the daily money directive for a business. */
  report(tenantId: string, input: RevenueFactoryInput): RevenueFactoryReport {
    const i = RevenueFactoryInputSchema.parse(input);

    // Easiest offer to sell = highest ease, tie-broken by conversion.
    const easiestOffer = [...i.offers].sort((a, b) => (b.ease - a.ease) || (b.conversion_rate - a.conversion_rate))[0];
    // Offer most likely to convert = highest conversion rate.
    const convertOffer = [...i.offers].sort((a, b) => b.conversion_rate - a.conversion_rate)[0];
    // Best warm contact = warm, highest affinity × potential value.
    const warm = i.contacts.filter((c) => c.temperature === "warm");
    const bestWarm = [...warm].sort((a, b) => (b.affinity * b.potential_value_usd) - (a.affinity * a.potential_value_usd))[0];
    // Lowest-effort revenue action = follow-up with least effort, tie-broken by value.
    const lowEffort = [...i.follow_ups].sort((a, b) => (a.effort - b.effort) || (b.value_usd - a.value_usd))[0];
    // Highest-value follow-up = max value.
    const highValueFu = [...i.follow_ups].sort((a, b) => b.value_usd - a.value_usd)[0];
    // Fastest path to cash = highest expected value across proposals (value×probability), favouring older
    // (more decision-ready) ones, plus the best warm contact's expected value.
    const proposalCandidates = i.proposals.map((p) => ({
      label: `Close proposal to ${p.contact_name} for "${p.offer_name}" ($${Math.round(p.value_usd)})`,
      ev: p.value_usd * p.probability,
    }));
    const warmCandidate = bestWarm
      ? { label: `Pitch ${bestWarm.name} the ${easiestOffer?.name ?? "core offer"}`, ev: bestWarm.affinity * bestWarm.potential_value_usd }
      : null;
    const fastest = [...proposalCandidates, ...(warmCandidate ? [warmCandidate] : [])].sort((a, b) => b.ev - a.ev)[0];

    // Today's money move: the single highest-leverage action available.
    const todays = fastest?.label
      ?? (lowEffort ? `Send the follow-up to ${lowEffort.contact_name}` : null)
      ?? (easiestOffer ? `Sell the ${easiestOffer.name}` : "Add offers, leads, or proposals to surface a money move.");

    const report = RevenueFactoryReportSchema.parse({
      business_name: i.business_name,
      fastest_path_to_cash: fastest?.label ?? "",
      easiest_offer_to_sell: easiestOffer?.name ?? null,
      best_warm_contact: bestWarm?.name ?? null,
      lowest_effort_revenue_action: lowEffort ? `Follow up with ${lowEffort.contact_name} (effort ${lowEffort.effort})` : null,
      highest_value_follow_up: highValueFu ? `${highValueFu.contact_name} ($${Math.round(highValueFu.value_usd)})` : null,
      offer_most_likely_to_convert: convertOffer?.name ?? null,
      todays_money_move: todays,
      warm_lead_count: warm.length,
      cold_lead_count: i.contacts.filter((c) => c.temperature === "cold").length,
      referral_source_count: i.contacts.filter((c) => c.is_referral_source).length,
      open_proposal_value_usd: i.proposals.reduce((s, p) => s + p.value_usd, 0),
      generated_at: this.clock().toISOString(),
    });
    this.latest.set(`${tenantId}|${i.business_name}`, report);
    return report;
  }

  /** The last computed report for a business (if any). */
  lastReport(tenantId: string, businessName: string): RevenueFactoryReport | undefined {
    return this.latest.get(`${tenantId}|${businessName}`);
  }
}
