import {
  TwinStateSchema,
  TwinSnapshotSchema,
  TwinSimulationInputSchema,
  TwinSimulationResultSchema,
  type TwinState,
  type TwinSnapshot,
  type TwinSimulationInput,
  type TwinSimulationResult,
} from "@alfy2/shared";

/**
 * The Digital Twin (docs/adr/ADR-0056-digital-twin.md). A continuously-updated model of the enterprise —
 * businesses, finances, assets, contacts, projects, agents, workflows, campaigns, goals, risks — that
 * supports what-if simulations (hire, pause a business, revenue drops 30%, launch an offer) as the basis
 * for forecasting and planning. Deterministic. Tenant-scoped. Snapshots are append-only.
 */

export class DigitalTwin {
  private readonly snapshots = new Map<string, TwinSnapshot[]>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Update the twin with the latest enterprise state (appends a snapshot). */
  update(tenantId: string, state: TwinState): TwinSnapshot {
    const s = TwinStateSchema.parse(state);
    const snap = TwinSnapshotSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      state: s,
      runway_months: runway(s.cash_usd, s.monthly_burn_usd, s.monthly_revenue_usd),
      captured_at: this.clock().toISOString(),
    });
    const list = this.snapshots.get(tenantId) ?? [];
    list.push(snap);
    this.snapshots.set(tenantId, list);
    return snap;
  }

  /** The most recent snapshot. */
  current(tenantId: string): TwinSnapshot | undefined {
    const list = this.snapshots.get(tenantId);
    return list && list.length ? list[list.length - 1] : undefined;
  }

  history(tenantId: string): TwinSnapshot[] {
    return [...(this.snapshots.get(tenantId) ?? [])];
  }

  /** Run a what-if simulation against the current twin state. */
  simulate(tenantId: string, input: TwinSimulationInput): TwinSimulationResult {
    const cur = this.current(tenantId);
    if (!cur) throw new Error(`No twin state for tenant ${tenantId} — update() it first.`);
    const i = TwinSimulationInputSchema.parse(input);
    const base = cur.state;
    let next: TwinState = { ...base };
    let revenueDelta = 0;
    let burnDelta = 0;
    let narrative = "";
    let recommendation = "";

    switch (i.kind) {
      case "hire": {
        burnDelta = i.hire_monthly_cost_usd;
        next = { ...base, monthly_burn_usd: base.monthly_burn_usd + burnDelta, active_agents: base.active_agents };
        narrative = `Adding a hire raises burn by $${Math.round(burnDelta)}/mo.`;
        const hireRunway = runway(next.cash_usd, next.monthly_burn_usd, next.monthly_revenue_usd);
        recommendation = (hireRunway !== null && hireRunway < 6) ? "Runway tightens below 6 months — only hire against committed revenue." : "Runway supports the hire.";
        break;
      }
      case "pause_business": {
        revenueDelta = -i.paused_revenue_usd;
        burnDelta = -i.paused_burn_usd;
        next = { ...base, businesses: Math.max(0, base.businesses - 1), monthly_revenue_usd: Math.max(0, base.monthly_revenue_usd - i.paused_revenue_usd), monthly_burn_usd: Math.max(0, base.monthly_burn_usd - i.paused_burn_usd) };
        narrative = `Pausing a business drops revenue $${Math.round(i.paused_revenue_usd)}/mo and burn $${Math.round(i.paused_burn_usd)}/mo.`;
        recommendation = i.paused_burn_usd >= i.paused_revenue_usd ? "Net-positive to pause — it was burning more than it earned." : "Pausing costs net revenue — keep only if strategically necessary.";
        break;
      }
      case "revenue_drop": {
        const drop = base.monthly_revenue_usd * i.revenue_drop_fraction;
        revenueDelta = -drop;
        next = { ...base, monthly_revenue_usd: Math.max(0, base.monthly_revenue_usd - drop) };
        narrative = `A ${Math.round(i.revenue_drop_fraction * 100)}% revenue drop removes $${Math.round(drop)}/mo.`;
        const r = runway(next.cash_usd, next.monthly_burn_usd, next.monthly_revenue_usd);
        recommendation = r !== null && r < 6 ? `Runway falls to ${r.toFixed(1)} months — build a cash buffer and cut burn now.` : "Survivable — but tighten spend proactively.";
        break;
      }
      case "launch_offer": {
        revenueDelta = i.offer_monthly_revenue_usd;
        burnDelta = i.offer_monthly_cost_usd;
        next = { ...base, monthly_revenue_usd: base.monthly_revenue_usd + i.offer_monthly_revenue_usd, monthly_burn_usd: base.monthly_burn_usd + i.offer_monthly_cost_usd, active_campaigns: base.active_campaigns + 1 };
        narrative = `Launching the offer adds $${Math.round(i.offer_monthly_revenue_usd)}/mo revenue at $${Math.round(i.offer_monthly_cost_usd)}/mo cost.`;
        recommendation = i.offer_monthly_revenue_usd > i.offer_monthly_cost_usd ? "Net-positive — launch it." : "Net-negative at these assumptions — refine the offer or cost first.";
        break;
      }
    }

    return TwinSimulationResultSchema.parse({
      kind: i.kind,
      projected_state: next,
      projected_runway_months: runway(next.cash_usd, next.monthly_burn_usd, next.monthly_revenue_usd),
      revenue_delta_usd: round(revenueDelta),
      burn_delta_usd: round(burnDelta),
      narrative,
      recommendation: typeof recommendation === "string" ? recommendation : "See projection.",
    });
  }
}

/** Runway in months = cash / (burn − revenue); null if not net-burning. */
const runway = (cash: number, burn: number, revenue: number): number | null => {
  const net = burn - revenue;
  return net > 0 ? round(cash / net) : null;
};
const round = (n: number): number => Math.round(n * 100) / 100;
