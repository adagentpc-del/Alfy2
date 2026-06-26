/**
 * Runtime smoke for the Don't Drop the Ball System. Proves it detects the nine dropped-item kinds past
 * their per-kind staleness thresholds, leaves fresh items alone, surfaces open items daily (ranked),
 * and — once approved — assigns an agent to close the loop. Run with: `tsx scripts/dont-drop-ball-smoke.mts`.
 */
import assert from "node:assert/strict";
import { DontDropBallSystem, STALENESS_DAYS } from "@alfy2/core";
import { ScanInputSchema, type DroppedKind } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const sys = new DontDropBallSystem({ clock: () => NOW, idFactory: id });

const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const KINDS: DroppedKind[] = ["forgotten_lead", "missed_follow_up", "unfinished_launch", "abandoned_idea", "stale_campaign", "unpaid_invoice", "unsigned_contract", "open_loop", "waiting_on_response"];

// === 1. Detects each kind past its threshold; leaves a fresh one alone. ===
const stale = sys.scan(TENANT, ScanInputSchema.parse({
  candidates: KINDS.map((k) => ({ kind: k, title: `${k} item`, business_name: "Move Mi", last_activity_at: daysAgo(STALENESS_DAYS[k] + 1), value_usd: 1000 })),
}));
assert.equal(stale.length, 9, "all nine flagged when past threshold");
assert.ok(stale.every((d) => d.recommended_action.length > 0), "each has a recommended action");
const fresh = sys.scan(TENANT, ScanInputSchema.parse({
  candidates: [{ kind: "forgotten_lead", title: "fresh lead", business_name: "Move Mi", last_activity_at: daysAgo(1), value_usd: 0 }],
}));
assert.equal(fresh.length, 0, "fresh item (below threshold) not flagged");
console.log("[1] detects 9 dropped kinds past staleness; leaves fresh items alone ✔");

// === 2. Surfaced daily, ranked by value then age. ===
const surfaced = sys.surfaceDaily(TENANT);
assert.equal(surfaced.length, 9, "all open items surface");
assert.ok(surfaced.every((d) => d.status === "open"), "only open items");
// A higher-value item should sort first.
sys.scan(TENANT, ScanInputSchema.parse({ candidates: [{ kind: "unpaid_invoice", title: "big invoice", business_name: "Move Mi", last_activity_at: daysAgo(40), value_usd: 50000 }] }));
assert.equal(sys.surfaceDaily(TENANT)[0]!.title, "big invoice", "highest-value item surfaces first");
console.log("[2] surfaced daily, ranked by value then age ✔");

// === 3. Approve → assign an agent to close the loop. ===
const target = sys.surfaceDaily(TENANT)[0]!;
const assigned = sys.assign(TENANT, target.id, "sales.followup");
assert.equal(assigned.status, "assigned");
assert.equal(assigned.assigned_agent, "sales.followup");
assert.ok(!sys.surfaceDaily(TENANT).some((d) => d.id === target.id), "assigned item leaves the open surface");
const closed = sys.close(TENANT, target.id);
assert.equal(closed.status, "closed");
console.log("[3] approve → assign agent → close the loop ✔");

// === 4. Re-scan dedupes (no duplicates). ===
const before = sys.list(TENANT).length;
sys.scan(TENANT, ScanInputSchema.parse({ candidates: KINDS.map((k) => ({ kind: k, title: `${k} item`, business_name: "Move Mi", last_activity_at: daysAgo(STALENESS_DAYS[k] + 5), value_usd: 1000 })) }));
assert.equal(sys.list(TENANT).length, before, "re-scan upserts, no duplicates");
console.log("[4] re-scan dedupes by signature ✔");

// === 5. Tenant isolation. ===
assert.equal(sys.surfaceDaily(OTHER).length, 0, "no cross-tenant items");
console.log("[5] tenant isolation ✔");

console.log(
  "\nDON'T DROP THE BALL SMOKE OK — detects 9 dropped kinds (forgotten leads/missed follow-ups/unfinished launches/abandoned ideas/stale campaigns/unpaid invoices/unsigned contracts/open loops/waiting-on responses) past per-kind staleness, surfaces daily ranked, approve→assign agent to close, dedupes, tenant-isolated.",
);
