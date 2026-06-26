/**
 * Runtime smoke for the Layer-0 Mission Control engine (§28). Proves that, given a fixed-clock
 * read-model fixture (45-day runway → warn; a move_money approval queued 30h ago → critical risk +
 * stale escalation; two opportunities; one "red" department), `compose` deterministically produces a
 * critical alert, an escalation alert, 1..3 top priorities with the approval as priority 1, and the
 * two revenue opportunities; and that the daily brief is a non-empty string mentioning revenue.
 * Run with: `tsx scripts/mission-control-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  MissionControlEngine,
  InMemoryMissionControlReadModel,
  type MissionControlAggregate,
} from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
// The move_money approval was queued 30h before NOW → triggers the >24h escalation rule.
const THIRTY_HOURS_AGO = new Date(NOW.getTime() - 30 * 60 * 60 * 1000).toISOString();

let idN = 0;
const idFactory = (): string => {
  idN += 1;
  return `00000000-0000-0000-0000-${String(idN).padStart(12, "0")}`;
};

const fixture: MissionControlAggregate = {
  as_of: NOW.toISOString(),
  revenue_today: 4200,
  cash_position: 120000,
  cash_runway_days: 45, // < 60 → warn (not critical)
  pending_approvals: [
    {
      id: "approval-1",
      action_class: "move_money", // high-risk → critical risk alert
      risk: "critical",
      summary: "Wire $25k to supplier",
      requires_approval: true,
      created_at: THIRTY_HOURS_AGO, // > 24h → escalation alert
    },
  ],
  open_inbox_count: 3,
  blocked: [{ id: "b1", label: "Vendor contract stuck in legal" }],
  opportunities: [
    { label: "Close Acme proposal", value: 25000, status: "hot" },
    { label: "Reactivate Divini pipeline", value: 12000, status: "warm" },
  ],
  active_builds: [{ label: "Mission Control dashboard", pct: 0.6 }],
  department_health: { Revenue: "green", Logistics: "red" }, // one red → health warn
  founder_capacity: { score: 0.7, mode: "normal" },
  follow_ups_due: [{ id: "f1", label: "Acme proposal", due: "2026-06-26" }],
  meetings: [{ id: "m1", label: "Investor sync", at: "2026-06-25T15:00:00.000Z" }],
  launch_readiness: { Divini: 0.85 },
};

const readModel = new InMemoryMissionControlReadModel(fixture);
const engine = new MissionControlEngine(readModel, { clock: () => NOW, idFactory });

const { snapshot, alerts } = await engine.compose(TENANT);

// === 1. A critical alert exists (the high-risk move_money approval). ===
const critical = alerts.filter((a) => a.severity === "critical");
assert.ok(critical.length >= 1, "expected at least one critical alert");
assert.ok(
  critical.some((a) => a.category === "risk" && a.title.toLowerCase().includes("high-risk")),
  "expected a critical high-risk risk alert",
);
console.log(`[1] critical alert present (${critical.length}) ✔`);

// === 2. An escalation alert exists (approval open > 24h). ===
const escalation = alerts.filter(
  (a) => a.category === "approval" && a.title.toLowerCase().includes("24 hours"),
);
assert.ok(escalation.length >= 1, "expected a >24h approval escalation alert");
assert.equal(escalation[0]!.routed_to, "ceo", "escalation routed to ceo");
console.log(`[2] >24h approval escalation present ✔`);

// === 3. A warn cash alert exists (45-day runway). ===
const cashWarn = alerts.filter((a) => a.category === "cash" && a.severity === "warn");
assert.ok(cashWarn.length >= 1, "expected a warn cash alert for 45-day runway");
console.log(`[3] 45-day runway → warn cash alert ✔`);

// === 4. top_priorities is 1..3 with the approval as priority 1. ===
assert.ok(
  snapshot.top_priorities.length >= 1 && snapshot.top_priorities.length <= 3,
  "top_priorities length must be 1..3",
);
assert.equal(snapshot.top_priorities[0]!.rank, 1, "priority 1 has rank 1");
assert.equal(snapshot.top_priorities[0]!.category, "approval", "priority 1 is the approval");
assert.ok(
  snapshot.top_priorities[0]!.title.includes("Wire $25k to supplier"),
  "priority 1 names the approval",
);
console.log(`[4] top_priorities (${snapshot.top_priorities.length}) with approval as priority 1 ✔`);

// === 5. snapshot.revenue_opportunities length 2. ===
assert.equal(snapshot.revenue_opportunities.length, 2, "two revenue opportunities");
console.log("[5] revenue_opportunities length 2 ✔");

// === 6. buildDailyBrief is a non-empty string mentioning revenue. ===
const brief = engine.buildDailyBrief(snapshot);
assert.ok(typeof brief === "string" && brief.length > 0, "daily brief is a non-empty string");
assert.ok(brief.toLowerCase().includes("revenue"), "daily brief mentions revenue");
console.log("[6] buildDailyBrief non-empty + mentions revenue ✔");

// Weekly summary is also a non-empty deterministic string.
const weekly = engine.buildWeeklySummary(snapshot);
assert.ok(typeof weekly === "string" && weekly.length > 0, "weekly summary is a non-empty string");

console.log(
  "\nMISSION CONTROL SMOKE OK — compose() over a fixed-clock read-model produces a critical high-risk alert and a >24h approval escalation (routed to ceo), a warn cash alert for a 45-day runway, top_priorities (1..3) with the move_money approval as priority 1, exactly two revenue opportunities, and a non-empty daily CEO brief that mentions revenue.",
);
