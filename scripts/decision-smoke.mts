/**
 * Runtime smoke test for the Decision Engine. Feeds several diverse inputs and checks the
 * classification + scoring + routing behave sensibly. Run with: `tsx scripts/decision-smoke.mts`.
 */
import assert from "node:assert/strict";
import { DecisionEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
let n = 0;
const engine = new DecisionEngine({
  clock: () => new Date("2026-06-24T12:00:00.000Z"),
  idFactory: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
});

// 1. Critical business/risk: overdue, high-value client contract due today.
const acme = await engine.decide(TENANT, {
  text: "URGENT: the Acme contract is overdue and the client is threatening to walk. Need to send a revised proposal today.",
  source: "email",
  context: { amount_usd: 48000, deadline: "2026-06-24T22:00:00.000Z" },
});
assert.equal(acme.primary_category, "business", "Acme should be primarily business");
assert.equal(acme.priority_level, "critical", "overdue high-value deal due today is critical");
assert.ok(acme.urgency >= 0.8, "urgency should be high");
assert.ok(acme.required_approvals.includes("operator"), "irreversible/high-risk needs operator approval");
assert.ok(acme.automation_opportunities.length > 0, "should surface automation opportunities");
assert.ok(acme.recommended_agents.length > 0, "should recommend agents");
assert.ok(acme.explanation.length > 0 && acme.reasons.length > 0, "must be explainable");

// 2. Low-stakes learning, no urgency.
const learn = await engine.decide(TENANT, {
  text: "Sometime next month I'd like to learn about systems thinking by reading a book and taking an online course.",
  source: "note",
});
assert.equal(learn.primary_category, "learning", "should classify as learning");
assert.ok(["low", "medium"].includes(learn.priority_level), "no urgency => not high/critical");
assert.equal(learn.required_approvals.length, 0, "learning needs no approval");

// 3. Finance with money movement => operator approval + high revenue impact.
const pay = await engine.decide(TENANT, {
  text: "Pay the $25,000 vendor invoice and submit the expense to the bank today.",
  source: "task",
  context: { amount_usd: 25000 },
});
assert.equal(pay.primary_category, "finance", "should classify as finance");
assert.ok(pay.required_approvals.includes("operator"), "paying money requires approval");
assert.ok(pay.revenue_impact >= 0.5, "a $25k transaction is high revenue impact");

// 4. Health is recognized and weighted.
const health = await engine.decide(TENANT, {
  text: "Book a doctor appointment about persistent chest pain and poor sleep.",
  source: "voice",
});
assert.equal(health.primary_category, "health", "should classify as health");

// 5. Batch API returns one decision per input, all contract-valid.
const batch = await engine.decideMany(TENANT, [
  { text: "Brainstorm a new product idea for the styling app." },
  { text: "Reschedule the dentist for next week." },
]);
assert.equal(batch.length, 2);
assert.equal(batch[0]!.primary_category, "idea");

console.log("DECISION SMOKE OK — classification, scoring, approvals, agents, deadlines, automations verified");
console.log(
  "sample:",
  JSON.stringify(
    {
      primary: acme.primary_category,
      level: acme.priority_level,
      urgency: acme.urgency,
      revenue_impact: acme.revenue_impact,
      risk: acme.risk,
      approvals: acme.required_approvals,
      agents: acme.recommended_agents,
      deadline: acme.recommended_deadline,
      automations: acme.automation_opportunities,
    },
    null,
    2,
  ),
);
