import {
  CreateDealInputSchema,
  DealSchema,
  DealDeskViewSchema,
  RankedDealSchema,
  type CreateDealInput,
  type Deal,
  type DealDeskView,
  type DealRankBy,
  type RankedDeal,
} from "@alfy2/shared";

/**
 * The Deal Desk (docs/adr/ADR-0043-deal-desk.md). One record per opportunity with the full deal context,
 * ranked by probability, revenue, speed, strategic value, or effort — always surfacing the next money
 * move, the blocked deals (missing assets or a hard objection), and the deals likely to die without
 * action (high risk or idle past threshold). Deterministic. Tenant-scoped.
 */

export class DealDeskError extends Error {}

const OPEN_STAGES: ReadonlySet<Deal["stage"]> = new Set<Deal["stage"]>(["new", "qualifying", "proposal", "negotiation", "verbal"]);

export interface DealDeskOptions {
  clock?: () => Date;
  idFactory?: () => string;
  /** Idle days after which an open deal is "likely to die". Default 14. */
  dieAfterDays?: number;
  /** Risk at/above which an open deal is "likely to die". Default 0.6. */
  dieRiskThreshold?: number;
}

export class DealDesk {
  private readonly deals = new Map<string, Deal>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly dieAfterDays: number;
  private readonly dieRisk: number;

  constructor(options: DealDeskOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.dieAfterDays = options.dieAfterDays ?? 14;
    this.dieRisk = options.dieRiskThreshold ?? 0.6;
  }

  /** Add an opportunity to the desk. */
  add(tenantId: string, input: CreateDealInput): Deal {
    const i = CreateDealInputSchema.parse(input);
    const now = this.clock().toISOString();
    const deal = DealSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      created_at: now,
      updated_at: now,
      ...i,
    });
    this.deals.set(deal.id, deal);
    return deal;
  }

  /** Update fields on a deal. */
  update(tenantId: string, id: string, patch: Partial<CreateDealInput>): Deal {
    const cur = this.require(tenantId, id);
    const next = DealSchema.parse({ ...cur, ...patch, updated_at: this.clock().toISOString() });
    this.deals.set(next.id, next);
    return next;
  }

  get(tenantId: string, id: string): Deal | undefined {
    const d = this.deals.get(id);
    return d && d.tenant_id === tenantId ? d : undefined;
  }

  /** Rank open deals by the chosen axis (default composite). */
  rank(tenantId: string, by: DealRankBy | "composite" = "composite"): RankedDeal[] {
    const open = this.openDeals(tenantId);
    const ranked = open.map((d) => this.score(d));
    ranked.sort((a, b) => this.axis(b, by) - this.axis(a, by));
    return ranked;
  }

  /** The full desk view: ranked deals, next money move, blocked, and dying deals. */
  view(tenantId: string): DealDeskView {
    const ranked = this.rank(tenantId, "composite");
    const open = this.openDeals(tenantId);
    const blocked = open.filter((d) => d.missing_assets.length > 0 || d.objections.length > 0);
    const dying = open.filter((d) => d.risk >= this.dieRisk || d.days_since_activity >= this.dieAfterDays);
    const weighted = open.reduce((s, d) => s + d.deal_size_usd * d.probability, 0);

    const top = ranked[0];
    const nextMove = top
      ? `${top.deal.next_step || "Advance"} — ${top.deal.buyer_contact} for "${top.deal.offer}" ($${Math.round(top.deal.deal_size_usd)}, ${Math.round(top.deal.probability * 100)}%)`
      : "No open deals — add opportunities to surface the next money move.";

    return DealDeskViewSchema.parse({
      ranked,
      next_money_move: nextMove,
      blocked_deals: blocked,
      deals_likely_to_die: dying,
      weighted_pipeline_usd: weighted,
      generated_at: this.clock().toISOString(),
    });
  }

  // --- internals ---

  private openDeals(tenantId: string): Deal[] {
    return [...this.deals.values()].filter((d) => d.tenant_id === tenantId && OPEN_STAGES.has(d.stage));
  }

  private score(d: Deal): RankedDeal {
    const ev = d.deal_size_usd * d.probability;
    // Composite favours expected value and strategic value and speed, penalizes effort and risk.
    const speed = 1 / (1 + d.days_since_activity / 30); // fresher = faster
    const evNorm = ev / 100_000; // scale to a comparable band
    const composite = evNorm + d.strategic_value * 0.5 + speed * 0.3 - d.effort * 0.3 - d.risk * 0.4;
    const reason = d.missing_assets.length
      ? `Blocked on: ${d.missing_assets.join(", ")}`
      : d.risk >= this.dieRisk || d.days_since_activity >= this.dieAfterDays
        ? "At risk of dying — needs action now"
        : `Expected value $${Math.round(ev)} at ${Math.round(d.probability * 100)}%`;
    return RankedDealSchema.parse({ deal: d, expected_value_usd: ev, composite_score: round(composite), reason });
  }

  private axis(r: RankedDeal, by: DealRankBy | "composite"): number {
    switch (by) {
      case "probability": return r.deal.probability;
      case "revenue": return r.deal.deal_size_usd;
      case "speed": return 1 / (1 + r.deal.days_since_activity / 30);
      case "strategic_value": return r.deal.strategic_value;
      case "effort": return 1 - r.deal.effort; // lower effort ranks higher
      case "composite": default: return r.composite_score;
    }
  }

  private require(tenantId: string, id: string): Deal {
    const d = this.get(tenantId, id);
    if (!d) throw new DealDeskError(`No deal ${id} in tenant ${tenantId}.`);
    return d;
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
