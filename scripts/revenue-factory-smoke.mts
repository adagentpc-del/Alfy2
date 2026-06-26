/**
 * Runtime smoke for the Revenue Factory. Proves it computes the daily money directive from a business
 * snapshot — fastest path to cash, easiest offer, best warm contact, lowest-effort action, highest-value
 * follow-up, offer most likely to convert, and the headline "what do we do today to make money?".
 * Run with: `tsx scripts/revenue-factory-smoke.mts`.
 */
import assert from "node:assert/strict";
import { RevenueFactory } from "@alfy2/core";
import { RevenueFactoryInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
const factory = new RevenueFactory({ clock: () => NOW });

const report = factory.report(TENANT, RevenueFactoryInputSchema.parse({
  business_name: "Move Mi",
  offers: [
    { name: "Local Move Package", price_usd: 1800, conversion_rate: 0.4, ease: 0.9 },
    { name: "Full-Service Relocation", price_usd: 9000, conversion_rate: 0.5, ease: 0.3 },
  ],
  contacts: [
    { name: "Acme Corp", temperature: "warm", affinity: 0.8, potential_value_usd: 18000, is_referral_source: false },
    { name: "Dana (realtor)", temperature: "warm", affinity: 0.6, potential_value_usd: 4000, is_referral_source: true },
    { name: "Cold Lead Co", temperature: "cold", affinity: 0.1, potential_value_usd: 2000, is_referral_source: false },
  ],
  proposals: [
    { contact_name: "Acme Corp", offer_name: "Full-Service Relocation", value_usd: 24000, probability: 0.6, age_days: 8 },
    { contact_name: "Beta LLC", offer_name: "Local Move Package", value_usd: 1800, probability: 0.3, age_days: 2 },
  ],
  follow_ups: [
    { contact_name: "Dana (realtor)", value_usd: 4000, effort: 0.1 },
    { contact_name: "Acme Corp", value_usd: 24000, effort: 0.5 },
  ],
  booked_calls: 3,
  revenue_generated_usd: 12000,
}));

// === 1. Headline money move + fastest path to cash (highest expected value). ===
assert.ok(report.todays_money_move.length > 0, "today's money move present");
assert.ok(report.fastest_path_to_cash.includes("Acme Corp"), "fastest path = highest-EV proposal (Acme $24k×0.6)");
console.log(`[1] today's money move: "${report.todays_money_move}" ✔`);

// === 2. Easiest offer (highest ease) vs offer most likely to convert (highest conversion). ===
assert.equal(report.easiest_offer_to_sell, "Local Move Package", "easiest = highest ease");
assert.equal(report.offer_most_likely_to_convert, "Full-Service Relocation", "most likely = highest conversion");
console.log("[2] easiest offer vs most-likely-to-convert distinguished ✔");

// === 3. Best warm contact = warm, max affinity×value. ===
assert.equal(report.best_warm_contact, "Acme Corp", "best warm = Acme (0.8×18000)");
console.log("[3] best warm contact ✔");

// === 4. Lowest-effort action vs highest-value follow-up. ===
assert.ok(report.lowest_effort_revenue_action!.includes("Dana"), "lowest effort = Dana (0.1)");
assert.ok(report.highest_value_follow_up!.includes("Acme"), "highest value = Acme ($24k)");
console.log("[4] lowest-effort action vs highest-value follow-up ✔");

// === 5. Lead counts + open proposal value. ===
assert.equal(report.warm_lead_count, 2);
assert.equal(report.cold_lead_count, 1);
assert.equal(report.referral_source_count, 1);
assert.equal(report.open_proposal_value_usd, 25800);
console.log("[5] warm/cold/referral counts + open proposal value ✔");

console.log(
  "\nREVENUE FACTORY SMOKE OK — computes fastest path to cash, easiest offer, best warm contact, lowest-effort action, highest-value follow-up, offer most likely to convert, and the headline 'what do we do today to make money?'.",
);
