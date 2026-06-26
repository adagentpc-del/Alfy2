/**
 * Runtime smoke for the RevOps revenue-brief engine (Release 6). Proves that, given a fixed-clock /
 * fixed-now read-model fixture (three open opportunities — $2400@0.8/3d, $5800@0.5/10d, $1500@0.6/2d —
 * plus one stalled deal updated 20 days ago and two money actions), `brief` deterministically reports
 * the pipeline value, open count, at least one stalled deal, and top opportunities sorted by score; and
 * that `fastestPath(6000)` greedily reaches the target (or consumes all opps) with positive projected
 * days. Run with: `tsx scripts/revops-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  RevOpsEngine,
  InMemoryRevOpsReadModel,
  type RevOpsAggregate,
} from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
const nowMs = NOW.getTime();
const daysAgo = (n: number): string => new Date(nowMs - n * 24 * 60 * 60 * 1000).toISOString();

let idN = 0;
const idFactory = (): string => {
  idN += 1;
  return `00000000-0000-0000-0000-${String(idN).padStart(12, "0")}`;
};

// Three open opportunities + one stalled (updated 20 days ago).
const fixture: RevOpsAggregate = {
  as_of: NOW.toISOString(),
  opportunities: [
    {
      id: "opp-a",
      title: "Acme renewal",
      business: "alfy",
      expected_revenue_usd: 2400,
      probability: 0.8,
      score: 90,
      speed_to_cash_days: 3,
      status: "qualified",
      updated_at: daysAgo(1),
    },
    {
      id: "opp-b",
      title: "Big enterprise deal",
      business: "alfy",
      expected_revenue_usd: 5800,
      probability: 0.5,
      score: 80,
      speed_to_cash_days: 10,
      status: "proposal",
      updated_at: daysAgo(2),
    },
    {
      id: "opp-c",
      title: "Quick upsell",
      business: "alfy",
      expected_revenue_usd: 1500,
      probability: 0.6,
      score: 70,
      speed_to_cash_days: 2,
      status: "meeting",
      updated_at: daysAgo(3),
    },
    {
      // Stalled: open but untouched for 20 days → days_stalled > 14.
      id: "opp-stalled",
      title: "Forgotten lead",
      business: "alfy",
      expected_revenue_usd: 900,
      probability: 0.3,
      score: 40,
      speed_to_cash_days: 5,
      status: "lead",
      updated_at: daysAgo(20),
    },
    {
      // Closed → excluded from every open computation.
      id: "opp-closed",
      title: "Already won",
      business: "alfy",
      expected_revenue_usd: 9999,
      probability: 1,
      score: 100,
      speed_to_cash_days: 1,
      status: "closed_won",
      updated_at: daysAgo(1),
    },
  ],
  money_actions: [
    {
      id: "act-due",
      action: "Send invoice to Acme",
      business: "alfy",
      expected_revenue_usd: 2400,
      due: daysAgo(1), // past due → included
      status: "open",
    },
    {
      id: "act-undated",
      action: "Follow up on upsell",
      business: "alfy",
      expected_revenue_usd: 1500,
      due: null, // undated → included
      status: "open",
    },
  ],
};

const readModel = new InMemoryRevOpsReadModel(fixture);
const engine = new RevOpsEngine(readModel, {
  clock: () => NOW,
  idFactory,
  nowMs: () => nowMs,
});

// === brief ===
const brief = await engine.brief(TENANT, "alfy");

const EXPECTED_PIPELINE = 2400 + 5800 + 1500 + 900; // four open opps (closed excluded)
assert.equal(
  brief.pipeline_value_usd,
  EXPECTED_PIPELINE,
  `pipeline_value_usd must sum open opps (${EXPECTED_PIPELINE})`,
);
console.log(`[1] pipeline_value_usd = ${brief.pipeline_value_usd} ✔`);

assert.equal(brief.open_opportunities, 4, "open_opportunities counts open opps only (closed excluded)");
console.log(`[2] open_opportunities = ${brief.open_opportunities} ✔`);

assert.ok(brief.stalled_deals.length >= 1, "expected at least one stalled deal");
assert.ok(
  brief.stalled_deals.some((d) => d.id === "opp-stalled" && d.days_stalled >= 14),
  "the 20-day-old open opp is stalled with days_stalled >= 14",
);
console.log(`[3] stalled_deals length = ${brief.stalled_deals.length} ✔`);

const scores = brief.top_opportunities.map((t) => t.score);
const sortedDesc = [...scores].sort((a, b) => b - a);
assert.deepEqual(scores, sortedDesc, "top_opportunities sorted by score desc");
assert.ok(brief.top_opportunities.length <= 5, "top_opportunities capped at 5");
assert.equal(brief.top_opportunities[0]?.id, "opp-a", "highest score surfaces first");
console.log(`[4] top_opportunities sorted by score (top=${brief.top_opportunities[0]?.id}) ✔`);

assert.equal(brief.money_actions_due.length, 2, "both money actions are due");
console.log(`[5] money_actions_due length = ${brief.money_actions_due.length} ✔`);

// === fastestPath ===
const plan = await engine.fastestPath(TENANT, { target_usd: 6000, business: "alfy" });
const totalOpenExpected = 2400 * 0.8 + 5800 * 0.5 + 1500 * 0.6 + 900 * 0.3; // 5210
assert.ok(
  plan.projected_total_usd >= 6000 || plan.steps.length === 4,
  "fastestPath reaches 6000 or consumes all open opps",
);
assert.ok(plan.projected_days > 0, "projected_days is positive once steps exist");
assert.ok(plan.steps.every((s) => s.action.startsWith("Advance: ")), "each step action is 'Advance: ...'");
console.log(
  `[6] fastestPath steps=${plan.steps.length} projected_total=${plan.projected_total_usd.toFixed(0)} (max open ${totalOpenExpected.toFixed(0)}) projected_days=${plan.projected_days} ✔`,
);

console.log(
  "\nREVOPS SMOKE OK — brief() over a fixed-now read-model sums the open pipeline ($10,600 across 4 open opps, closed excluded), counts 4 open opportunities, flags the 20-day-old deal as stalled, returns the two due money actions, and lists top opportunities sorted by score; fastestPath(6000) greedily ranks open opps by expected-value-per-day and either reaches the target or consumes all opps with positive projected days.",
);
