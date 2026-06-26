/**
 * Runtime smoke for CRO / Revenue Command. Proves portfolio opportunity scoring + disposition,
 * offer review flagging, mission seeding, the daily command center (with approval flags on high-risk
 * actions), and the KPI snapshot. Deterministic clock + idFactory.
 * Run: `tsx scripts/revenue-command-smoke.mts`.
 */
import assert from "node:assert/strict";
import { RevenueCommandEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new RevenueCommandEngine({ clock: () => NOW, idFactory: id });

// 1. Add opportunities across businesses.
// High revenue, fast, low effort, recurring, high margin → should pursue_now.
const hot = e.addOpportunity(TENANT, {
  business: "divini_procure",
  kind: "fast_cash",
  title: "Close 3 vendor onboardings this week",
  description: "Three vendors ready to sign; payment links live.",
  expected_revenue_usd: 40_000,
  speed_to_cash_days: 5,
  effort: "low",
  risk: "low",
  confidence: 0.9,
  founder_time_hours: 1,
  strategic_value: "high",
  repeatability: "recurring",
  margin: "high",
  probability_of_close: 0.85,
});
assert.equal(hot.status, "pursue_now", "high-revenue / low-effort / fast opportunity is pursue_now");
assert.ok(hot.score >= 70, "hot opportunity scores high");

// A weak, slow, low-value opportunity → pause/kill.
const weak = e.addOpportunity(TENANT, {
  business: "founder_os",
  kind: "long_term",
  title: "Speculative whitepaper for unproven niche",
  expected_revenue_usd: 200,
  speed_to_cash_days: 120,
  effort: "high",
  risk: "high",
  confidence: 0.15,
  founder_time_hours: 2,
  strategic_value: "low",
  repeatability: "one_time",
  margin: "low",
  probability_of_close: 0.1,
});
assert.ok(weak.status === "pause" || weak.status === "kill", "weak low-value opportunity is paused or killed");
assert.ok(weak.score < hot.score, "weak scores below hot");

// A high-risk partnership (legal/financial) — drives approval_required on its money action.
e.addOpportunity(TENANT, {
  business: "black_flag",
  kind: "partnership",
  title: "Major-gift donor partnership",
  description: "Mission-aligned major gift; needs legal + founder sign-off.",
  expected_revenue_usd: 75_000,
  speed_to_cash_days: 10,
  effort: "low",
  risk: "high",
  confidence: 0.7,
  founder_time_hours: 2,
  strategic_value: "high",
  repeatability: "one_time",
  margin: "high",
  probability_of_close: 0.6,
});

// An underpriced offer opportunity → reprice.
const under = e.addOpportunity(TENANT, {
  business: "move_mi",
  kind: "underpriced_offer",
  title: "Local move package priced below market",
  expected_revenue_usd: 1_200,
  speed_to_cash_days: 7,
  effort: "low",
  risk: "low",
  confidence: 0.8,
  founder_time_hours: 0.5,
  strategic_value: "medium",
  repeatability: "repeatable",
  margin: "low",
  probability_of_close: 0.7,
});
assert.equal(under.status, "reprice", "underpriced_offer kind maps to reprice");

// A weak funnel blocker.
e.addOpportunity(TENANT, {
  business: "divini_partners",
  kind: "weak_funnel",
  title: "Activation step leaking signups",
  expected_revenue_usd: 8_000,
  speed_to_cash_days: 20,
  effort: "medium",
  risk: "medium",
  confidence: 0.6,
  founder_time_hours: 1,
  strategic_value: "high",
  repeatability: "recurring",
  margin: "high",
  probability_of_close: 0.5,
});

// 2. Ranking is by score desc.
const ranked = e.rankOpportunities(TENANT);
assert.equal(ranked.length, 5, "all opportunities ranked");
for (let i = 1; i < ranked.length; i++) {
  assert.ok(ranked[i - 1]!.score >= ranked[i]!.score, "ranked by score descending");
}

// 3. Offer review flags an underpriced offer with a missing payment link.
const review = e.reviewOffer(TENANT, {
  business: "move_mi",
  offer_name: "Premium relocation bundle",
  price_usd: 400,
  price_floor_usd: 900,
  has_clear_scope: true,
  has_cta: true,
  has_deposit: false,
  has_payment_link: false,
  is_custom_work: true,
  is_consulting: false,
  is_paid: true,
  notes: "Sent draft for review.",
});
assert.ok(review.flags.includes("underpricing"), "flags underpricing below floor");
assert.ok(review.flags.includes("missing_payment_link"), "flags missing payment link");
assert.ok(review.flags.includes("missing_deposit"), "flags missing deposit");
assert.equal(review.verdict, "hold", "missing payment link forces a hold verdict");
assert.ok(review.recommended_price_usd !== null && review.recommended_price_usd >= 900, "recommends lifting to floor");

// 4. Seed default missions → exactly 6 businesses.
const missions = e.seedDefaultMissions(TENANT);
assert.equal(missions.length, 6, "six default business missions seeded");
assert.equal(e.listMissions(TENANT).length, 6, "exactly six missions stored (idempotent upsert)");
assert.ok(
  missions.every((m) => m.objectives.length > 0 && m.status === "active"),
  "each seeded mission has objectives and is active",
);
// Re-seeding does not duplicate.
e.seedDefaultMissions(TENANT);
assert.equal(e.listMissions(TENANT).length, 6, "re-seeding stays at six missions");

// 5. Build command center → >=1 top money action, approval set correctly on high-risk.
const center = e.buildCommandCenter(TENANT, "2026-06-26");
assert.ok(center.top_money_actions.length >= 1, "command center derives at least one money action");
assert.ok(center.revenue_blockers.length >= 1, "weak-funnel opportunity surfaced as a blocker");
assert.ok(center.payment_links_needed.length >= 1, "offer missing a payment link surfaced");

const actions = e.listMoneyActions(TENANT);
const blackFlagAction = actions.find((a) => a.business === "black_flag");
assert.ok(blackFlagAction, "the high-risk black_flag opportunity produced a money action");
assert.equal(blackFlagAction!.approval_required, true, "high-risk / partnership / black_flag action requires approval");
const cleanAction = actions.find((a) => a.business === "divini_procure");
assert.ok(cleanAction, "the clean fast-cash opportunity produced a money action");
assert.equal(cleanAction!.approval_required, false, "low-risk clean action does not require approval");

// advanceMoneyAction lifecycle.
const advanced = e.advanceMoneyAction(TENANT, cleanAction!.id);
assert.equal(advanced.status, "in_progress", "money action advances todo -> in_progress");

// 6. Funnel stage record.
const funnel = e.recordFunnelStage(TENANT, {
  business: "divini_partners",
  stage: "activation",
  health: "leaking",
  notes: "Drop-off at activation.",
  recommended_action: "Add guided onboarding.",
});
assert.equal(funnel.health, "leaking", "funnel stage health recorded");

// 7. KPIs return a snapshot.
const kpis = e.revenueKpis(TENANT);
assert.equal(kpis.tenant_id, TENANT, "kpi snapshot scoped to tenant");
assert.equal(kpis.leads, 5, "kpi counts all opportunities as leads");
assert.ok(kpis.qualified_leads >= 1, "at least one pursue_now opportunity counts as qualified");
assert.ok(kpis.recurring_revenue > 0, "recurring revenue aggregated");
assert.ok(kpis.time_to_cash > 0, "time_to_cash computed from pursue_now opportunities");

// Tenant isolation.
assert.equal(e.listOpportunities("00000000-0000-0000-0000-0000000000ff").length, 0, "another tenant sees nothing");

console.log(
  "REVENUE COMMAND (CRO) SMOKE OK — opportunities scored, command center built, missions seeded",
);
