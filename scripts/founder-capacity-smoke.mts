/**
 * Runtime smoke for the Founder Energy + Capacity Layer (§31). Proves the deterministic reduction of a
 * daily check-in to a capacity_score (0..100) + recommended_mode (protect / normal / high_capacity /
 * recovery): a LOW check-in (high stress, low sleep, low energy) protects/recovers with a low score; a
 * HIGH check-in opens high-capacity with a high score; an explicit do_not_interrupt forces protect;
 * getLatest returns the most recent reading; list returns newest-first; and tenants are isolated.
 * Deterministic (injected clock + idFactory). Run: `tsx scripts/founder-capacity-smoke.mts`.
 */
import assert from "node:assert/strict";
import { FounderCapacityEngine, InMemoryFounderCapacityRepository } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
// Advancing clock so successive records get strictly increasing as_of (newest detectable).
let tick = 0;
const clock = () => new Date(Date.UTC(2026, 5, 26, 9, tick++, 0));

const engine = new FounderCapacityEngine(new InMemoryFounderCapacityRepository(), {
  clock,
  idFactory: id,
});

// 1. LOW check-in → low score, protect/recovery.
const low = await engine.record(TENANT, { stress: 9, sleep_hours: 4, energy: 2 });
assert.ok(low.capacity_score < 50, `low capacity_score < 50 (got ${low.capacity_score})`);
assert.ok(
  low.recommended_mode === "recovery" || low.recommended_mode === "protect",
  `low recommended_mode is recovery or protect (got ${low.recommended_mode})`,
);

// 2. HIGH check-in → high score, high_capacity.
const high = await engine.record(TENANT, { energy: 9, focus: 9, sleep_hours: 8, stress: 1 });
assert.ok(high.capacity_score > 75, `high capacity_score > 75 (got ${high.capacity_score})`);
assert.equal(high.recommended_mode, "high_capacity", "high recommended_mode is high_capacity");

// 3. do_not_interrupt forces protect regardless of an otherwise-strong score.
const dni = await engine.record(TENANT, {
  energy: 9,
  focus: 9,
  sleep_hours: 8,
  do_not_interrupt: true,
});
assert.equal(dni.recommended_mode, "protect", "do_not_interrupt forces protect");
assert.equal(dni.do_not_interrupt, true, "do_not_interrupt persisted");

// 4. getLatest returns the most recent (the do_not_interrupt snapshot).
const latest = await engine.getLatest(TENANT);
assert.ok(latest, "latest snapshot exists");
assert.equal(latest.id, dni.id, "getLatest returns the most recent snapshot");

// 5. list returns newest-first.
const all = await engine.list(TENANT);
assert.equal(all.length, 3, "three snapshots for the tenant");
assert.equal(all[0]?.id, dni.id, "newest first");
assert.equal(all[2]?.id, low.id, "oldest last");

// 6. Tenant isolation — a second tenant sees nothing.
assert.equal(await engine.getLatest(OTHER), null, "other tenant has no latest");
assert.equal((await engine.list(OTHER)).length, 0, "other tenant sees no snapshots");

console.log(
  `FOUNDER CAPACITY SMOKE OK — low protect/recovery (score ${low.capacity_score}), ` +
    `high_capacity (score ${high.capacity_score}), do_not_interrupt → protect, ` +
    "getLatest newest, list newest-first, tenant-isolated",
);
