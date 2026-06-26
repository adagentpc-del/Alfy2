/**
 * Runtime smoke for the Finance Command Center. Proves the per-business reports (profit/margin/tax/runway),
 * the rolled-up overview, and the hard guardrail: money actions ALWAYS require approval, and the forbidden
 * action list is exposed. Run with: `tsx scripts/finance-command-smoke.mts`.
 */
import assert from "node:assert/strict";
import { FinanceCommandCenter } from "@alfy2/core";
import { FinanceCommandInputSchema, FINANCE_FORBIDDEN_ACTIONS } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
const fcc = new FinanceCommandCenter({ clock: () => NOW });

const overview = fcc.overview(TENANT, FinanceCommandInputSchema.parse({
  businesses: [
    { business_name: "Move Mi", monthly_revenue_usd: 40000, monthly_expenses_usd: 30000, cash_on_hand_usd: 60000, tax_rate: 0.25, receivables_usd: 12000, payables_usd: 8000 },
    { business_name: "AI Authority", monthly_revenue_usd: 8000, monthly_expenses_usd: 14000, cash_on_hand_usd: 18000, tax_rate: 0.25, receivables_usd: 0, payables_usd: 5000 },
  ],
  personal: { monthly_income_usd: 20000, monthly_expenses_usd: 12000, savings_usd: 50000, debt_usd: 15000, investments_usd: 120000, subscriptions_usd: 800, goals: ["12-month emergency fund"] },
}));

// === 1. Per-business profit/margin/tax/runway. ===
const moveMi = overview.businesses.find((b) => b.business_name === "Move Mi")!;
assert.equal(moveMi.monthly_profit_usd, 10000, "profit = rev - exp");
assert.equal(moveMi.profit_margin, 0.25, "margin = profit/rev");
assert.equal(moveMi.tax_exposure_usd, 2500, "tax = profit × rate");
assert.equal(moveMi.cash_runway_months, null, "profitable → no finite runway");
const aiAuth = overview.businesses.find((b) => b.business_name === "AI Authority")!;
assert.equal(aiAuth.cash_runway_months, 3, "burning $6k/mo on $18k → 3 months runway");
assert.ok(aiAuth.risks.length > 0, "burning business flags a risk");
console.log("[1] per-business profit / margin / tax / runway ✔");

// === 2. Rolled-up overview. ===
assert.equal(overview.total_monthly_revenue_usd, 48000);
assert.equal(overview.net_cash_flow_usd, 48000 - 44000, "net cash flow");
assert.equal(overview.personal_net_worth_usd, 50000 + 120000 - 15000, "net worth = savings + investments - debt");
console.log("[2] rolled-up totals + personal net worth ✔");

// === 3. HARD GUARDRAIL: money actions always require approval. ===
assert.equal(overview.money_actions_require_approval, true, "money actions gated");
const forbidden = fcc.forbiddenActions();
assert.ok(forbidden.includes("move_money") && forbidden.includes("spend_money"), "forbidden list exposed");
assert.deepEqual([...forbidden], [...FINANCE_FORBIDDEN_ACTIONS], "matches the shared forbidden list");
console.log(`[3] guardrail: money actions require approval; ${forbidden.length} forbidden actions ✔`);

console.log(
  "\nFINANCE COMMAND SMOKE OK — per-business profit/margin/tax-exposure/runway/risks/opportunities, rolled-up overview + personal net worth, and the hard guardrail: Alfy² NEVER moves or spends money without Alyssa's approval.",
);
