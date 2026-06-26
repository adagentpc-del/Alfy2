/**
 * Runtime smoke for the Founder Operating Principle. Proves every idea resolves to exactly one disposition
 * (never dies in notes), every business always gets its five next actions, and the optimization order is
 * cash-first. Run with: `tsx scripts/founder-principle-smoke.mts`.
 */
import assert from "node:assert/strict";
import { FounderPrinciple, OPTIMIZATION_ORDER } from "@alfy2/core";
import { IdeaSignalsSchema, NextActionsInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const fp = new FounderPrinciple({ clock: () => NOW, idFactory: id });

const route = (idea: string, sig: Partial<Record<string, unknown>>) => fp.route(TENANT, idea, IdeaSignalsSchema.parse(sig));

// === 1. Every idea resolves to exactly one of the 8 dispositions — never dies in notes. ===
assert.equal(route("Productize the audit", { value: 0.8, revenue_linked: true }).disposition, "offer");
assert.equal(route("Run a launch campaign", { value: 0.4, revenue_linked: true }).disposition, "campaign");
assert.equal(route("Automate lead triage", { value: 0.6, recurring: true }).disposition, "agent");
assert.equal(route("Standardize onboarding steps", { value: 0.3, recurring: true }).disposition, "workflow");
assert.equal(route("Write a reusable one-pager", { value: 0.4, reusable: true }).disposition, "asset");
assert.equal(route("Email the lawyer today", { value: 0.4, actionable_now: true }).disposition, "task");
assert.equal(route("Maybe a podcast someday", { value: 0.4 }).disposition, "parked_idea");
assert.equal(route("Buy a billboard on the moon", { value: 0.05 }).disposition, "killed_idea");
console.log("[1] every idea → one of 8 dispositions (never dies in notes) ✔");

// === 2. inMotion excludes parked/killed. ===
const motion = fp.inMotion(TENANT);
assert.ok(motion.every((d) => d.disposition !== "parked_idea" && d.disposition !== "killed_idea"), "in-motion excludes parked/killed");
assert.equal(motion.length, 6, "6 of 8 are in motion");
console.log(`[2] ${motion.length} ideas in motion (parked/killed excluded) ✔`);

// === 3. Every business always gets all five next actions, even with no candidates. ===
const empty = fp.nextActions(NextActionsInputSchema.parse({ business_name: "Move Mi" }));
for (const k of ["next_money_action", "next_risk_action", "next_follow_up_action", "next_asset_to_build", "next_conversion_improvement"] as const) {
  assert.ok(empty[k].length > 0, `${k} always present`);
}
const filled = fp.nextActions(NextActionsInputSchema.parse({ business_name: "Move Mi", money_candidate: "Close the Acme proposal", risk_candidate: "Renew expiring insurance" }));
assert.equal(filled.next_money_action, "Close the Acme proposal", "uses provided candidate");
assert.ok(filled.next_conversion_improvement.length > 0, "blank candidate still filled with default");
console.log("[3] every business always has all 5 next actions ✔");

// === 4. Optimization order is cash-first. ===
assert.deepEqual(OPTIMIZATION_ORDER, ["cash", "conversion", "follow_up", "risk_control", "execution_speed", "founder_energy", "reusable_ip"]);
console.log("[4] optimization order: cash > conversion > follow-up > risk > speed > energy > IP ✔");

console.log(
  "\nFOUNDER OPERATING PRINCIPLE SMOKE OK — every idea resolves to exactly one of task/asset/campaign/offer/agent/workflow/parked/killed (never dies in notes); every business always has its 5 next actions (money/risk/follow-up/asset/conversion); optimization order is cash-first.",
);
