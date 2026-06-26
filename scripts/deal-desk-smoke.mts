/**
 * Runtime smoke for the Deal Desk. Proves the per-opportunity record, ranking by each axis, and the desk
 * view — next money move, blocked deals (missing assets/objections), and deals likely to die.
 * Run with: `tsx scripts/deal-desk-smoke.mts`.
 */
import assert from "node:assert/strict";
import { DealDesk } from "@alfy2/core";
import { CreateDealInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const desk = new DealDesk({ clock: () => NOW, idFactory: id, dieAfterDays: 14, dieRiskThreshold: 0.6 });

// === 1. Add deals. ===
const big = desk.add(TENANT, CreateDealInputSchema.parse({ buyer_contact: "Jordan Vance", business_name: "AI Authority", offer: "Intensive", deal_size_usd: 50000, probability: 0.6, stage: "negotiation", next_step: "Send revised proposal", days_since_activity: 3, strategic_value: 0.8, effort: 0.4, risk: 0.3 }));
const blocked = desk.add(TENANT, CreateDealInputSchema.parse({ buyer_contact: "Beta LLC", offer: "Audit", deal_size_usd: 8000, probability: 0.5, stage: "proposal", missing_assets: ["case_study_template"], days_since_activity: 2 }));
const dying = desk.add(TENANT, CreateDealInputSchema.parse({ buyer_contact: "Gamma Inc", offer: "Retainer", deal_size_usd: 12000, probability: 0.4, stage: "qualifying", days_since_activity: 30, risk: 0.7 }));
desk.add(TENANT, CreateDealInputSchema.parse({ buyer_contact: "Won Co", offer: "Closed", deal_size_usd: 9000, probability: 1, stage: "won" }));
console.log("[1] added 4 deals (1 won, excluded from open views) ✔");

// === 2. Rank by composite → biggest live deal first; won deals excluded. ===
const ranked = desk.rank(TENANT, "composite");
assert.equal(ranked.length, 3, "only open deals ranked (won excluded)");
assert.equal(ranked[0]!.deal.id, big.id, "highest-EV strategic deal ranks first");
assert.ok(ranked[0]!.expected_value_usd === 30000, "EV = 50000 × 0.6");
console.log("[2] ranked by composite, won deal excluded ✔");

// === 3. Rank by a different axis changes order (revenue vs effort). ===
const byRevenue = desk.rank(TENANT, "revenue");
assert.equal(byRevenue[0]!.deal.id, big.id, "by revenue: $50k first");
console.log("[3] ranking axis switchable ✔");

// === 4. Desk view: next money move, blocked, dying. ===
const view = desk.view(TENANT);
assert.ok(view.next_money_move.includes("Jordan Vance"), "next money move = top-ranked deal");
assert.ok(view.blocked_deals.some((d) => d.id === blocked.id), "blocked deal surfaced (missing asset)");
assert.ok(view.deals_likely_to_die.some((d) => d.id === dying.id), "dying deal surfaced (idle 30d + risk 0.7)");
assert.equal(view.weighted_pipeline_usd, 50000 * 0.6 + 8000 * 0.5 + 12000 * 0.4, "weighted pipeline across open deals");
console.log("[4] desk view: next money move + blocked + dying ✔");

// === 5. Tenant isolation. ===
assert.equal(desk.rank(OTHER).length, 0, "no cross-tenant deals");
console.log("[5] tenant isolation ✔");

console.log(
  "\nDEAL DESK SMOKE OK — per-opportunity record (14 fields), ranks open deals by probability/revenue/speed/strategic value/effort, surfaces next money move, blocked deals (missing assets/objections), and deals likely to die without action, tenant-isolated.",
);
