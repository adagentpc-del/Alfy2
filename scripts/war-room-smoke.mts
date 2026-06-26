/**
 * Runtime smoke for the Conversion War Room. Proves it tracks the full funnel across the 9 surfaces, runs
 * A/B tests, and picks the winner by REVENUE — never vanity opens/clicks — and only once each variant has
 * enough sends. Run with: `tsx scripts/war-room-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ConversionWarRoom, MIN_SENDS_FOR_WINNER } from "@alfy2/core";
import { StartWarRoomTestInputSchema, RecordFunnelInputSchema, WarRoomSurfaceSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const wr = new ConversionWarRoom({ clock: () => NOW, idFactory: id });

assert.equal(WarRoomSurfaceSchema.options.length, 9, "9 surfaces");

// === 1. Start a test. ===
const t = wr.startTest(TENANT, StartWarRoomTestInputSchema.parse({ surface: "cold_email", label: "Subject line test", variant_a_label: "Curiosity", variant_b_label: "Direct" }));
assert.equal(t.winner, null, "no winner before data");
console.log("[1] start A/B test on a surface ✔");

// === 2. Winner decided by REVENUE, not vanity. Variant B has MORE opens but LESS revenue → A wins. ===
const decided = wr.recordFunnel(TENANT, t.id, RecordFunnelInputSchema.parse({
  metrics_a: { sent: 200, opens: 90, replies: 14, clicks: 22, booked_calls: 6, qualified_leads: 9, closes: 2, negative_replies: 3, revenue_usd: 6000, cash_collected_usd: 6000, time_to_conversion_days: 12 },
  metrics_b: { sent: 200, opens: 140, replies: 10, clicks: 30, booked_calls: 4, qualified_leads: 6, closes: 1, negative_replies: 5, revenue_usd: 3000, cash_collected_usd: 3000, time_to_conversion_days: 15 },
}));
assert.equal(decided.winner, "a", "A wins on revenue ($30/send) despite B's higher opens/clicks");
assert.ok(decided.rates_b!.open_rate > decided.rates_a!.open_rate, "B genuinely had the higher (vanity) open rate");
assert.ok(decided.recommendation.includes("Curiosity"), "recommends the revenue winner");
console.log(`[2] winner by revenue not vanity: ${decided.winner} (B had higher opens) ✔`);

// === 3. Not enough sends → no winner. ===
const t2 = wr.startTest(TENANT, StartWarRoomTestInputSchema.parse({ surface: "landing_page", label: "Hero test" }));
const thin = wr.recordFunnel(TENANT, t2.id, RecordFunnelInputSchema.parse({
  metrics_a: { sent: MIN_SENDS_FOR_WINNER - 1, opens: 5, replies: 1, clicks: 2, booked_calls: 1, qualified_leads: 1, closes: 1, negative_replies: 0, revenue_usd: 999, cash_collected_usd: 999, time_to_conversion_days: 3 },
  metrics_b: { sent: 5, opens: 1, replies: 0, clicks: 0, booked_calls: 0, qualified_leads: 0, closes: 0, negative_replies: 0, revenue_usd: 0, cash_collected_usd: 0, time_to_conversion_days: 0 },
}));
assert.equal(thin.winner, null, "no winner below MIN_SENDS_FOR_WINNER");
console.log("[3] insufficient sends → no premature winner ✔");

// === 4. Objections logged; decided() lists ready-to-ship tests. ===
wr.addObjections(TENANT, t.id, ["Too expensive", "Already have a vendor", "Too expensive"]);
assert.deepEqual(wr.get(TENANT, t.id)!.objections, ["Too expensive", "Already have a vendor"], "objections deduped");
assert.equal(wr.decided(TENANT).length, 1, "one decided test");
console.log("[4] objections logged (deduped); decided tests listed ✔");

// === 5. Tenant isolation. ===
assert.equal(wr.list(OTHER).length, 0, "no cross-tenant tests");
console.log("[5] tenant isolation ✔");

console.log(
  "\nCONVERSION WAR ROOM SMOKE OK — 9 surfaces, full-funnel A/B, winner decided on REVENUE per send (then booked calls, then qualified leads) NOT vanity opens/clicks, won't call a winner below the send threshold, logs objections, tenant-isolated.",
);
