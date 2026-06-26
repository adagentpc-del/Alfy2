/**
 * Runtime smoke for the Enterprise Memory Timeline. Proves events sort chronologically regardless of insert
 * order, firstMention finds the earliest matching event, after returns later events, byKind filters, and the
 * timeline is tenant-scoped. Run with: `tsx scripts/memory-timeline-smoke.mts`.
 */
import assert from "node:assert/strict";
import { EnterpriseMemoryTimeline } from "@alfy2/core";
import { AddTimelineEventInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const timeline = new EnterpriseMemoryTimeline({ clock: () => NOW, idFactory });

// === 1. Add several events out of order; chronological sorts ascending. ===
const mid = timeline.add(TENANT, AddTimelineEventInputSchema.parse({ kind: "campaign", title: "Spring campaign", occurred_at: "2026-03-01T00:00:00.000Z", summary: "Pushed the FounderOS waitlist" }));
const first = timeline.add(TENANT, AddTimelineEventInputSchema.parse({ kind: "business_launch", title: "Launched Move Mi", occurred_at: "2026-01-01T00:00:00.000Z", summary: "First mention of FounderOS in planning" }));
const last = timeline.add(TENANT, AddTimelineEventInputSchema.parse({ kind: "win", title: "Closed Acme", occurred_at: "2026-05-01T00:00:00.000Z", summary: "Biggest deal yet" }));
const chrono = timeline.chronological(TENANT);
assert.deepEqual(chrono.map((e) => e.id), [first.id, mid.id, last.id], "sorted by occurred_at ascending");
console.log("[1] chronological sorts ascending regardless of insert order ✔");

// === 2. firstMention finds the earliest event matching the term. ===
const fm = timeline.firstMention(TENANT, "founderos");
assert.equal(fm!.id, first.id, "earliest matching event is the first mention");
console.log("[2] firstMention('founderos') → earliest match ✔");

// === 3. after returns events occurring strictly after the anchor. ===
const afterFirst = timeline.after(TENANT, first.id);
assert.deepEqual(afterFirst.map((e) => e.id), [mid.id, last.id], "events after the launch");
console.log(`[3] after(launch) → ${afterFirst.length} later events ✔`);

// === 4. byKind filters to a single event kind. ===
const wins = timeline.byKind(TENANT, "win");
assert.equal(wins.length, 1, "one win");
assert.equal(wins[0]!.id, last.id, "right event");
console.log("[4] byKind('win') ✔");

// === 5. Tenant isolation — another tenant has an empty timeline. ===
assert.equal(timeline.list(OTHER).length, 0, "other tenant has no events");
assert.equal(timeline.after(OTHER, first.id).length, 0, "cross-tenant anchor finds nothing");
assert.equal(timeline.list(TENANT).length, 3, "this tenant keeps all three");
console.log("[5] tenant isolation ✔");

console.log(
  "\nMEMORY TIMELINE SMOKE OK — events sort chronologically regardless of insert order, firstMention finds the earliest matching event, after returns later events, byKind filters, and the timeline is tenant-scoped.",
);
