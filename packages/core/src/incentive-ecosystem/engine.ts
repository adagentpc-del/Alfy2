import {
  IncentiveEvaluationSchema,
  EvaluateIncentiveInputSchema,
  ReferralProgramSchema,
  CreateReferralProgramInputSchema,
  RevShareRecordSchema,
  RecordRevShareInputSchema,
  EcosystemHealthScoreSchema,
  ScoreEcosystemHealthInputSchema,
  WinWinWinReviewSchema,
  WinWinWinReviewInputSchema,
  type IncentiveEvaluation,
  type EvaluateIncentiveInput,
  type IncentiveType,
  type IncentiveVerdict,
  type ReferralProgram,
  type CreateReferralProgramInput,
  type ReferralProgramStatus,
  type RevShareRecord,
  type RecordRevShareInput,
  type EcosystemHealthScore,
  type ScoreEcosystemHealthInput,
  type WinWinWinReview,
  type WinWinWinReviewInput,
} from "@alfy2/shared";

/**
 * Incentive Alignment + Referral Ecosystem + Value Exchange engine.
 *
 * Deterministic and infrastructure-free (in-memory reference store; real persistence arrives in a
 * later phase). It evaluates every incentive / referral / partnership / rev-share through incentive
 * alignment + value exchange so the BUSINESS is protected first while participant value increases.
 *
 * CORE RULE enforced in code (see {@link evaluateIncentive}): do NOT design extractive systems.
 * An incentive is rejected when business protection fails (abuse_risk high, OR margin erosion high
 * with low participant value). Anything involving money / rev-share / discounts / payouts / pricing
 * / contracts sets `approval_required` so it cannot advance without Alyssa approval. Rev-share
 * payouts START pending and only {@link approvePayout} moves pending -> approved.
 */

export interface IncentiveEcosystemEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

interface Stores {
  evaluations: Map<string, IncentiveEvaluation>;
  referralPrograms: Map<string, ReferralProgram>;
  revShare: Map<string, RevShareRecord>;
  healthScores: Map<string, EcosystemHealthScore>;
  winWinWin: Map<string, WinWinWinReview>;
}

/** Incentive types that always require Alyssa approval (money / pricing / contracts). */
const MONEY_INCENTIVE_TYPES: ReadonlySet<IncentiveType> = new Set<IncentiveType>([
  "revenue_share",
  "discount",
]);

// Thresholds (documented constants so the "protect the business first" rule is explicit).
const HIGH_ABUSE_RISK = 0.6;
const HIGH_MARGIN_IMPACT = 0.6;
const LOW_PARTICIPANT_VALUE = 0.35;
const RECOMMEND_MIN_SCORE = 60;
const RECOMMEND_MAX_ABUSE_RISK = 0.3;

export class IncentiveEcosystemEngine {
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly s: Stores = {
    evaluations: new Map(),
    referralPrograms: new Map(),
    revShare: new Map(),
    healthScores: new Map(),
    winWinWin: new Map(),
  };

  constructor(options: IncentiveEcosystemEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  // --- Incentive evaluation (append-only) ---------------------------------

  /**
   * Evaluate one incentive through value exchange. The score weighs what the business and
   * participant GAIN against what it COSTS / RISKS, then a verdict protects the business first.
   *
   * FORMULA (value_exchange_score, 0-100):
   *   positives = business_upside*0.30 + participant_upside*0.20 + retention_impact*0.20
   *             + referral_likelihood*0.15 + reputation_impact*0.15           (weights sum to 1.0)
   *   negatives = cost_to_deliver*0.30 + margin_impact*0.45 + abuse_risk*0.25 (weights sum to 1.0)
   *   raw       = positives - negatives           (range -1..1)
   *   score     = round(clamp01((raw + 1) / 2) * 100)
   *
   * APPROVAL: approval_required = true when incentive_type is revenue_share / discount, OR the
   * caller flags involves_money (pricing / contracts / payouts).
   *
   * VERDICT (don't design extractive systems):
   *   - reject when business protection fails: abuse_risk high, OR margin_impact high AND
   *     participant_upside low (extractive: the business bleeds margin for little participant value).
   *   - recommend only when score is high AND abuse_risk is low.
   *   - revise otherwise.
   */
  evaluateIncentive(tenantId: string, input: EvaluateIncentiveInput): IncentiveEvaluation {
    const parsed = EvaluateIncentiveInputSchema.parse(input);

    const positives =
      parsed.business_upside * 0.3 +
      parsed.participant_upside * 0.2 +
      parsed.retention_impact * 0.2 +
      parsed.referral_likelihood * 0.15 +
      parsed.reputation_impact * 0.15;
    const negatives =
      parsed.cost_to_deliver * 0.3 + parsed.margin_impact * 0.45 + parsed.abuse_risk * 0.25;
    const raw = positives - negatives; // -1..1
    const score = Math.round(clamp01((raw + 1) / 2) * 100);

    const approvalRequired =
      MONEY_INCENTIVE_TYPES.has(parsed.incentive_type) || parsed.involves_money;

    // Business protection first: detect extractive designs.
    const abuseTooHigh = parsed.abuse_risk >= HIGH_ABUSE_RISK;
    const extractive =
      parsed.margin_impact >= HIGH_MARGIN_IMPACT &&
      parsed.participant_upside <= LOW_PARTICIPANT_VALUE;

    let verdict: IncentiveVerdict;
    if (abuseTooHigh || extractive) {
      verdict = "reject";
    } else if (score >= RECOMMEND_MIN_SCORE && parsed.abuse_risk <= RECOMMEND_MAX_ABUSE_RISK) {
      verdict = "recommend";
    } else {
      verdict = "revise";
    }

    const evaluation = IncentiveEvaluationSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: parsed.business_key,
      participant_kind: parsed.participant_kind,
      incentive_type: parsed.incentive_type,
      what_they_want: parsed.what_they_want,
      what_they_give: parsed.what_they_give,
      what_they_receive: parsed.what_they_receive,
      business_upside: parsed.business_upside,
      participant_upside: parsed.participant_upside,
      cost_to_deliver: parsed.cost_to_deliver,
      margin_impact: parsed.margin_impact,
      retention_impact: parsed.retention_impact,
      referral_likelihood: parsed.referral_likelihood,
      reputation_impact: parsed.reputation_impact,
      abuse_risk: parsed.abuse_risk,
      value_exchange_score: score,
      approval_required: approvalRequired,
      verdict,
      notes: parsed.notes,
      created_at: this.clock().toISOString(),
    });
    this.s.evaluations.set(evaluation.id, evaluation);
    return evaluation;
  }

  getEvaluation(tenantId: string, id: string): IncentiveEvaluation | undefined {
    const e = this.s.evaluations.get(id);
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  listEvaluations(tenantId: string, businessKey?: string): IncentiveEvaluation[] {
    return [...this.s.evaluations.values()].filter(
      (e) => e.tenant_id === tenantId && (businessKey === undefined || e.business_key === businessKey),
    );
  }

  // --- Referral programs (mutable) ----------------------------------------

  createReferralProgram(tenantId: string, input: CreateReferralProgramInput): ReferralProgram {
    const parsed = CreateReferralProgramInputSchema.parse(input);
    const program = ReferralProgramSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: parsed.business_key,
      who_can_refer: parsed.who_can_refer,
      who_they_refer: parsed.who_they_refer,
      reward: parsed.reward,
      tracking_method: parsed.tracking_method,
      payout_logic: parsed.payout_logic,
      eligibility: parsed.eligibility,
      fraud_prevention: parsed.fraud_prevention,
      relationship_protection: parsed.relationship_protection,
      follow_up_sequence: parsed.follow_up_sequence,
      status: parsed.status,
      created_at: this.clock().toISOString(),
      updated_at: null,
    });
    this.s.referralPrograms.set(program.id, program);
    return program;
  }

  listReferralPrograms(
    tenantId: string,
    filter?: { business_key?: string; status?: ReferralProgramStatus },
  ): ReferralProgram[] {
    return [...this.s.referralPrograms.values()].filter(
      (p) =>
        p.tenant_id === tenantId &&
        (filter?.business_key === undefined || p.business_key === filter.business_key) &&
        (filter?.status === undefined || p.status === filter.status),
    );
  }

  getReferralProgram(tenantId: string, id: string): ReferralProgram | undefined {
    const p = this.s.referralPrograms.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  setReferralStatus(tenantId: string, id: string, status: ReferralProgramStatus): ReferralProgram {
    const p = this.s.referralPrograms.get(id);
    if (!p || p.tenant_id !== tenantId) throw new Error("referral program not found");
    const next: ReferralProgram = { ...p, status, updated_at: this.clock().toISOString() };
    this.s.referralPrograms.set(next.id, next);
    return next;
  }

  // --- Rev-share (append-only; payout advance is approval-gated) -----------

  /** Record a rev-share. Payout always starts `pending` — advancing it is approval-gated. */
  recordRevShare(tenantId: string, input: RecordRevShareInput): RevShareRecord {
    const parsed = RecordRevShareInputSchema.parse(input);
    const record = RevShareRecordSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: parsed.business_key,
      source_partner: parsed.source_partner,
      referred_party: parsed.referred_party,
      transaction_ref: parsed.transaction_ref,
      fee_pct: parsed.fee_pct,
      payout_pct: parsed.payout_pct,
      payout_trigger: parsed.payout_trigger,
      payout_status: "pending",
      agreement_status: parsed.agreement_status,
      created_at: this.clock().toISOString(),
    });
    this.s.revShare.set(record.id, record);
    return record;
  }

  /**
   * Approval gate for rev-share money movement: ONLY moves pending -> approved (this represents
   * Alyssa approving the payout). Any other current status is rejected.
   */
  approvePayout(tenantId: string, id: string): RevShareRecord {
    const r = this.s.revShare.get(id);
    if (!r || r.tenant_id !== tenantId) throw new Error("revshare record not found");
    if (r.payout_status !== "pending") {
      throw new Error(`cannot approve payout from status "${r.payout_status}" (must be pending)`);
    }
    const next: RevShareRecord = { ...r, payout_status: "approved" };
    this.s.revShare.set(next.id, next);
    return next;
  }

  listRevShare(tenantId: string, businessKey?: string): RevShareRecord[] {
    return [...this.s.revShare.values()].filter(
      (r) => r.tenant_id === tenantId && (businessKey === undefined || r.business_key === businessKey),
    );
  }

  getRevShare(tenantId: string, id: string): RevShareRecord | undefined {
    const r = this.s.revShare.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  // --- Ecosystem health (append-only) -------------------------------------

  /**
   * Score overall ecosystem health (0-100). A healthy ecosystem compounds: value is created,
   * incentives are fair, referrals happen, participants come back, trust is high, payouts are
   * timely — minus disputes.
   *
   * FORMULA: weighted average of the 0..1 signals, then a small disputes penalty.
   *   base = value_created*0.18 + incentive_fairness*0.15 + referral_activity*0.12
   *        + repeat_participation*0.13 + trust_signals*0.12 + payout_timeliness*0.10
   *        + retention*0.10 + satisfaction*0.10                     (weights sum to 1.0)
   *   penalty = min(disputes, 5) * 0.03   (each dispute shaves 3 points, capped at 5 disputes)
   *   score = round(clamp01(base - penalty) * 100)
   */
  scoreEcosystemHealth(
    tenantId: string,
    businessKey: string,
    input: ScoreEcosystemHealthInput,
  ): EcosystemHealthScore {
    const parsed = ScoreEcosystemHealthInputSchema.parse(input);
    const base =
      parsed.value_created * 0.18 +
      parsed.incentive_fairness * 0.15 +
      parsed.referral_activity * 0.12 +
      parsed.repeat_participation * 0.13 +
      parsed.trust_signals * 0.12 +
      parsed.payout_timeliness * 0.1 +
      parsed.retention * 0.1 +
      parsed.satisfaction * 0.1;
    const penalty = Math.min(parsed.disputes, 5) * 0.03;
    const score = Math.round(clamp01(base - penalty) * 100);

    const record = EcosystemHealthScoreSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: businessKey,
      value_created: parsed.value_created,
      incentive_fairness: parsed.incentive_fairness,
      referral_activity: parsed.referral_activity,
      repeat_participation: parsed.repeat_participation,
      trust_signals: parsed.trust_signals,
      disputes: parsed.disputes,
      payout_timeliness: parsed.payout_timeliness,
      retention: parsed.retention,
      satisfaction: parsed.satisfaction,
      score,
      created_at: this.clock().toISOString(),
    });
    this.s.healthScores.set(record.id, record);
    return record;
  }

  listHealthScores(tenantId: string, businessKey?: string): EcosystemHealthScore[] {
    return [...this.s.healthScores.values()].filter(
      (h) => h.tenant_id === tenantId && (businessKey === undefined || h.business_key === businessKey),
    );
  }

  // --- Win-Win-Win review (append-only) -----------------------------------

  /**
   * The three-way check. A proposal is only `recommend` when ALL THREE parties win AND it builds
   * trust. If exactly one party loses (or trust isn't built) it's `revise`; if two or more parties
   * lose it's `reject`. This is the structural guard against extractive "wins" for one side.
   */
  winWinWinReview(tenantId: string, input: WinWinWinReviewInput): WinWinWinReview {
    const parsed = WinWinWinReviewInputSchema.parse(input);
    const winners = [parsed.alyssa_wins, parsed.participant_wins, parsed.end_customer_wins];
    const losers = winners.filter((w) => !w).length;

    let verdict: IncentiveVerdict;
    if (losers === 0 && parsed.builds_trust) {
      verdict = "recommend";
    } else if (losers >= 2) {
      verdict = "reject";
    } else {
      verdict = "revise";
    }

    const review = WinWinWinReviewSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_key: parsed.business_key,
      proposal: parsed.proposal,
      alyssa_wins: parsed.alyssa_wins,
      participant_wins: parsed.participant_wins,
      end_customer_wins: parsed.end_customer_wins,
      builds_trust: parsed.builds_trust,
      encourages_repeat: parsed.encourages_repeat,
      creates_referrals: parsed.creates_referrals,
      verdict,
      created_at: this.clock().toISOString(),
    });
    this.s.winWinWin.set(review.id, review);
    return review;
  }

  listWinWinWinReviews(tenantId: string, businessKey?: string): WinWinWinReview[] {
    return [...this.s.winWinWin.values()].filter(
      (w) => w.tenant_id === tenantId && (businessKey === undefined || w.business_key === businessKey),
    );
  }
}

// ===========================================================================
// Helpers
// ===========================================================================

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
