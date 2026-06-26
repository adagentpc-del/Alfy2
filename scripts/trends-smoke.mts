/**
 * Runtime smoke for the Future Trends Lab. Proves a tracked trend computes readiness as likelihood × impact,
 * generates preparation steps / skills / technology, that byHorizon filters and topByReadiness orders
 * descending, and that trends are tenant-scoped. Run with: `tsx scripts/trends-smoke.mts`.
 */
import assert from "node:assert/strict";
import { FutureTrendsLab } from "@alfy2/core";
import { TrackTrendInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const lab = new FutureTrendsLab({ clock: () => NOW, idFactory });

const trend = lab.track(
  TENANT,
  TrackTrendInputSchema.parse({
    name: "Agentic AI ops",
    horizon: "1_year",
    description: "Autonomous agents running real operations.",
    likelihood: 0.8,
    impact: 0.9,
    industries_affected: ["software"],
    businesses_affected: ["AI Authority"],
  }),
);

// === 1. readiness_score = likelihood × impact ≈ 0.72. ===
assert.equal(trend.readiness_score, 0.72, "readiness = 0.8 × 0.9");
console.log(`[1] readiness_score ${trend.readiness_score} = likelihood × impact ✔`);

// === 2. Preparation guidance is generated. ===
assert.ok(trend.preparation_steps.length > 0, "preparation_steps non-empty");
assert.ok(trend.skills_needed.length > 0, "skills_needed non-empty");
assert.ok(trend.technology_needed.length > 0, "technology_needed non-empty");
console.log("[2] preparation steps / skills / technology generated ✔");

// === 3. byHorizon filters. ===
const oneYear = lab.byHorizon(TENANT, "1_year");
assert.ok(oneYear.some((t) => t.id === trend.id), "byHorizon('1_year') includes the trend");
assert.equal(lab.byHorizon(TENANT, "10_years").length, 0, "byHorizon('10_years') excludes it");
console.log("[3] byHorizon filter works ✔");

// === 4. topByReadiness orders descending. ===
const lower = lab.track(
  TENANT,
  TrackTrendInputSchema.parse({ name: "Slow trend", horizon: "1_year", likelihood: 0.3, impact: 0.3 }),
);
const top = lab.topByReadiness(TENANT);
assert.equal(top[0]!.id, trend.id, "highest readiness first");
assert.ok(top[0]!.readiness_score >= top[top.length - 1]!.readiness_score, "ordered desc");
assert.ok(lower.readiness_score < trend.readiness_score, "lower-readiness trend ranks below");
console.log("[4] topByReadiness orders by readiness desc ✔");

// === 5. Tenant isolation. ===
assert.equal(lab.list("00000000-0000-0000-0000-000000000002").length, 0, "other tenant sees no trends");
console.log("[5] tenant isolation on trends ✔");

console.log(
  "\nTRENDS SMOKE OK — readiness as likelihood × impact, generated preparation steps / skills / technology, byHorizon filtering, topByReadiness ordering, and tenant isolation.",
);
