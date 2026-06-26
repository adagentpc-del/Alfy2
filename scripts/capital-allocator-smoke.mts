/**
 * Runtime smoke for the Executive Capital Allocator. Proves the quarterly horizon asks what to stop, names the
 * highest-ROI / highest-leverage picks, lists low-return candidates to stop investing in, surfaces trade-offs,
 * and that plans are tenant-scoped. Run with: `tsx scripts/capital-allocator-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ExecutiveCapitalAllocator } from "@alfy2/core";
import { AllocateInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const allocator = new ExecutiveCapitalAllocator({ clock: () => NOW, idFactory });

// === 1. quarterly horizon → the question asks what to STOP investing in. ===
const plan = allocator.allocate(
  TENANT,
  AllocateInputSchema.parse({
    horizon: "quarterly",
    candidates: [
      { label: "FounderOS platform", consumes: ["time", "energy"], expected_return: 0.9, leverage: 0.9, compounding: 0.9, strategic_value: 0.9, founder_freedom: 0.8, depletes: ["attention"] },
      { label: "Manual consulting hours", consumes: ["time"], expected_return: 0.5, leverage: 0.2, compounding: 0.1, strategic_value: 0.3, founder_freedom: 0.1, depletes: ["time", "energy"] },
      { label: "Stale ad campaign", consumes: ["money"], expected_return: 0.1, leverage: 0.1, compounding: 0.1, strategic_value: 0.1, founder_freedom: 0.1, depletes: ["money"] },
    ],
  }),
);
assert.ok(/stop/i.test(plan.question), "quarterly question mentions stopping");
console.log(`[1] quarterly question: "${plan.question}" ✔`);

// === 2. highest_roi and highest_leverage are named. ===
assert.equal(plan.highest_roi, "FounderOS platform", "highest ROI candidate");
assert.equal(plan.highest_leverage, "FounderOS platform", "highest leverage candidate");
console.log(`[2] highest_roi = ${plan.highest_roi}; highest_leverage = ${plan.highest_leverage} ✔`);

// === 3. stop_investing_in lists low-return candidates (< 0.3). ===
assert.ok(plan.stop_investing_in.includes("Stale ad campaign"), "low-return candidate flagged to stop");
console.log(`[3] stop_investing_in: ${plan.stop_investing_in.join(", ")} ✔`);

// === 4. tradeoffs are surfaced (what the top pick depletes). ===
assert.ok(plan.tradeoffs.length > 0, "trade-offs surfaced");
console.log(`[4] tradeoffs: ${plan.tradeoffs[0]} ✔`);

// === 5. Tenant isolation — another tenant cannot see the plan. ===
assert.equal(allocator.get(OTHER, plan.id), undefined, "get is tenant-scoped");
assert.equal(allocator.list(OTHER).length, 0, "other tenant has none");
assert.equal(allocator.list(TENANT).length, 1, "this tenant keeps it");
console.log("[5] tenant isolation ✔");

console.log(
  "\nCAPITAL ALLOCATOR SMOKE OK — the quarterly horizon asks what to stop, names the highest-ROI / highest-leverage picks, lists low-return candidates to stop investing in, surfaces trade-offs (what each top pick depletes), and plans are tenant-scoped.",
);
