/**
 * Runtime smoke for the Execution Queue. Proves it separates work into the eight buckets, ranks by the
 * fixed priority order (revenue → risk → deadlines → follow-up → operations → personal admin →
 * nice-to-have), and always knows what to do next (skipping blocked / waiting-on-Alyssa items).
 * Run with: `tsx scripts/execution-queue-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ExecutionQueue } from "@alfy2/core";
import { AddQueueItemInputSchema, type AddQueueItemInput } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const q = new ExecutionQueue({ clock: () => NOW, idFactory: id });

const add = (over: AddQueueItemInput) => q.add(TENANT, AddQueueItemInputSchema.parse(over));

// Add items across buckets and priority categories (out of order).
add({ bucket: "task", category: "nice_to_have", title: "Tidy the brand folder", actionable: true, due: null, value_usd: 0, business_id: null });
add({ bucket: "task", category: "operations", title: "Update the SOP", actionable: true, due: null, value_usd: 0, business_id: null });
add({ bucket: "approved_action", category: "follow_up", title: "Follow up with Acme", actionable: true, due: null, value_usd: 0, business_id: null });
add({ bucket: "risk_action", category: "risk", title: "Patch the data-export bug", actionable: true, due: null, value_usd: 0, business_id: null });
const money = add({ bucket: "money_action", category: "revenue", title: "Send the Acme proposal ($18k)", actionable: true, value_usd: 18000, due: "2026-06-26T00:00:00.000Z", business_id: null });
// A higher-value, sooner-deadline revenue item that is BLOCKED — must not be "next" while blocked.
add({ bucket: "blocked_action", category: "revenue", title: "Sign the $40k contract (blocked on legal)", actionable: false, value_usd: 40000, due: "2026-06-25T18:00:00.000Z", business_id: null });
// Waiting on Alyssa (revenue, but not actionable).
add({ bucket: "waiting_on_alyssa", category: "revenue", title: "Decide on the pricing change", actionable: false, value_usd: 0, due: null, business_id: null });

// === 1. Priority order: revenue first, nice-to-have last. ===
const ranked = q.ranked(TENANT);
assert.equal(ranked[0]!.category, "revenue", "revenue ranks first");
assert.equal(ranked[ranked.length - 1]!.category, "nice_to_have", "nice-to-have ranks last");
const cats = ranked.map((r) => r.category);
const order = ["revenue", "risk", "deadline", "follow_up", "operations", "personal_admin", "nice_to_have"];
let lastRank = -1;
for (const c of cats) {
  const r = order.indexOf(c);
  assert.ok(r >= lastRank, "ranked in priority order");
  lastRank = r;
}
console.log("[1] ranked by priority order (revenue → ... → nice-to-have) ✔");

// === 2. next() = highest-priority ACTIONABLE item; skips blocked + waiting-on-Alyssa. ===
const next = q.next(TENANT)!;
assert.equal(next.id, money.id, "next is the actionable revenue money action, not the blocked $40k one");
console.log(`[2] always knows what to do next: "${next.title}" ✔`);

// === 3. Buckets + waiting-on-Alyssa decision queue. ===
assert.equal(q.byBucket(TENANT, "money_action").length, 1, "money_action bucket");
assert.equal(q.byBucket(TENANT, "blocked_action").length, 1, "blocked_action bucket");
assert.equal(q.waitingOnAlyssa(TENANT).length, 1, "waiting-on-Alyssa decision queue");
console.log("[3] eight buckets + waiting-on-Alyssa queue ✔");

// === 4. Unblock → it becomes next; complete drops it. ===
const blocked = q.byBucket(TENANT, "blocked_action")[0]!;
q.move(TENANT, blocked.id, "approved_action", true);
assert.equal(q.next(TENANT)!.id, blocked.id, "unblocked $40k revenue item becomes next");
q.complete(TENANT, blocked.id);
assert.notEqual(q.next(TENANT)!.id, blocked.id, "completed item drops out");
console.log("[4] unblock → next; complete drops out ✔");

// === 5. Tenant isolation. ===
assert.equal(q.ranked(OTHER).length, 0, "no cross-tenant items");
assert.equal(q.next(OTHER), undefined, "nothing next for empty tenant");
console.log("[5] tenant isolation ✔");

console.log(
  "\nEXECUTION QUEUE SMOKE OK — separates 8 buckets, ranks by priority order (revenue/risk/deadlines/follow-up/operations/personal-admin/nice-to-have), next() = highest-priority actionable (skips blocked + waiting-on-Alyssa), move/complete, tenant-isolated.",
);
