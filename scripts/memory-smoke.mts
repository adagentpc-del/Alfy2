/**
 * Runtime smoke test for the Memory Engine. Exercises remember -> recall(+reinforce) -> link ->
 * neighbors -> reinforce -> prune against the in-memory repository. Run with: `tsx scripts/memory-smoke.mts`.
 * Not a unit suite (that arrives with the Phase-2 test runner) — a fast end-to-end sanity check.
 */
import assert from "node:assert/strict";
import { MemoryEngine, InMemoryMemoryRepository } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";

// Deterministic clock + ids for reproducibility.
let now = new Date("2026-06-24T12:00:00.000Z");
let n = 0;
const engine = new MemoryEngine(new InMemoryMemoryRepository(), {
  clock: () => now,
  idFactory: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
});

// 1. Remember
const doctor = await engine.remember(TENANT, {
  kind: "doctor",
  title: "Dr. Lena Ortiz",
  body: "Primary care physician at Coastal Health.",
  importance: 0.7,
  confidence: 0.9,
  source: "operator",
  keywords: ["doctor", "primary care", "coastal health"],
});
const clinic = await engine.remember(TENANT, {
  kind: "company",
  title: "Coastal Health",
  body: "Clinic network.",
  importance: 0.5,
  confidence: 0.8,
  source: "operator",
  keywords: ["clinic", "coastal health"],
});
assert.equal(doctor.use_count, 0);
assert.equal(doctor.status, "active");

// 2. Recall ranks the doctor first AND reinforces it (use_count++ , last_used set)
const hits = await engine.recall(TENANT, { text: "primary care doctor", limit: 5 });
assert.ok(hits.length >= 1, "expected recall hits");
assert.equal(hits[0]!.memory.id, doctor.id, "doctor should rank first");
assert.equal(hits[0]!.memory.use_count, 1, "recall must reinforce use_count");
assert.ok(hits[0]!.memory.last_used_at, "recall must set last_used_at");
assert.ok(hits[0]!.score > 0, "score should be positive");

// 3. Link + traverse: doctor works_at clinic
await engine.link(TENANT, doctor.id, clinic.id, "works_at", 0.9);
const related = await engine.relatedMemories(TENANT, doctor.id, "works_at");
assert.equal(related.length, 1);
assert.equal(related[0]!.id, clinic.id, "neighbor should resolve to the clinic");

// 4. Reinforce importance, clamped to 1
const boosted = await engine.reinforce(TENANT, doctor.id, { importance: 0.5 });
assert.equal(boosted.importance, 1, "importance must clamp at 1");

// 5. Kind filter on recall
const onlyCompanies = await engine.recall(TENANT, { text: "coastal", kinds: ["company"], limit: 5 });
assert.ok(
  onlyCompanies.every((h) => h.memory.kind === "company"),
  "kind filter must restrict results",
);

// 6. Pruning: a stale, low-value, unused memory is evicted; a pinned one survives.
const junk = await engine.remember(TENANT, {
  kind: "idea",
  title: "Half-baked idea",
  body: "Probably nothing.",
  importance: 0.1,
  confidence: 0.1,
  source: "operator",
});
const pinned = await engine.remember(TENANT, {
  kind: "lesson",
  title: "Critical lesson learned",
  body: "Never skip the approval gate.",
  importance: 0.95,
  confidence: 0.95,
  source: "operator",
});
// Advance the clock ~200 days so junk goes stale; then prune (archive mode).
now = new Date("2027-01-10T12:00:00.000Z");
const summary = await engine.prune(TENANT);
assert.ok(summary.prunedIds.includes(junk.id), "stale low-value memory should be pruned");
assert.ok(!summary.prunedIds.includes(pinned.id), "pinned high-importance memory must survive");
assert.equal(summary.mode, "archived");
const junkAfter = await engine.get(TENANT, junk.id);
assert.equal(junkAfter?.status, "archived", "pruned memory should be archived, not destroyed");

// 7. Expiry forces prune even for otherwise-fine memories.
const temp = await engine.remember(TENANT, {
  kind: "task",
  title: "Expired reminder",
  body: "One-off.",
  importance: 0.6,
  confidence: 0.9,
  source: "operator",
  expires_at: "2026-01-01T00:00:00.000Z",
});
const s2 = await engine.prune(TENANT, { hardDelete: true });
assert.ok(s2.prunedIds.includes(temp.id), "expired memory should be pruned");
assert.equal(await engine.get(TENANT, temp.id), null, "hardDelete should remove the memory");

console.log("MEMORY SMOKE OK — remember/recall/reinforce/link/traverse/prune all verified");
