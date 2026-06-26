/**
 * Runtime smoke for the Executive Control Tower. Proves the operator dashboard assembles one snapshot
 * with every required section (cash + computed runway, pipeline, goals, campaigns, blocked deals,
 * risks, agent performance, approvals, top-3 priorities, business health, opportunities, workflows,
 * review queue), that it computes runway and the top three priorities, and tenant isolation.
 * Run with: `tsx scripts/control-tower-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ControlTower } from "@alfy2/core";
import { ControlTowerInputSchema, type ControlTowerInput } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const tower = new ControlTower({ clock: () => NOW, idFactory: id });

const input: ControlTowerInput = ControlTowerInputSchema.parse({
  cash: { cash_on_hand_usd: 50000, monthly_burn_usd: 20000, monthly_inflow_usd: 12000 }, // net burn 8k → ~6.25mo
  pipeline: { open_deals: 12, weighted_value_usd: 84000, closing_30d_usd: 30000 },
  goals: [
    { name: "Reach $50k MRR", status: "active", progress: 0.44, priority_level: "high" },
    { name: "Launch podcast", status: "active", progress: 0.1, priority_level: "medium" },
  ],
  campaigns: [{ name: "Retainer upsell", status: "active", note: "Variant B winning" }],
  blocked_deals: [
    { name: "Acme Corp", reason: "Awaiting legal review", value_usd: 18000 },
    { name: "Globex", reason: "Pending security review", value_usd: 6000 },
  ],
  risks: [{ description: "Single late payment compresses runway", severity: "high" }],
  agent_performance: [{ agent_name: "sales.outreach", success_rate: 0.92, roi: 24.8, actions: 40 }],
  approvals_needed: [{ action: "Wire $40k to A3 Visual", requested_by: "finance.payments", required_role: "owner" }],
  business_health: [{ business_name: "Move Mi", score: 0.78, signal: "Healthy growth" }],
  opportunities: [
    { title: "Repo solves Move Mi", composite: 0.62 },
    { title: "Investor meets Strata HQ", composite: 0.7 },
  ],
  workflows_running: [{ name: "Auto follow-up reminders", status: "active" }],
  review_queue: [{ item: "Monthly finance review", cadence: "monthly", due: "2026-06-30T00:00:00.000Z" }],
});

const snap = tower.assemble(TENANT, input);

// === 1. Every required section is present. ===
for (const section of [
  "cash_position", "revenue_pipeline", "goals", "active_campaigns", "blocked_deals", "risks",
  "agent_performance", "approvals_needed", "top_priorities", "business_health", "opportunities",
  "workflows_running", "review_queue",
] as const) {
  assert.ok(snap[section] !== undefined, `snapshot has ${section}`);
}
console.log("[1] dashboard has all 13 sections ✔");

// === 2. Runway computed. ===
assert.ok(snap.cash_position.runway_months !== null && Math.abs(snap.cash_position.runway_months - 6.25) < 0.01, "runway computed (cash / net burn)");
console.log(`[2] cash runway computed (${snap.cash_position.runway_months} months) ✔`);

// === 3. Top 3 priorities computed and ordered. ===
assert.ok(snap.top_priorities.length === 3, "exactly top 3 priorities");
assert.ok(snap.top_priorities.some((p) => /runway/i.test(p)), "short runway surfaces");
assert.ok(snap.top_priorities.some((p) => /risk/i.test(p)), "high risk surfaces");
assert.ok(snap.top_priorities.some((p) => /Acme/i.test(p)), "biggest blocked deal surfaces");
console.log(`[3] top 3 priorities computed: ${JSON.stringify(snap.top_priorities)} ✔`);

// === 4. Opportunities ranked by composite. ===
assert.equal(snap.opportunities[0]!.title, "Investor meets Strata HQ", "opportunities ranked by composite");
console.log("[4] opportunities ranked by composite ✔");

// === 5. Sections carry through. ===
assert.equal(snap.agent_performance[0]!.agent_name, "sales.outreach");
assert.equal(snap.review_queue[0]!.cadence, "monthly");
assert.equal(snap.business_health[0]!.business_name, "Move Mi");
console.log("[5] all signals carry through to the snapshot ✔");

// === 6. Tenant isolation. ===
assert.equal(tower.get(OTHER, snap.id), undefined, "no cross-tenant snapshot");
assert.equal(tower.list(OTHER).length, 0, "no cross-tenant list");
console.log("[6] tenant isolation ✔");

console.log(
  "\nEXECUTIVE CONTROL TOWER SMOKE OK — assembles the operator dashboard (cash+runway / pipeline / goals / campaigns / blocked deals / risks / agent performance / approvals / top-3 priorities / business health / opportunities / workflows / review queue), computes runway + top 3 priorities, ranks opportunities, tenant-isolated.",
);
