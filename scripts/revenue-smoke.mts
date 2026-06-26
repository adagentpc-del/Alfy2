/**
 * Runtime smoke for the Revenue Command System. Proves that from a business's revenue snapshot it
 * computes the six things Alfy² must always know: fastest path to cash, easiest offer to sell, best lead
 * source, highest-ROI campaign, stuck deals, and the next money action. Run with:
 * `tsx scripts/revenue-smoke.mts`.
 */
import assert from "node:assert/strict";
import { RevenueCommandSystem } from "@alfy2/core";
import { RevenueProfileInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const rcs = new RevenueCommandSystem({ clock: () => NOW, idFactory: id });

const intel = rcs.intel(TENANT, RevenueProfileInputSchema.parse({
  business_name: "Move Mi",
  offers: [
    { name: "Monthly retainer", price_usd: 800, conversion_rate: 0.09 },
    { name: "One-off move", price_usd: 1200, conversion_rate: 0.04 },
  ],
  pipeline: [
    { name: "Acme Corp", value_usd: 18000, probability: 0.7, days_to_close: 10, idle_days: 2 },
    { name: "Globex", value_usd: 9000, probability: 0.5, days_to_close: 40, idle_days: 21 },
  ],
  leads: [
    { name: "Referral partners", leads: 40, conversion_rate: 0.12 },
    { name: "Cold outreach", leads: 200, conversion_rate: 0.02 },
  ],
  campaigns: [
    { name: "Retainer upsell", roi: 24.8, status: "active" },
    { name: "Brand awareness", roi: 1.2, status: "active" },
  ],
  cash_opportunities: [
    { description: "Collect overdue invoice", value_usd: 4000, probability: 0.9, days_to_cash: 7 },
  ],
  open_follow_ups: 5,
  revenue_goal_usd: 50000,
  stuck_after_days: 14,
}));

// === 1. Fastest path to cash. ===
assert.ok(/Acme Corp/.test(intel.fastest_path_to_cash), "fastest path = highest expected value per day (Acme)");
console.log(`[1] fastest path to cash: ${intel.fastest_path_to_cash} ✔`);

// === 2. Easiest offer to sell (highest conversion). ===
assert.ok(/Monthly retainer/.test(intel.easiest_offer_to_sell), "easiest offer = highest conversion");
console.log("[2] easiest offer to sell ✔");

// === 3. Best lead source (conversion × volume). ===
assert.ok(/Referral partners/.test(intel.best_lead_source), "best lead source by conversion × volume");
console.log("[3] best lead source ✔");

// === 4. Highest-ROI campaign. ===
assert.ok(/Retainer upsell/.test(intel.highest_roi_campaign), "highest ROI campaign");
console.log("[4] highest ROI campaign ✔");

// === 5. Stuck deals + weighted pipeline. ===
assert.ok(intel.stuck_deals.some((d) => /Globex/.test(d)), "Globex flagged stuck (idle 21 > 14)");
assert.ok(!intel.stuck_deals.some((d) => /Acme/.test(d)), "Acme not stuck (idle 2)");
assert.ok(intel.weighted_pipeline_usd > 0, "weighted pipeline computed");
console.log(`[5] stuck deals (${intel.stuck_deals.length}) + weighted pipeline ($${intel.weighted_pipeline_usd}) ✔`);

// === 6. Next money action + tenant isolation. ===
assert.ok(intel.next_money_action.length > 0 && /Acme/.test(intel.next_money_action), "next money action targets fastest cash");
assert.equal(rcs.list(OTHER).length, 0, "no cross-tenant snapshots");
console.log("[6] next money action; tenant isolation ✔");

console.log(
  "\nREVENUE COMMAND SYSTEM SMOKE OK — computes fastest path to cash, easiest offer to sell, best lead source, highest-ROI campaign, stuck deals, weighted pipeline, and the next money action, tenant-isolated.",
);
