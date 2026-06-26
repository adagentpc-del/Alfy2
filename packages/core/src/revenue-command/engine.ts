import {
  RevenueOpportunitySchema,
  RevenueOpportunityInputSchema,
  RevenueOpportunityFilterSchema,
  MoneyActionSchema,
  MoneyActionInputSchema,
  FunnelStageRecordSchema,
  FunnelStageRecordInputSchema,
  RevenueCommandCenterSchema,
  BusinessRevenueMissionSchema,
  BusinessRevenueMissionInputSchema,
  OfferReviewSchema,
  OfferReviewInputSchema,
  RevenueKpiSnapshotSchema,
  type RevenueOpportunity,
  type RevenueOpportunityInput,
  type RevenueOpportunityFilter,
  type RevenueOpportunityKind,
  type RevenueOpportunityStatus,
  type RevenueEffort,
  type RevenueRisk,
  type RevenueStrategicValue,
  type RevenueRepeatability,
  type RevenueMargin,
  type MoneyAction,
  type MoneyActionInput,
  type MoneyActionStatus,
  type FunnelStageRecord,
  type FunnelStageRecordInput,
  type RevenueCommandCenter,
  type BusinessRevenueMission,
  type BusinessRevenueMissionInput,
  type BusinessRevenueKey,
  type OfferReview,
  type OfferReviewInput,
  type RevenueKpiSnapshot,
} from "@alfy2/shared";

/**
 * RevenueCommandEngine — the Chief Revenue Officer brain over Alyssa's portfolio.
 *
 * Deterministic, infrastructure-free (in-memory reference store; real persistence + AI-assisted
 * detection arrive in Phase 2 behind the AI Gateway flag). This is an ORCHESTRATION layer: it does
 * NOT re-implement deal-desk / conversion engines. It detects portfolio opportunities, scores them,
 * builds the daily command center, owns per-business revenue missions, reviews offers/pricing, and
 * aggregates KPIs.
 *
 * CORE RULE (encoded in scoring + approval logic): the CRO's default question is
 *   "What action is most likely to create or protect revenue FASTEST without creating chaos,
 *    scope creep, legal risk, or founder overload?"
 * Optimize for cash flow, margin, leverage, repeatability, clean execution, founder protection.
 * High-risk execution (risk high/critical, partnership/referral, or black_flag/stratalogic =
 * legal/financial/clinical) requires approval on its money action.
 */

export interface RevenueCommandEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

interface Stores {
  opportunities: Map<string, RevenueOpportunity>;
  moneyActions: Map<string, MoneyAction>;
  funnelStages: Map<string, FunnelStageRecord>;
  commandCenters: Map<string, RevenueCommandCenter>;
  missions: Map<string, BusinessRevenueMission>;
  offerReviews: Map<string, OfferReview>;
}

export class RevenueCommandEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    opportunities: new Map(),
    moneyActions: new Map(),
    funnelStages: new Map(),
    commandCenters: new Map(),
    missions: new Map(),
    offerReviews: new Map(),
  };

  constructor(options: RevenueCommandEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Opportunities -------------------------------------------------------

  /**
   * Add an opportunity with a COMPUTED 0-100 score and a recommended status.
   * See {@link scoreOpportunity} and {@link statusForOpportunity} for the formula + mapping.
   */
  addOpportunity(tenantId: string, input: RevenueOpportunityInput): RevenueOpportunity {
    const parsed = RevenueOpportunityInputSchema.parse(input);
    const score = scoreOpportunity(parsed);
    const status = statusForOpportunity(parsed, score);
    const now = this.clock().toISOString();
    const opp = RevenueOpportunitySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business: parsed.business,
      kind: parsed.kind,
      title: parsed.title,
      description: parsed.description,
      expected_revenue_usd: parsed.expected_revenue_usd,
      speed_to_cash_days: parsed.speed_to_cash_days,
      effort: parsed.effort,
      risk: parsed.risk,
      confidence: parsed.confidence,
      founder_time_hours: parsed.founder_time_hours,
      strategic_value: parsed.strategic_value,
      repeatability: parsed.repeatability,
      margin: parsed.margin,
      probability_of_close: parsed.probability_of_close,
      score,
      status,
      created_at: now,
      updated_at: null,
    });
    this.s.opportunities.set(opp.id, opp);
    return opp;
  }

  listOpportunities(tenantId: string, filter?: RevenueOpportunityFilter): RevenueOpportunity[] {
    const f = filter ? RevenueOpportunityFilterSchema.parse(filter) : undefined;
    return [...this.s.opportunities.values()].filter((o) => {
      if (o.tenant_id !== tenantId) return false;
      if (f?.business !== undefined && o.business !== f.business) return false;
      if (f?.kind !== undefined && o.kind !== f.kind) return false;
      if (f?.status !== undefined && o.status !== f.status) return false;
      return true;
    });
  }

  /** Opportunities sorted by score descending (ties broken by faster speed-to-cash). */
  rankOpportunities(tenantId: string): RevenueOpportunity[] {
    return this.listOpportunities(tenantId).sort(
      (a, b) => b.score - a.score || a.speed_to_cash_days - b.speed_to_cash_days,
    );
  }

  // --- Offer / pricing review ----------------------------------------------

  /** Pre-send offer review: auto-detects flags and a verdict. */
  reviewOffer(tenantId: string, input: OfferReviewInput): OfferReview {
    const p = OfferReviewInputSchema.parse(input);
    const flags: string[] = [];
    const underpriced = p.price_floor_usd > 0 && p.price_usd < p.price_floor_usd;
    if (underpriced) flags.push("underpricing");
    if (!p.has_clear_scope) flags.push("vague_scope");
    if (!p.has_cta) flags.push("weak_cta");
    if (!p.has_deposit) flags.push("missing_deposit");
    if (!p.has_payment_link) flags.push("missing_payment_link");
    if (p.is_custom_work && p.price_floor_usd > 0 && p.price_usd < p.price_floor_usd) {
      flags.push("low_margin_custom_work");
    }
    if (p.is_consulting && !p.is_paid) flags.push("unpaid_consulting");

    // Recommend a price when underpriced (or unpaid consulting) — lift to the floor.
    const recommended =
      underpriced || (p.is_consulting && !p.is_paid)
        ? Math.max(p.price_floor_usd, p.price_usd)
        : null;

    // Verdict: hold on hard money/scope risks, revise on softer flags, else send.
    const hardFlags = flags.some((x) =>
      ["missing_payment_link", "missing_deposit", "unpaid_consulting"].includes(x),
    );
    const verdict = hardFlags ? "hold" : flags.length > 0 ? "revise" : "send";

    const review = OfferReviewSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business: p.business,
      offer_name: p.offer_name,
      price_usd: p.price_usd,
      flags,
      recommended_price_usd: recommended,
      verdict,
      notes: p.notes,
      created_at: this.clock().toISOString(),
    });
    this.s.offerReviews.set(review.id, review);
    return review;
  }

  listOfferReviews(tenantId: string): OfferReview[] {
    return [...this.s.offerReviews.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- Funnel ownership ----------------------------------------------------

  recordFunnelStage(tenantId: string, input: FunnelStageRecordInput): FunnelStageRecord {
    const p = FunnelStageRecordInputSchema.parse(input);
    const record = FunnelStageRecordSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business: p.business,
      stage: p.stage,
      health: p.health,
      notes: p.notes,
      recommended_action: p.recommended_action,
      created_at: this.clock().toISOString(),
    });
    this.s.funnelStages.set(record.id, record);
    return record;
  }

  listFunnelStages(tenantId: string): FunnelStageRecord[] {
    return [...this.s.funnelStages.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- Money actions -------------------------------------------------------

  addMoneyAction(tenantId: string, input: MoneyActionInput): MoneyAction {
    const p = MoneyActionInputSchema.parse(input);
    const now = this.clock().toISOString();
    const action = MoneyActionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      opportunity_id: p.opportunity_id,
      business: p.business,
      action: p.action,
      rationale: p.rationale,
      expected_revenue_usd: p.expected_revenue_usd,
      due: p.due,
      assigned_agent: p.assigned_agent,
      approval_required: p.approval_required,
      status: "todo",
      created_at: now,
      updated_at: null,
    });
    this.s.moneyActions.set(action.id, action);
    return action;
  }

  listMoneyActions(tenantId: string): MoneyAction[] {
    return [...this.s.moneyActions.values()].filter((a) => a.tenant_id === tenantId);
  }

  /** Move a money action to the next lifecycle status (or an explicit one). */
  advanceMoneyAction(tenantId: string, actionId: string, status?: MoneyActionStatus): MoneyAction {
    const a = this.s.moneyActions.get(actionId);
    if (!a || a.tenant_id !== tenantId) throw new Error("money action not found");
    const next: MoneyActionStatus = status ?? nextMoneyActionStatus(a.status);
    const updated: MoneyAction = { ...a, status: next, updated_at: this.clock().toISOString() };
    this.s.moneyActions.set(updated.id, updated);
    return updated;
  }

  // --- Command center ------------------------------------------------------

  /**
   * Build the daily command center: derive top 5 money actions from the highest-scored 'pursue_now'
   * opportunities (creating MoneyAction rows), plus blockers from weak_funnel/conversion_blocker
   * opportunities. Approval is required on actions whose opportunity is legally/financially/
   * clinically sensitive (see {@link requiresApproval}).
   */
  buildCommandCenter(tenantId: string, date: string): RevenueCommandCenter {
    const ranked = this.rankOpportunities(tenantId);
    const pursue = ranked.filter((o) => o.status === "pursue_now").slice(0, 5);

    const actionIds: string[] = [];
    for (const opp of pursue) {
      const action = this.addMoneyAction(tenantId, {
        opportunity_id: opp.id,
        business: opp.business,
        action: `Pursue: ${opp.title}`,
        rationale: opp.description || `Fastest clean path to $${opp.expected_revenue_usd} for ${opp.business}.`,
        expected_revenue_usd: opp.expected_revenue_usd,
        due: null,
        assigned_agent: null,
        approval_required: requiresApproval(opp.risk, opp.kind, opp.business),
      });
      actionIds.push(action.id);
    }

    const blockers = ranked
      .filter((o) => o.kind === "weak_funnel" || o.kind === "conversion_blocker")
      .map((o) => `${o.business}: ${o.title}`);
    const stalled = ranked.filter((o) => o.kind === "stalled_deal").map((o) => `${o.business}: ${o.title}`);
    const followups = ranked.filter((o) => o.kind === "missing_followup").map((o) => `${o.business}: ${o.title}`);
    const partnerships = ranked
      .filter((o) => o.kind === "partnership")
      .map((o) => `${o.business}: ${o.title}`);
    const paymentLinks = this.listOfferReviews(tenantId)
      .filter((r) => r.flags.includes("missing_payment_link"))
      .map((r) => `${r.business}: ${r.offer_name}`);
    const hottest = pursue.map((o) => `${o.business}: ${o.title}`);

    const cashForecast = pursue.reduce(
      (sum, o) => sum + o.expected_revenue_usd * o.probability_of_close,
      0,
    );

    const center = RevenueCommandCenterSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      date,
      top_money_actions: actionIds,
      hottest_leads: hottest,
      proposals_due: [],
      followups_due: followups,
      payment_links_needed: paymentLinks,
      stalled_deals: stalled,
      top_platform_users: [],
      fastest_partnerships: partnerships,
      revenue_blockers: blockers,
      cash_forecast_usd: pursue.length > 0 ? Math.round(cashForecast) : null,
      created_at: this.clock().toISOString(),
    });
    this.s.commandCenters.set(center.id, center);
    return center;
  }

  listCommandCenters(tenantId: string): RevenueCommandCenter[] {
    return [...this.s.commandCenters.values()].filter((c) => c.tenant_id === tenantId);
  }

  // --- Business revenue missions -------------------------------------------

  /** Upsert a per-business mission (one mission per business per tenant). */
  setBusinessMission(tenantId: string, input: BusinessRevenueMissionInput): BusinessRevenueMission {
    const p = BusinessRevenueMissionInputSchema.parse(input);
    const now = this.clock().toISOString();
    const existing = [...this.s.missions.values()].find(
      (m) => m.tenant_id === tenantId && m.business === p.business,
    );
    if (existing) {
      const updated = BusinessRevenueMissionSchema.parse({
        ...existing,
        objectives: p.objectives,
        tactics: p.tactics,
        kpis: p.kpis,
        status: p.status,
        updated_at: now,
      });
      this.s.missions.set(updated.id, updated);
      return updated;
    }
    const mission = BusinessRevenueMissionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business: p.business,
      objectives: p.objectives,
      tactics: p.tactics,
      kpis: p.kpis,
      status: p.status,
      created_at: now,
      updated_at: null,
    });
    this.s.missions.set(mission.id, mission);
    return mission;
  }

  listMissions(tenantId: string): BusinessRevenueMission[] {
    return [...this.s.missions.values()].filter((m) => m.tenant_id === tenantId);
  }

  /** Seed the six businesses with their default revenue mission objectives (idempotent per business). */
  seedDefaultMissions(tenantId: string): BusinessRevenueMission[] {
    return DEFAULT_MISSIONS.map((m) =>
      this.setBusinessMission(tenantId, {
        business: m.business,
        objectives: m.objectives,
        tactics: [],
        kpis: [],
        status: "active",
      }),
    );
  }

  // --- KPIs ----------------------------------------------------------------

  /** Aggregate a CRO KPI snapshot from whatever records exist (zeros if none). */
  revenueKpis(tenantId: string): RevenueKpiSnapshot {
    const opps = this.listOpportunities(tenantId);
    const actions = this.listMoneyActions(tenantId);
    const reviews = this.listOfferReviews(tenantId);

    const pursue = opps.filter((o) => o.status === "pursue_now");
    const closed = actions.filter((a) => a.status === "done");
    const revenueGenerated = closed.reduce((s, a) => s + a.expected_revenue_usd, 0);
    const recurring = opps
      .filter((o) => o.repeatability === "recurring")
      .reduce((s, o) => s + o.expected_revenue_usd, 0);
    const referral = opps
      .filter((o) => o.kind === "referral")
      .reduce((s, o) => s + o.expected_revenue_usd, 0);
    const fees = opps
      .filter((o) => o.business === "divini_procure" || o.business === "divini_partners")
      .reduce((s, o) => s + o.expected_revenue_usd, 0);
    const funding = opps
      .filter((o) => o.business === "black_flag")
      .reduce((s, o) => s + o.expected_revenue_usd, 0);
    const unpaidPrevented = reviews
      .filter((r) => r.flags.includes("unpaid_consulting"))
      .reduce((s, r) => s + (r.recommended_price_usd ?? 0), 0);

    const proposalsSent = actions.length;
    const closeRate = proposalsSent > 0 ? closed.length / proposalsSent : 0;
    const avgDeal = closed.length > 0 ? revenueGenerated / closed.length : 0;
    const timeToCash =
      pursue.length > 0
        ? pursue.reduce((s, o) => s + o.speed_to_cash_days, 0) / pursue.length
        : 0;

    return RevenueKpiSnapshotSchema.parse({
      tenant_id: tenantId,
      leads: opps.length,
      qualified_leads: pursue.length,
      booked_calls: opps.filter((o) => o.kind === "stalled_deal" || o.kind === "fast_cash").length,
      proposals_sent: proposalsSent,
      close_rate: closeRate,
      avg_deal_size: avgDeal,
      revenue_generated: revenueGenerated,
      recurring_revenue: recurring,
      transaction_fees: fees,
      referral_revenue: referral,
      funding_raised: funding,
      followups_completed: actions.filter((a) => a.status === "done").length,
      unpaid_labor_prevented: unpaidPrevented,
      time_to_cash: timeToCash,
    });
  }
}

// ===========================================================================
// Deterministic scoring + heuristics (AI-assisted versions arrive in Phase 2)
// ===========================================================================

const EFFORT_SCORE: Record<RevenueEffort, number> = { low: 1, medium: 0.5, high: 0 };
const RISK_SCORE: Record<RevenueRisk, number> = { low: 1, medium: 0.66, high: 0.33, critical: 0 };
const STRATEGIC_SCORE: Record<RevenueStrategicValue, number> = { low: 0.33, medium: 0.66, high: 1 };
const REPEAT_SCORE: Record<RevenueRepeatability, number> = {
  one_time: 0.33,
  repeatable: 0.66,
  recurring: 1,
};
const MARGIN_SCORE: Record<RevenueMargin, number> = { low: 0.33, medium: 0.66, high: 1 };

/**
 * Score an opportunity 0-100. Weighted blend optimizing for the CRO's default question — cash
 * FAST + clean + leveraged + founder-protected:
 *
 *   revenue (0.22)         — log-scaled expected_revenue_usd, normalized at ~$50k
 *   speed_to_cash (0.18)   — faster = better (decays over ~60 days)
 *   probability_close(0.12)
 *   margin (0.10)
 *   repeatability (0.10)   — recurring > repeatable > one_time (leverage)
 *   effort (0.08)          — lower = better (clean execution)
 *   risk (0.08)            — lower = better (no chaos / legal risk)
 *   confidence (0.06)
 *   founder_time (0.04)    — lower = better (founder protection; decays over ~8h)
 *   strategic_value (0.02)
 */
/** Fully-defaulted opportunity input (post-parse): every scoring field is present. */
interface ScoredOpportunityInput {
  expected_revenue_usd: number;
  speed_to_cash_days: number;
  effort: RevenueEffort;
  risk: RevenueRisk;
  confidence: number;
  founder_time_hours: number;
  strategic_value: RevenueStrategicValue;
  repeatability: RevenueRepeatability;
  margin: RevenueMargin;
  probability_of_close: number;
  kind: RevenueOpportunityKind;
}

function scoreOpportunity(o: ScoredOpportunityInput): number {
  const revenueComponent = clamp01(Math.log10(o.expected_revenue_usd + 1) / Math.log10(50_000 + 1));
  const speedComponent = clamp01(1 - o.speed_to_cash_days / 60);
  const founderComponent = clamp01(1 - o.founder_time_hours / 8);

  const raw =
    0.22 * revenueComponent +
    0.18 * speedComponent +
    0.12 * o.probability_of_close +
    0.1 * MARGIN_SCORE[o.margin] +
    0.1 * REPEAT_SCORE[o.repeatability] +
    0.08 * EFFORT_SCORE[o.effort] +
    0.08 * RISK_SCORE[o.risk] +
    0.06 * o.confidence +
    0.04 * founderComponent +
    0.02 * STRATEGIC_SCORE[o.strategic_value];

  return Math.round(clamp01(raw) * 100);
}

/**
 * Map score + risk + kind to a recommended disposition.
 * - underpriced_offer kind            → reprice (fix the price first)
 * - high founder_time (>= 6h)         → delegate (protect the founder)
 * - very high score + low effort      → pursue_now
 * - recurring/repeatable but slow     → automate
 * - decent but slow / not-now         → nurture
 * - low score                         → pause, or kill if also low value
 */
function statusForOpportunity(
  o: ScoredOpportunityInput,
  score: number,
): RevenueOpportunityStatus {
  if (o.kind === "underpriced_offer") return "reprice";
  if (o.founder_time_hours >= 6 && score < 80) return "delegate";
  if (score >= 70 && o.effort === "low" && o.risk !== "critical") return "pursue_now";
  if (score >= 70) return "pursue_now";
  const leveraged = o.repeatability === "recurring" || o.repeatability === "repeatable";
  if (leveraged && o.speed_to_cash_days > 30) return "automate";
  if (score >= 45) return "nurture";
  if (score < 25 && o.strategic_value === "low") return "kill";
  return "pause";
}

/**
 * Anything legal / financial / clinical / partnership requires approval on its money action:
 * high/critical risk, partnership/referral kinds, or the black_flag (fundraising) / stratalogic
 * (clinical/wellness) businesses.
 */
function requiresApproval(
  risk: RevenueRisk,
  kind: RevenueOpportunity["kind"],
  business: string,
): boolean {
  if (risk === "high" || risk === "critical") return true;
  if (kind === "partnership" || kind === "referral") return true;
  if (business === "black_flag" || business === "stratalogic") return true;
  return false;
}

function nextMoneyActionStatus(status: MoneyActionStatus): MoneyActionStatus {
  switch (status) {
    case "todo":
      return "in_progress";
    case "in_progress":
      return "done";
    case "blocked":
      return "in_progress";
    case "done":
      return "done";
    default:
      return "done";
  }
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

interface DefaultMission {
  business: BusinessRevenueKey;
  objectives: string[];
}

const DEFAULT_MISSIONS: readonly DefaultMission[] = [
  {
    business: "move_mi",
    objectives: [
      "Generate quote requests",
      "Convert moving leads",
      "Build realtor / property-manager referrals",
      "Improve local SEO",
      "Increase booking conversion",
      "Create review / referral engine",
    ],
  },
  {
    business: "divini_procure",
    objectives: [
      "Onboard developers / vendors / investors",
      "Create procurement opportunities",
      "Protect transaction fees",
      "Identify category gaps",
      "Trigger vendor / developer matches",
      "Grow marketplace liquidity",
    ],
  },
  {
    business: "divini_partners",
    objectives: [
      "Onboard venues / vendors / sponsors",
      "Create sponsorship / ad opportunities",
      "Activate event / customer demand",
      "Improve partner conversion",
      "Grow transaction + seat revenue",
    ],
  },
  {
    business: "stratalogic",
    objectives: [
      "Clinic partnerships",
      "Beta users",
      "Consumer subscriptions",
      "Founder-clinic offers",
      "Conversion-safe wellness positioning",
    ],
  },
  {
    business: "founder_os",
    objectives: [
      "Package advisory offers",
      "Create funnels",
      "Generate paid audits / sprints",
      "Upsell implementation",
    ],
  },
  {
    business: "black_flag",
    objectives: [
      "Coordinate with Fundraising department",
      "Donor / sponsor / grant / major-gift strategy",
      "Mission-aligned funding only",
    ],
  },
];
