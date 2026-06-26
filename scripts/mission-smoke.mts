/**
 * Runtime smoke for Executive Mission Control. Proves health scores get human labels, that runway is
 * computed from cash/burn, that a runway under 3 months produces the URGENT headline, that a healthy
 * runway with approvals waiting surfaces the approvals headline, and that top opportunities and daily
 * priorities are capped at five. Run with: `tsx scripts/mission-smoke.mts`.
 */
import assert from "node:assert/strict";
import { MissionControl } from "@alfy2/core";
import { MissionControlInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
void TENANT;
const mc = new MissionControl({ clock: () => NOW });

const assemble = (input: Record<string, unknown>) => mc.assemble(TENANT, MissionControlInputSchema.parse(input));

// === 1. Health readings get labels. ===
const healthy = assemble({
  enterprise_health: 0.8,
  company_health: { "Move Mi": 0.8, "Logistics": 0.45 },
  cash_usd: 120000,
  monthly_burn_usd: 20000,
});
assert.equal(healthy.enterprise_health.label, "healthy", "0.8 → healthy");
assert.equal(healthy.company_health["Move Mi"]!.label, "healthy", "0.8 → healthy");
assert.equal(healthy.company_health["Logistics"]!.label, "at risk", "0.45 → at risk");
console.log("[1] health scores → labels (0.8 healthy, 0.45 at risk) ✔");

// === 2. Runway computed from cash / burn. ===
assert.equal(healthy.runway_months, 6, "120000 / 20000 = 6 months");
console.log(`[2] runway = ${healthy.runway_months} months (cash / burn) ✔`);

// === 3. Runway < 3 → URGENT headline. ===
const tight = assemble({ enterprise_health: 0.6, cash_usd: 20000, monthly_burn_usd: 20000, approvals_waiting: 4 });
assert.equal(tight.runway_months, 1, "20000 / 20000 = 1 month");
assert.ok(tight.headline.startsWith("URGENT"), "runway < 3 → URGENT headline");
console.log(`[3] runway < 3 → "${tight.headline}" ✔`);

// === 4. Healthy runway but approvals waiting → approvals headline. ===
const approvals = assemble({ enterprise_health: 0.8, cash_usd: 240000, monthly_burn_usd: 20000, approvals_waiting: 3 });
assert.equal(approvals.runway_months, 12, "healthy 12-month runway");
assert.ok(approvals.headline.toLowerCase().includes("approval"), "approvals surfaced when runway is healthy");
console.log(`[4] healthy runway + approvals_waiting → "${approvals.headline}" ✔`);

// === 5. Top opportunities and daily priorities capped at 5. ===
const many = assemble({
  enterprise_health: 0.8,
  cash_usd: 240000,
  monthly_burn_usd: 20000,
  top_opportunities: ["o1", "o2", "o3", "o4", "o5", "o6", "o7"],
  daily_priorities: ["p1", "p2", "p3", "p4", "p5", "p6"],
});
assert.equal(many.top_opportunities.length, 5, "top opportunities capped at 5");
assert.equal(many.daily_priorities.length, 5, "daily priorities capped at 5");
console.log("[5] top_opportunities + daily_priorities capped at 5 ✔");

console.log(
  "\nMISSION CONTROL SMOKE OK — health scores get human labels (0.8 healthy / 0.45 at risk); runway is computed from cash/burn; a runway < 3 months produces the URGENT headline; a healthy runway with approvals waiting surfaces the approvals headline; top opportunities and daily priorities are capped at five.",
);
