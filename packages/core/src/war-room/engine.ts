import {
  StartWarRoomTestInputSchema,
  RecordFunnelInputSchema,
  WarRoomTestSchema,
  RateCardSchema,
  type StartWarRoomTestInput,
  type RecordFunnelInput,
  type WarRoomTest,
  type RateCard,
  type FunnelMetrics,
} from "@alfy2/shared";

/**
 * The Conversion War Room (docs/adr/ADR-0042-conversion-war-room.md). Optimizes the nine conversion
 * surfaces by tracking the full funnel and A/B testing variants. It NEVER optimizes for vanity metrics:
 * opens and clicks are recorded but the winner is decided on revenue per send, then booked calls, then
 * qualified leads — the things that turn into cash. Deterministic. Tenant-scoped.
 */

export class WarRoomError extends Error {}

/** Minimum sends per variant before a winner is called (avoids noise). */
export const MIN_SENDS_FOR_WINNER = 30;

export interface WarRoomOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class ConversionWarRoom {
  private readonly tests = new Map<string, WarRoomTest>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: WarRoomOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Start an A/B test on a surface. */
  startTest(tenantId: string, input: StartWarRoomTestInput): WarRoomTest {
    const i = StartWarRoomTestInputSchema.parse(input);
    const now = this.clock().toISOString();
    const empty = FunnelMetricsZero();
    const test = WarRoomTestSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_id: i.business_id,
      surface: i.surface,
      label: i.label,
      variant_a_label: i.variant_a_label,
      variant_b_label: i.variant_b_label,
      metrics_a: empty,
      metrics_b: empty,
      rates_a: null,
      rates_b: null,
      winner: null,
      recommendation: "",
      objections: [],
      created_at: now,
      updated_at: now,
    });
    this.tests.set(test.id, test);
    return test;
  }

  /**
   * Record funnel metrics for both variants and pick a winner — by revenue per send, then booked-call
   * rate, then qualified leads. Opens/clicks never decide. Needs MIN_SENDS_FOR_WINNER per variant.
   */
  recordFunnel(tenantId: string, id: string, input: RecordFunnelInput): WarRoomTest {
    const test = this.require(tenantId, id);
    const { metrics_a, metrics_b } = RecordFunnelInputSchema.parse(input);
    const rates_a = rateCard(metrics_a);
    const rates_b = rateCard(metrics_b);

    let winner: "a" | "b" | null = null;
    let recommendation = "Not enough signal yet — keep running.";
    if (metrics_a.sent >= MIN_SENDS_FOR_WINNER && metrics_b.sent >= MIN_SENDS_FOR_WINNER) {
      const cmp =
        compare(rates_a.revenue_per_send_usd, rates_b.revenue_per_send_usd) ||
        compare(rates_a.booked_call_rate, rates_b.booked_call_rate) ||
        compare(metrics_a.qualified_leads / Math.max(1, metrics_a.sent), metrics_b.qualified_leads / Math.max(1, metrics_b.sent));
      winner = cmp >= 0 ? "a" : "b";
      const wl = winner === "a" ? test.variant_a_label : test.variant_b_label;
      const wr = winner === "a" ? rates_a : rates_b;
      recommendation = `Ship variant ${wl}: $${wr.revenue_per_send_usd.toFixed(2)}/send, ${(wr.booked_call_rate * 100).toFixed(1)}% booked-call rate. Decided on revenue, not opens/clicks.`;
    }

    return this.save({ ...test, metrics_a, metrics_b, rates_a, rates_b, winner, recommendation });
  }

  /** Log objections heard on this surface. */
  addObjections(tenantId: string, id: string, objections: string[]): WarRoomTest {
    const test = this.require(tenantId, id);
    const merged = [...new Set([...test.objections, ...objections.map((o) => o.trim()).filter(Boolean)])];
    return this.save({ ...test, objections: merged });
  }

  get(tenantId: string, id: string): WarRoomTest | undefined {
    const t = this.tests.get(id);
    return t && t.tenant_id === tenantId ? t : undefined;
  }

  list(tenantId: string): WarRoomTest[] {
    return [...this.tests.values()].filter((t) => t.tenant_id === tenantId);
  }

  /** Tests with a called winner — the ready-to-ship recommendations. */
  decided(tenantId: string): WarRoomTest[] {
    return this.list(tenantId).filter((t) => t.winner !== null);
  }

  private save(test: WarRoomTest): WarRoomTest {
    const next = WarRoomTestSchema.parse({ ...test, updated_at: this.clock().toISOString() });
    this.tests.set(next.id, next);
    return next;
  }

  private require(tenantId: string, id: string): WarRoomTest {
    const t = this.get(tenantId, id);
    if (!t) throw new WarRoomError(`No War Room test ${id} in tenant ${tenantId}.`);
    return t;
  }
}

function rateCard(m: FunnelMetrics): RateCard {
  const sent = Math.max(1, m.sent);
  return RateCardSchema.parse({
    open_rate: clamp01(m.opens / sent),
    reply_rate: clamp01(m.replies / sent),
    click_rate: clamp01(m.clicks / sent),
    booked_call_rate: clamp01(m.booked_calls / sent),
    close_rate: clamp01(m.closes / sent),
    negative_reply_rate: clamp01(m.negative_replies / sent),
    revenue_per_send_usd: m.revenue_usd / sent,
  });
}

const FunnelMetricsZero = (): FunnelMetrics => ({
  sent: 0, opens: 0, replies: 0, clicks: 0, booked_calls: 0, qualified_leads: 0, closes: 0,
  negative_replies: 0, revenue_usd: 0, cash_collected_usd: 0, time_to_conversion_days: 0,
});
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const compare = (a: number, b: number): number => (Math.abs(a - b) < 1e-9 ? 0 : a > b ? 1 : -1);
