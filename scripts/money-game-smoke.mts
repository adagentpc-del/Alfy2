/**
 * Runtime smoke for the Elite Money Game Engine. Proves the catalog covers all seventeen strategy kinds,
 * an assembled plan protects downside first and is legal-avoidance-only with a relevant strategy subset and
 * the standing disclaimer. Education and analysis only — legal tax avoidance, never evasion. Tenant-scoped.
 * Run with: `tsx scripts/money-game-smoke.mts`.
 */
import assert from "node:assert/strict";
import { EliteMoneyGameEngine } from "@alfy2/core";
import { MoneyGameInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new EliteMoneyGameEngine({ clock: () => NOW, idFactory });

// === 1. The catalog covers all seventeen strategy kinds. ===
const catalog = engine.catalog();
assert.equal(catalog.length, 17, "catalog has 17 strategies");
console.log(`[1] catalog covers all ${catalog.length} strategy kinds ✔`);

// === 2. An assembled plan protects downside first and is legal-avoidance-only. ===
const plan = engine.analyze(
  TENANT,
  MoneyGameInputSchema.parse({
    subject: "Alyssa's portfolio",
    annual_profit_usd: 300000,
    owns_business: true,
    owns_ip: true,
    has_real_estate: true,
    focus: [],
  }),
);
assert.equal(plan.protect_downside_first, true, "protect downside first");
assert.equal(plan.legal_avoidance_only, true, "legal avoidance only");
console.log("[2] plan protects downside first; legal avoidance only ✔");

// === 3. The plan carries a relevant subset of strategies. ===
assert.ok(plan.strategies.length > 0, "strategies non-empty");
console.log(`[3] plan assembled ${plan.strategies.length} relevant strategies ✔`);

// === 4. The standing disclaimer is present. ===
assert.ok(plan.disclaimer.length > 0, "disclaimer present");
const lower = plan.disclaimer.toLowerCase();
assert.ok(lower.includes("never evasion"), "disclaimer: legal avoidance, never evasion");
console.log("[4] disclaimer present: legal avoidance, never evasion ✔");

// === 5. Tenant isolation on stored plans. ===
assert.ok(engine.get(TENANT, plan.id), "own tenant can read its plan");
assert.equal(engine.get("00000000-0000-0000-0000-000000000002", plan.id), undefined, "other tenant cannot");
console.log("[5] tenant isolation on stored plans ✔");

console.log(
  "\nMONEY GAME SMOKE OK — a seventeen-strategy catalog, plans that protect downside first and stay legal-avoidance-only with a relevant strategy subset and the standing disclaimer, and tenant isolation.",
);
