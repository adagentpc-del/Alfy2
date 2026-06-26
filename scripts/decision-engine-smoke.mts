/**
 * Runtime smoke for the Advisory Decision Engine (§35) — the structured decision record +
 * reversibility gate. Proves: a one-way-door `capital` decision is gated (approval_required) and
 * carries the capital lenses; a two-way-door `hire` decision is NOT gated; and the operator's
 * decide(approved) flips status to approved with decided_at stamped. Deterministic (injected clock +
 * idFactory). Run: `tsx scripts/decision-engine-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  AdvisoryDecisionEngine,
  InMemoryDecisionRecordRepository,
  LENSES_BY_TYPE,
} from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const engine = new AdvisoryDecisionEngine(new InMemoryDecisionRecordRepository(), {
  clock: () => NOW,
  idFactory: id,
});

// 1. A one-way-door `capital` decision is gated and carries the capital lenses.
const capital = await engine.evaluate(TENANT, {
  title: "Wire $250k into the new fulfillment line",
  decision_type: "capital",
  reversibility: "one_way_door",
  risks: ["Cash tied up for 18 months"],
});
assert.equal(capital.approval_required, true, "one-way-door capital decision requires approval");
assert.ok(capital.lens_analysis.length > 0, "capital decision has a non-empty lens analysis");
assert.equal(
  capital.lens_analysis.length,
  LENSES_BY_TYPE.capital.length,
  "capital lens count matches LENSES_BY_TYPE.capital",
);
assert.deepEqual(
  capital.lens_analysis.map((r) => r.lens),
  LENSES_BY_TYPE.capital,
  "capital decision uses exactly the capital lenses, in order",
);
assert.equal(capital.status, "open", "new decision record is open");
assert.equal(capital.created_at, NOW.toISOString(), "created_at stamped from injected clock");
assert.equal(capital.decided_at, null, "no decided_at yet");

// 2. A two-way-door `hire` decision is NOT gated.
const hire = await engine.evaluate(TENANT, {
  title: "Hire a part-time bookkeeper",
  decision_type: "hire",
  reversibility: "two_way_door",
});
assert.equal(hire.approval_required, false, "two-way-door hire decision does not require approval");
assert.ok(hire.lens_analysis.length > 0, "hire decision still produces lens readings");

// 3. decide(approved) on the capital decision → status approved + decided_at set.
await engine.decide(TENANT, capital.id, { status: "approved" });
const decided = await engine.get(TENANT, capital.id);
assert.ok(decided, "decided record still retrievable");
assert.equal(decided.status, "approved", "status flipped to approved");
assert.equal(decided.decided_at, NOW.toISOString(), "decided_at stamped from injected clock");

console.log(
  "DECISION ENGINE SMOKE OK — one-way-door capital gated (capital lenses), " +
    "two-way-door hire open, operator approved with decided_at stamped",
);
