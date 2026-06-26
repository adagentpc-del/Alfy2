/**
 * Runtime smoke for the Incentive Alignment + Referral Ecosystem + Value Exchange engine.
 * Proves: business is protected first (extractive designs are rejected), money incentives are
 * approval-gated, rev-share payouts start pending and only advance via approval, ecosystem health
 * scores 0-100, and a win-win-win where one party loses is never `recommend`.
 *
 * Imported via the package's source path (the @alfy2/core barrel wiring is owned elsewhere).
 * Run: `tsx scripts/incentive-ecosystem-smoke.mts`.
 */
import assert from "node:assert/strict";
import { IncentiveEcosystemEngine } from "../packages/core/src/incentive-ecosystem/engine.js";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER_TENANT = "00000000-0000-0000-0000-0000000000ff";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new IncentiveEcosystemEngine({ clock: () => NOW, idFactory: id });

const BIZ = "venue-network";

// 1. A fair, high-value, compounding incentive (a content feature for a partner): strong upside,
//    low cost, low abuse risk, low margin impact -> recommend.
const fair = e.evaluateIncentive(TENANT, {
  business_key: BIZ,
  participant_kind: "partner",
  incentive_type: "content_feature",
  what_they_want: "More visibility to our audience",
  what_they_give: "Co-marketing + warm intros",
  what_they_receive: "A featured case study + newsletter spot",
  business_upside: 0.9,
  participant_upside: 0.85,
  cost_to_deliver: 0.15,
  margin_impact: 0.1,
  retention_impact: 0.8,
  referral_likelihood: 0.75,
  reputation_impact: 0.8,
  abuse_risk: 0.05,
});
assert.equal(fair.verdict, "recommend", "fair high-value incentive is recommended");
assert.ok(fair.value_exchange_score >= 60, "fair incentive scores high");
assert.equal(fair.approval_required, false, "non-money incentive needs no money approval");

// 2. A money incentive (revenue_share) must set approval_required regardless of score.
const money = e.evaluateIncentive(TENANT, {
  business_key: BIZ,
  participant_kind: "referral_source",
  incentive_type: "revenue_share",
  what_they_want: "A cut of revenue they drive",
  what_they_give: "Qualified referrals",
  what_they_receive: "10% rev-share",
  business_upside: 0.7,
  participant_upside: 0.7,
  cost_to_deliver: 0.2,
  margin_impact: 0.3,
  retention_impact: 0.6,
  referral_likelihood: 0.8,
  reputation_impact: 0.6,
  abuse_risk: 0.1,
});
assert.equal(money.approval_required, true, "revenue_share requires Alyssa approval");

// A discount-type incentive is also money-gated.
const discount = e.evaluateIncentive(TENANT, {
  business_key: BIZ,
  participant_kind: "customer",
  incentive_type: "discount",
  what_they_receive: "15% off",
  business_upside: 0.4,
  participant_upside: 0.5,
  cost_to_deliver: 0.2,
  margin_impact: 0.4,
  retention_impact: 0.4,
  referral_likelihood: 0.2,
  reputation_impact: 0.3,
  abuse_risk: 0.1,
});
assert.equal(discount.approval_required, true, "discount requires approval");

// A non-money incentive flagged as involving pricing/contracts is still approval-gated.
const flagged = e.evaluateIncentive(TENANT, {
  business_key: BIZ,
  participant_kind: "vendor",
  incentive_type: "preferred_placement",
  what_they_receive: "Top placement, contract terms",
  business_upside: 0.6,
  participant_upside: 0.6,
  cost_to_deliver: 0.2,
  margin_impact: 0.2,
  retention_impact: 0.5,
  referral_likelihood: 0.3,
  reputation_impact: 0.4,
  abuse_risk: 0.1,
  involves_money: true,
});
assert.equal(flagged.approval_required, true, "involves_money flag forces approval");

// 3. An EXTRACTIVE incentive: high abuse risk + high margin erosion + low participant value.
//    The business-protection rule rejects it.
const extractive = e.evaluateIncentive(TENANT, {
  business_key: BIZ,
  participant_kind: "platform_user",
  incentive_type: "referral_reward",
  what_they_want: "Cash for sign-ups, easily gamed",
  what_they_give: "Low-quality sign-ups",
  what_they_receive: "Per-head bounty",
  business_upside: 0.2,
  participant_upside: 0.2,
  cost_to_deliver: 0.7,
  margin_impact: 0.85,
  retention_impact: 0.1,
  referral_likelihood: 0.3,
  reputation_impact: 0.1,
  abuse_risk: 0.85,
});
assert.equal(extractive.verdict, "reject", "extractive design is rejected (business protected first)");

// Margin bleed with low participant value is rejected even without high abuse risk.
const marginBleed = e.evaluateIncentive(TENANT, {
  business_key: BIZ,
  participant_kind: "sponsor",
  incentive_type: "done_for_you",
  business_upside: 0.5,
  participant_upside: 0.2,
  cost_to_deliver: 0.5,
  margin_impact: 0.7,
  retention_impact: 0.3,
  referral_likelihood: 0.2,
  reputation_impact: 0.2,
  abuse_risk: 0.2,
});
assert.equal(marginBleed.verdict, "reject", "margin erosion with low participant value is rejected");

assert.equal(e.listEvaluations(TENANT, BIZ).length, 6, "all evaluations recorded for this business");

// 4. Create a referral program; verify list + status toggle.
const program = e.createReferralProgram(TENANT, {
  business_key: BIZ,
  who_can_refer: "Existing happy customers",
  who_they_refer: "Similar businesses",
  reward: "Account credit + early access",
  tracking_method: "Unique referral link",
  payout_logic: "Credit after referred party's first paid month",
  eligibility: "Active accounts in good standing",
  fraud_prevention: "Self-referrals and duplicate accounts disqualified",
  relationship_protection: "No spammy outreach; referrals must be warm",
  follow_up_sequence: ["thank-you", "status update", "reward delivered"],
  status: "active",
});
assert.equal(program.status, "active", "program starts active");
assert.equal(e.listReferralPrograms(TENANT, { business_key: BIZ, status: "active" }).length, 1, "active program listed");
const paused = e.setReferralStatus(TENANT, program.id, "paused");
assert.equal(paused.status, "paused", "program can be paused");
assert.equal(e.listReferralPrograms(TENANT, { status: "active" }).length, 0, "no active programs after pause");

// 5. Rev-share: starts pending, advances to approved only via approvePayout.
const rev = e.recordRevShare(TENANT, {
  business_key: BIZ,
  source_partner: "Affiliate A",
  referred_party: "New customer X",
  transaction_ref: "txn-001",
  fee_pct: 0.1,
  payout_pct: 0.05,
  payout_trigger: "first paid invoice",
  agreement_status: "signed",
});
assert.equal(rev.payout_status, "pending", "rev-share payout starts pending");
const approved = e.approvePayout(TENANT, rev.id);
assert.equal(approved.payout_status, "approved", "approvePayout moves pending -> approved");
assert.throws(() => e.approvePayout(TENANT, rev.id), /must be pending/, "cannot re-approve an already-approved payout");

// 6. Ecosystem health score is 0-100.
const health = e.scoreEcosystemHealth(TENANT, BIZ, {
  value_created: 0.85,
  incentive_fairness: 0.9,
  referral_activity: 0.7,
  repeat_participation: 0.8,
  trust_signals: 0.85,
  disputes: 1,
  payout_timeliness: 0.9,
  retention: 0.8,
  satisfaction: 0.85,
});
assert.ok(health.score >= 0 && health.score <= 100, "ecosystem health score is within 0-100");
assert.ok(health.score >= 70, "a healthy ecosystem scores high");

// 7. Win-win-win where one party LOSES is never `recommend`.
const oneLoses = e.winWinWinReview(TENANT, {
  business_key: BIZ,
  proposal: "Deep discount that pleases the participant but erodes Alyssa's margin",
  alyssa_wins: false,
  participant_wins: true,
  end_customer_wins: true,
  builds_trust: true,
  encourages_repeat: true,
  creates_referrals: true,
});
assert.notEqual(oneLoses.verdict, "recommend", "if one party loses, it is not recommended");
assert.equal(oneLoses.verdict, "revise", "one loser -> revise");

const allWin = e.winWinWinReview(TENANT, {
  business_key: BIZ,
  proposal: "Referral program where all three sides benefit and trust grows",
  alyssa_wins: true,
  participant_wins: true,
  end_customer_wins: true,
  builds_trust: true,
  encourages_repeat: true,
  creates_referrals: true,
});
assert.equal(allWin.verdict, "recommend", "all three win + trust -> recommend");

const twoLose = e.winWinWinReview(TENANT, {
  business_key: BIZ,
  proposal: "Extractive deal where only the participant wins",
  alyssa_wins: false,
  participant_wins: true,
  end_customer_wins: false,
  builds_trust: false,
  encourages_repeat: false,
  creates_referrals: false,
});
assert.equal(twoLose.verdict, "reject", "two or more losers -> reject");

// 8. Tenant isolation.
assert.equal(e.listEvaluations(OTHER_TENANT).length, 0, "another tenant sees no evaluations");
assert.equal(e.listReferralPrograms(OTHER_TENANT).length, 0, "another tenant sees no referral programs");

console.log(
  `INCENTIVE ECOSYSTEM SMOKE OK — ${e.listEvaluations(TENANT, BIZ).length} incentives evaluated ` +
    `(fair=recommend, money=approval-gated, extractive=reject), referral program created + paused, ` +
    `rev-share pending->approved, ecosystem health ${health.score}/100, win-win-win enforced (one loser never recommended)`,
);
