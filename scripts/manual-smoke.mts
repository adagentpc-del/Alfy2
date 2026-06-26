/**
 * Runtime smoke for the Operating Manual Generator. Proves a stable workflow generates all eight manual
 * artifacts (SOP, checklist, playbook, onboarding, training, troubleshooting, KPIs, ownership matrix),
 * each persisted to the Asset Library by reference (an asset_id from the sink), that the manual is marked
 * reusable IP, that an unstable workflow is refused, and that the store is tenant-isolated.
 * Run with: `tsx scripts/manual-smoke.mts`.
 */
import assert from "node:assert/strict";
import { OperatingManualGenerator, OperatingManualError } from "@alfy2/core";
import { GenerateManualInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const EXPECTED_KINDS = ["sop", "checklist", "playbook", "onboarding_guide", "training_document", "troubleshooting_guide", "kpis", "ownership_matrix"];
const saved: string[] = [];
const assetSink = (_tenant: string, a: { kind: string; title: string }) => {
  const ref = `asset:${a.kind}:${++n}`;
  saved.push(ref);
  return ref;
};
const gen = new OperatingManualGenerator({ clock: () => NOW, idFactory: id, assetSink });

const generate = (tenant: string, input: Record<string, unknown>) => gen.generate(tenant, GenerateManualInputSchema.parse(input));

// === 1. A stable workflow generates all eight artifacts. ===
const manual = generate(TENANT, {
  workflow_name: "Lead Triage",
  steps: ["Capture lead", "Score lead", "Route to owner"],
  owners: ["Sales Ops"],
  kpis: ["Time to first touch"],
  is_stable: true,
});
assert.equal(manual.artifacts.length, 8, "eight artifacts");
assert.deepEqual([...manual.artifacts.map((a) => a.kind)].sort(), [...EXPECTED_KINDS].sort(), "all eight artifact kinds present");
console.log("[1] stable workflow → 8 artifacts (all kinds) ✔");

// === 2. Each artifact carries an asset_id from the sink (saved by reference). ===
for (const a of manual.artifacts) {
  assert.ok(a.asset_id.length > 0, `${a.kind} has an asset_id`);
  assert.ok(saved.includes(a.asset_id), `${a.kind} asset_id came from the sink`);
}
assert.equal(saved.length, 8, "the sink persisted eight artifacts");
console.log("[2] every artifact persisted to the Asset Library by reference ✔");

// === 3. Marked reusable IP. ===
assert.equal(manual.reusable_ip, true, "manual is reusable IP");
console.log("[3] reusable_ip = true ✔");

// === 4. An unstable workflow is refused. ===
assert.throws(() => generate(TENANT, { workflow_name: "Half-baked flow", is_stable: false }), OperatingManualError, "unstable workflow is refused");
console.log("[4] is_stable:false → OperatingManualError ✔");

// === 5. Tenant isolation. ===
assert.equal(gen.list(OTHER).length, 0, "no cross-tenant manuals");
assert.equal(gen.get(OTHER, manual.id), undefined, "manual not visible to another tenant");
assert.equal(gen.list(TENANT).length, 1, "the tenant's one manual is present");
console.log("[5] tenant isolation ✔");

console.log(
  "\nOPERATING MANUAL SMOKE OK — a stable workflow generates all eight manual artifacts, each saved to the Asset Library by reference (asset_id from the sink); the manual is marked reusable IP; an unstable workflow is refused; the store is tenant-isolated.",
);
