/**
 * Runtime smoke for the Algorithm Overlay System. Proves all fifteen algorithms exist, a rules-based score
 * is transparent (phase, 0..1 score, why, data used, recommended action), a manual override is honored, a
 * high-risk score escalates for approval, and descriptors are addressable. Deterministic, stateless overlay.
 * Run with: `tsx scripts/algorithm-overlay-smoke.mts`.
 */
import assert from "node:assert/strict";
import { AlgorithmOverlaySystem } from "@alfy2/core";
import { ScoreRequestSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
void TENANT;
void NOW;
const overlay = new AlgorithmOverlaySystem();

// === 1. All fifteen algorithms are registered. ===
assert.equal(AlgorithmOverlaySystem.ALGORITHMS.length, 15, "15 algorithms");
console.log(`[1] ${AlgorithmOverlaySystem.ALGORITHMS.length} algorithms registered ✔`);

// === 2. A rules-based score is transparent. ===
const roi = overlay.score(
  ScoreRequestSchema.parse({ algorithm: "roi", subject: "Build the audit offer", signals: { value: 0.9, cost: 0.3 } }),
);
assert.equal(roi.phase, "rules_based", "phase is rules_based");
assert.ok(roi.score >= 0 && roi.score <= 1, "score in 0..1");
assert.ok(roi.why.length > 0, "why present");
assert.ok(roi.data_used.length > 0, "data_used present");
assert.ok(roi.recommended_action.length > 0, "recommended_action present");
console.log(`[2] roi score ${roi.score} (rules_based) with why / data_used / recommended_action ✔`);

// === 3. A manual override is honored. ===
const over = overlay.score(
  ScoreRequestSchema.parse({ algorithm: "roi", subject: "Override me", signals: { value: 0.1, cost: 0.9 }, override: 0.9 }),
);
assert.equal(over.overridden, true, "overridden true");
assert.equal(over.score, 0.9, "score is the override value");
console.log("[3] override → overridden true, score 0.9 ✔");

// === 4. A high-risk score escalates for human approval. ===
const risk = overlay.score(
  ScoreRequestSchema.parse({ algorithm: "risk", subject: "Vendor outage", signals: { likelihood: 0.9, severity: 0.9, exposure: 0.9 } }),
);
assert.equal(risk.requires_approval, true, "high risk requires approval");
console.log(`[4] high-risk score ${risk.score} → requires_approval true ✔`);

// === 5. Descriptors are addressable by id. ===
const desc = overlay.descriptor("priority");
assert.ok(desc, "descriptor('priority') returns a descriptor");
assert.equal(desc!.id, "priority", "descriptor id matches");
console.log("[5] descriptor('priority') returns a descriptor ✔");

console.log(
  "\nALGORITHM OVERLAY SMOKE OK — fifteen transparent rules-based algorithms, scores that explain themselves (phase / score / why / data / action), honored manual overrides, high-risk escalation for approval, and addressable descriptors.",
);
