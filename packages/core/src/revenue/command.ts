import {
  RevenueProfileInputSchema,
  RevenueIntelSchema,
  type RevenueProfileInput,
  type RevenueIntel,
  type PipelineDeal,
  type CashOpportunity,
} from "@alfy2/shared";

/**
 * The Revenue Command System (docs/adr/ADR-0034-revenue-command-system.md). Every business carries
 * offers, pricing, a pipeline, leads, conversion rates, follow-ups, campaigns, cash opportunities, and
 * revenue goals. From that snapshot the engine computes what Alfy² must always know: the fastest path to
 * cash, the easiest offer to sell, the best current lead source, the highest-ROI campaign, the stuck
 * deals, and the next money action. Deterministic. Tenant-scoped.
 */

export interface RevenueCommandOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

const round0 = (n: number): number => Math.round(n);

/** Cash velocity of a deal/opportunity: expected value per day to close. */
const dealVelocity = (d: PipelineDeal): number => (d.value_usd * d.probability) / Math.max(1, d.days_to_close);
const cashVelocity = (c: CashOpportunity): number => (c.value_usd * c.probability) / Math.max(1, c.days_to_cash);

export class RevenueCommandSystem {
  private readonly snapshots = new Map<string, RevenueIntel>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: RevenueCommandOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Compute the revenue intelligence for a business from its snapshot. */
  intel(tenantId: string, input: RevenueProfileInput): RevenueIntel {
    const i = RevenueProfileInputSchema.parse(input);

    // Fastest path to cash: the deal or cash opportunity with the highest expected value per day.
    const dealCandidates = i.pipeline.map((d) => ({ label: `Close ${d.name} ($${round0(d.value_usd)}, ${Math.round(d.probability * 100)}% in ${d.days_to_close}d)`, v: dealVelocity(d) }));
    const cashCandidates = i.cash_opportunities.map((c) => ({ label: `${c.description} ($${round0(c.value_usd)} in ${c.days_to_cash}d)`, v: cashVelocity(c) }));
    const fastest = [...dealCandidates, ...cashCandidates].sort((a, b) => b.v - a.v)[0];
    const fastest_path_to_cash = fastest ? fastest.label : "No live deals or cash opportunities — generate pipeline.";

    // Easiest offer to sell: highest conversion rate.
    const easiestOffer = [...i.offers].sort((a, b) => b.conversion_rate - a.conversion_rate)[0];
    const easiest_offer_to_sell = easiestOffer
      ? `${easiestOffer.name} (${Math.round(easiestOffer.conversion_rate * 100)}% conversion, $${round0(easiestOffer.price_usd)})`
      : "No offers defined.";

    // Best lead source: highest conversion × volume.
    const bestLead = [...i.leads].sort((a, b) => b.conversion_rate * b.leads - a.conversion_rate * a.leads)[0];
    const best_lead_source = bestLead
      ? `${bestLead.name} (${Math.round(bestLead.conversion_rate * 100)}% of ${bestLead.leads} leads)`
      : "No lead sources tracked.";

    // Highest-ROI campaign.
    const bestCampaign = [...i.campaigns].filter((c) => c.roi !== null).sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))[0];
    const highest_roi_campaign = bestCampaign ? `${bestCampaign.name} (ROI ${bestCampaign.roi}x)` : "No campaigns with measured ROI.";

    // Stuck deals: idle beyond the threshold.
    const stuck_deals = i.pipeline
      .filter((d) => d.idle_days >= i.stuck_after_days)
      .sort((a, b) => b.value_usd - a.value_usd)
      .map((d) => `${d.name} (idle ${d.idle_days} days, $${round0(d.value_usd)})`);

    // Weighted pipeline + cash.
    const weighted_pipeline_usd = round0(
      i.pipeline.reduce((s, d) => s + d.value_usd * d.probability, 0) + i.cash_opportunities.reduce((s, c) => s + c.value_usd * c.probability, 0),
    );

    // Next money action: pull the fastest cash forward, or unstick the biggest stuck deal, or build pipeline.
    const next_money_action = fastest
      ? `Advance "${fastest.label}" today — it's the fastest expected cash.`
      : stuck_deals.length
        ? `Unstick ${stuck_deals[0]} — it's the largest idle deal.`
        : "Generate pipeline: launch the easiest offer to the best lead source.";

    const intel: RevenueIntel = RevenueIntelSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_name: i.business_name,
      generated_at: this.clock().toISOString(),
      fastest_path_to_cash,
      easiest_offer_to_sell,
      best_lead_source,
      highest_roi_campaign,
      stuck_deals,
      next_money_action,
      weighted_pipeline_usd,
      revenue_goal_usd: i.revenue_goal_usd,
    });
    this.snapshots.set(intel.id, intel);
    return intel;
  }

  get(tenantId: string, id: string): RevenueIntel | undefined {
    const s = this.snapshots.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  list(tenantId: string): RevenueIntel[] {
    return [...this.snapshots.values()].filter((s) => s.tenant_id === tenantId);
  }
}
