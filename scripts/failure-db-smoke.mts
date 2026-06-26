/**
 * Runtime smoke for the Failure Database. Proves a captured case generates how_alfy2_avoids_it from its
 * warning signs and lessons learned, that byKind filters and search find the case, and that cases are
 * tenant-scoped. Append-only institutional knowledge. Run with: `tsx scripts/failure-db-smoke.mts`.
 */
import assert from "node:assert/strict";
import { FailureDatabase } from "@alfy2/core";
import { CaptureFailureInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const db = new FailureDatabase({ clock: () => NOW, idFactory });

const warning = "Unverified revenue claims";
const lesson = "Reconcile reported revenue to the bank";
const captured = db.capture(
  TENANT,
  CaptureFailureInputSchema.parse({
    kind: "fraud",
    title: "Theranos collapse",
    what_happened: "Falsified blood-testing results misled investors and patients.",
    root_cause: "Culture of secrecy and fabricated data.",
    warning_signs: [warning],
    lessons_learned: [lesson],
  }),
);

// === 1. how_alfy2_avoids_it is generated, referencing the warning sign and the lesson. ===
assert.ok(captured.how_alfy2_avoids_it.length >= 2, "avoidance guidance generated");
assert.ok(captured.how_alfy2_avoids_it.some((g) => g.includes(warning)), "references the warning sign");
assert.ok(captured.how_alfy2_avoids_it.some((g) => g.includes(lesson)), "references the lesson learned");
console.log("[1] how_alfy2_avoids_it generated from warning signs + lessons learned ✔");

// === 2. byKind filters. ===
const fraud = db.byKind(TENANT, "fraud");
assert.ok(fraud.some((c) => c.id === captured.id), "byKind('fraud') includes the case");
assert.equal(db.byKind(TENANT, "bankruptcy").length, 0, "byKind('bankruptcy') excludes it");
console.log("[2] byKind filter works ✔");

// === 3. search by term (case-insensitive across title / what_happened / root_cause). ===
const hits = db.search(TENANT, "theranos");
assert.ok(hits.some((c) => c.id === captured.id), "search finds the case by title term");
assert.equal(db.search(TENANT, "").length, 0, "empty search returns nothing");
console.log("[3] search by term works ✔");

// === 4. Tenant isolation. ===
assert.equal(db.list("00000000-0000-0000-0000-000000000002").length, 0, "other tenant sees no cases");
assert.equal(db.byKind("00000000-0000-0000-0000-000000000002", "fraud").length, 0, "byKind tenant-scoped");
console.log("[4] tenant isolation on cases ✔");

console.log(
  "\nFAILURE DB SMOKE OK — captured failures generate how_alfy2_avoids_it from their warning signs and lessons, byKind and search retrieve them, and cases are tenant-scoped.",
);
