import {
  RevOpsBriefSchema,
  FastestPathPlanSchema,
  type RevOpsBrief,
  type RevOpsMoneyAction,
  type RevOpsStalledDeal,
  type RevOpsTopOpportunity,
  type FastestPathPlan,
  type FastestPathStep,
} from "@alfy2/shared";
import type {
  RevOpsReadModel,
  RevOpsAggregate,
  RevOpsOpportunity,
  RevOpsActionRow,
} from "./read-model.js";

/** Statuses that take an opportunity out of the open pipeline. */
const CLOSED_OPP_STATUSES: ReadonlySet<string> = new Set(["closed_won", "closed_lost", "dead"]);
/** Statuses that take a money action out of the "due" set. */
const DONE_ACTION_STATUSES: ReadonlySet<string> = new Set(["done", "closed", "cancelled"]);

/** An opportunity is "stalled" once it has not been updated in this many days. */
const STALL_THRESHOLD_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** How many top opportunities the brief surfaces. */
const TOP_OPPORTUNITY_LIMIT = 5;

export interface RevOpsEngineOptions {
  /** Injectable clock (defaults to wall-clock). Used for created_at. */
  clock?: () => Date;
  /** Injectable id factory (defaults to crypto.randomUUID). */
  idFactory?: () => string;
  /** Injectable "now" in epoch ms (defaults to clock()). Drives due/stall comparisons. */
  nowMs?: () => number;
}

export interface FastestPathInput {
  target_usd: number;
  business?: string;
}

/**
 * Deterministic RevOps engine. Reads the world through {@link RevOpsReadModel} and produces a revenue
 * {@link RevOpsBrief} and a greedy {@link FastestPathPlan}. No I/O beyond the injected read-model; the
 * clock, id factory, and now-ms are injectable so runs are reproducible. Output is always parsed through
 * the Zod contract before it leaves the engine.
 */
export class RevOpsEngine {
  private readonly clock: () => Date;
  private readonly idFactory: () => string;
  private readonly nowMs: () => number;

  constructor(
    private readonly readModel: RevOpsReadModel,
    options: RevOpsEngineOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
    this.nowMs = options.nowMs ?? (() => this.clock().getTime());
  }

  /** Open = status not in {closed_won, closed_lost, dead}. */
  private isOpen(o: RevOpsOpportunity): boolean {
    return !CLOSED_OPP_STATUSES.has(o.status);
  }

  /** Compose the point-in-time revenue brief for a tenant (optionally scoped to one business). */
  async brief(tenantId: string, business?: string): Promise<RevOpsBrief> {
    const agg = await this.readModel.aggregate(tenantId, business);
    const now = this.nowMs();
    const open = agg.opportunities.filter((o) => this.isOpen(o));

    const pipeline_value_usd = open.reduce((sum, o) => sum + o.expected_revenue_usd, 0);

    const money_actions_due: RevOpsMoneyAction[] = agg.money_actions
      .filter((a) => !DONE_ACTION_STATUSES.has(a.status) && this.actionDue(a, now))
      .map((a) => ({
        id: a.id,
        action: a.action,
        business: a.business,
        expected_revenue_usd: a.expected_revenue_usd,
        due: a.due,
        status: a.status,
      }));

    const stalled_deals: RevOpsStalledDeal[] = open
      .map((o) => ({ o, days: this.daysSince(o.updated_at, now) }))
      .filter(({ days }) => days > STALL_THRESHOLD_DAYS)
      .map(({ o, days }) => ({
        id: o.id,
        title: o.title,
        business: o.business,
        days_stalled: days,
      }));

    const top_opportunities: RevOpsTopOpportunity[] = [...open]
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_OPPORTUNITY_LIMIT)
      .map((o) => ({
        id: o.id,
        title: o.title,
        business: o.business,
        expected_revenue_usd: o.expected_revenue_usd,
        probability: o.probability,
        score: o.score,
      }));

    return RevOpsBriefSchema.parse({
      id: this.idFactory(),
      tenant_id: tenantId,
      business: business ?? null,
      as_of: agg.as_of,
      pipeline_value_usd,
      open_opportunities: open.length,
      money_actions_due,
      stalled_deals,
      top_opportunities,
      created_at: this.clock().toISOString(),
    });
  }

  /**
   * Greedy fastest-path-to-cash plan. Over open opportunities, rank by expected-value-per-day
   * (expected_revenue_usd * probability / max(speed_to_cash_days, 1)) DESC and accumulate steps until the
   * running projected expected total reaches `target_usd` (or all opportunities are consumed).
   * Deterministic.
   */
  async fastestPath(tenantId: string, input: FastestPathInput): Promise<FastestPathPlan> {
    const agg = await this.readModel.aggregate(tenantId, input.business);
    const open = agg.opportunities.filter((o) => this.isOpen(o));

    const ranked = [...open].sort((a, b) => this.evPerDay(b) - this.evPerDay(a));

    const steps: FastestPathStep[] = [];
    let projected_total_usd = 0;
    let projected_days = 0;
    for (const o of ranked) {
      if (projected_total_usd >= input.target_usd) break;
      steps.push({
        opportunity_id: o.id,
        title: o.title,
        business: o.business,
        expected_revenue_usd: o.expected_revenue_usd,
        probability: o.probability,
        speed_to_cash_days: o.speed_to_cash_days,
        action: `Advance: ${o.title}`,
      });
      projected_total_usd += o.expected_revenue_usd * o.probability;
      if (o.speed_to_cash_days > projected_days) projected_days = o.speed_to_cash_days;
    }

    return FastestPathPlanSchema.parse({
      id: this.idFactory(),
      tenant_id: tenantId,
      business: input.business ?? null,
      target_usd: input.target_usd,
      steps,
      projected_total_usd,
      projected_days,
      created_at: this.clock().toISOString(),
    });
  }

  /** Expected value realized per day — the ranking key for the fastest path. */
  private evPerDay(o: RevOpsOpportunity): number {
    return (o.expected_revenue_usd * o.probability) / Math.max(o.speed_to_cash_days, 1);
  }

  /** A money action is "due" when undated or its due date is at/under now. */
  private actionDue(a: RevOpsActionRow, now: number): boolean {
    if (a.due === null) return true;
    const due = Date.parse(a.due);
    if (Number.isNaN(due)) return true;
    return due <= now;
  }

  /** Whole days elapsed since an ISO timestamp relative to `now` (floored, never negative). */
  private daysSince(iso: string, now: number): number {
    const then = Date.parse(iso);
    if (Number.isNaN(then)) return 0;
    return Math.max(0, Math.floor((now - then) / MS_PER_DAY));
  }
}

export type { RevOpsReadModel, RevOpsAggregate, RevOpsOpportunity, RevOpsActionRow };
export { InMemoryRevOpsReadModel } from "./read-model.js";
