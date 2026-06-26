/**
 * Runtime smoke for the Compounding Engine. Proves a completed task scores as the mean of its eight
 * dimensions, recommends reusable forms, seeds a lineage record, that derivatives bump the version and append
 * to created_assets, and that everything is tenant-scoped. Run with: `tsx scripts/compounding-smoke.mts`.
 */
import assert from "node:assert/strict";
import { CompoundingEngine } from "@alfy2/core";
import { EvaluateCompoundingInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new CompoundingEngine({ clock: () => NOW, idFactory });

// === 1. evaluate scores the mean of the 8 dimensions (all 0.6 → 0.6) and recommends reusable. ===
const evaluation = engine.evaluate(
  TENANT,
  EvaluateCompoundingInputSchema.parse({
    task_title: "Lead-triage playbook",
    created_by: "agent:factory",
    metrics: {
      reuse_frequency: 0.6, businesses_using: 0.6, revenue_generated: 0.6, time_saved: 0.6,
      automation_potential: 0.6, knowledge_value: 0.6, strategic_importance: 0.6, longevity: 0.6,
    },
  }),
);
assert.ok(Math.abs(evaluation.compounding_score - 0.6) < 1e-9, "compounding_score ≈ 0.6");
assert.ok(evaluation.recommended_forms.length > 0, "recommended forms non-empty");
assert.equal(evaluation.recommend_create_reusable, true, "score >= 0.5 → recommend reusable");
assert.ok(evaluation.lineage_id, "lineage_id set");
console.log(`[1] evaluate → score ${evaluation.compounding_score}, recommend reusable, lineage set ✔`);

// === 2. getLineage reads the seeded lineage record. ===
const lineage = engine.getLineage(TENANT, evaluation.lineage_id!);
assert.ok(lineage, "lineage record exists");
assert.equal(lineage!.version, 1, "starts at version 1");
console.log("[2] getLineage → version 1 ✔");

// === 3. recordDerivative bumps the version and appends to created_assets. ===
const updated = engine.recordDerivative(TENANT, evaluation.lineage_id!, "Lead-triage agent v1");
assert.equal(updated!.version, 2, "version bumped to 2");
assert.deepEqual(updated!.created_assets, ["Lead-triage agent v1"], "derivative recorded");
console.log("[3] recordDerivative bumps version + records asset ✔");

// === 4. quarterlyImproveList ranks evaluations by compounding score. ===
engine.evaluate(TENANT, EvaluateCompoundingInputSchema.parse({ task_title: "One-off note", created_by: "human", metrics: { reuse_frequency: 0.1, businesses_using: 0.1, revenue_generated: 0.1, time_saved: 0.1, automation_potential: 0.1, knowledge_value: 0.1, strategic_importance: 0.1, longevity: 0.1 } }));
const ranked = engine.quarterlyImproveList(TENANT);
assert.equal(ranked[0]!.id, evaluation.id, "highest score first");
console.log("[4] quarterlyImproveList ranks descending ✔");

// === 5. Tenant isolation — another tenant cannot see evaluations or lineage. ===
assert.equal(engine.get(OTHER, evaluation.id), undefined, "get is tenant-scoped");
assert.equal(engine.getLineage(OTHER, evaluation.lineage_id!), undefined, "lineage is tenant-scoped");
assert.equal(engine.list(OTHER).length, 0, "other tenant has none");
console.log("[5] tenant isolation ✔");

console.log(
  "\nCOMPOUNDING SMOKE OK — a completed task scores as the mean of its eight dimensions, recommends reusable forms, seeds a lineage record, derivatives bump the version and append to created_assets, and all state is tenant-scoped.",
);
