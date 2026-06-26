/**
 * Runtime smoke for the Digital Twin. Proves update() computes runway from cash/(burn−revenue), that a 30%
 * revenue drop lowers projected revenue and shortens runway, that a net-positive offer is recommended for
 * launch, that pausing a business burning more than it earns is recommended, and that simulating before
 * the twin has any state throws. Run with: `tsx scripts/twin-smoke.mts`.
 */
import assert from "node:assert/strict";
import { DigitalTwin } from "@alfy2/core";
import { TwinStateSchema, TwinSimulationInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const twin = new DigitalTwin({ clock: () => NOW, idFactory: id });

// === 1. Simulating before any update throws. ===
assert.throws(() => twin.simulate(TENANT, TwinSimulationInputSchema.parse({ kind: "revenue_drop", revenue_drop_fraction: 0.3 })), /update/, "no state → throws");
console.log("[1] simulate before update → throws ✔");

// === 2. update() computes runway = cash / (burn − revenue). ===
const snap = twin.update(TENANT, TwinStateSchema.parse({
  businesses: 2,
  cash_usd: 120000,
  monthly_revenue_usd: 20000,
  monthly_burn_usd: 30000,
}));
assert.equal(snap.runway_months, 12, "runway = 120000 / (30000 - 20000) = 12 months");
assert.equal(twin.current(TENANT)!.id, snap.id, "current() is the latest snapshot");
console.log(`[2] update → runway = ${snap.runway_months} months ✔`);

// === 3. A 30% revenue drop lowers projected revenue and shortens runway. ===
const drop = twin.simulate(TENANT, TwinSimulationInputSchema.parse({ kind: "revenue_drop", revenue_drop_fraction: 0.3 }));
assert.ok(drop.projected_state.monthly_revenue_usd < snap.state.monthly_revenue_usd, "projected revenue is lower");
assert.equal(drop.projected_state.monthly_revenue_usd, 14000, "20000 − 30% = 14000");
assert.ok(drop.projected_runway_months !== null && drop.projected_runway_months < snap.runway_months!, "runway shortens");
console.log(`[3] revenue_drop 0.3 → revenue ${drop.projected_state.monthly_revenue_usd}, runway ${drop.projected_runway_months} (shorter) ✔`);

// === 4. A net-positive offer (revenue > cost) is recommended to launch. ===
const offer = twin.simulate(TENANT, TwinSimulationInputSchema.parse({ kind: "launch_offer", offer_monthly_revenue_usd: 8000, offer_monthly_cost_usd: 2000 }));
assert.ok(offer.recommendation.toLowerCase().includes("launch"), "net-positive offer is recommended to launch");
assert.ok(offer.revenue_delta_usd > 0, "revenue delta positive");
console.log("[4] launch_offer (revenue > cost) → recommend launch ✔");

// === 5. Pausing a business that burns more than it earns is recommended. ===
const pause = twin.simulate(TENANT, TwinSimulationInputSchema.parse({ kind: "pause_business", paused_revenue_usd: 5000, paused_burn_usd: 12000 }));
assert.ok(pause.recommendation.toLowerCase().includes("pause"), "pausing a net-burning business is recommended");
console.log("[5] pause_business (burn >= revenue) → recommend pausing ✔");

// === 6. History + tenant isolation. ===
assert.equal(twin.history(TENANT).length, 1, "one snapshot recorded");
assert.equal(twin.current(OTHER), undefined, "no cross-tenant state");
assert.equal(twin.history(OTHER).length, 0, "no cross-tenant history");
console.log("[6] history + tenant isolation ✔");

console.log(
  "\nDIGITAL TWIN SMOKE OK — update() computes runway = cash/(burn−revenue); a 30% revenue drop lowers projected revenue and shortens runway; a net-positive offer is recommended to launch; pausing a net-burning business is recommended; simulating before any update throws; twin is tenant-isolated.",
);
