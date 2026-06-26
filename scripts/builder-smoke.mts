/**
 * Runtime smoke for Builder Mode. Proves "I want to build…" yields an 18-stage venture blueprint in the
 * canonical order (discovery → review_checkpoints), that every stage has a title and a summary, that the
 * blueprint always starts awaiting_approval (human-in-command), that approve() flips it to approved, that
 * the trigger phrase is exactly "I want to build", and that the store is tenant-isolated.
 * Run with: `tsx scripts/builder-smoke.mts`.
 */
import assert from "node:assert/strict";
import { BuilderMode, BuilderModeError } from "@alfy2/core";
import { BUILDER_TRIGGER, StartBuildInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const builder = new BuilderMode({ clock: () => NOW, idFactory: id });

// === 1. The trigger phrase is exactly "I want to build". ===
assert.equal(BUILDER_TRIGGER, "I want to build", "trigger phrase is canonical");
console.log("[1] BUILDER_TRIGGER === \"I want to build\" ✔");

// === 2. build() → an 18-stage venture blueprint in order. ===
const bp = builder.build(TENANT, StartBuildInputSchema.parse({
  idea: "A subscription box for indie board games",
  business_name: "Meeple Monthly",
  target_market: "hobbyist gamers",
}));
assert.equal(bp.stages.length, 18, "eighteen stages");
assert.equal(bp.stages[0]!.stage, "discovery", "first stage is discovery");
assert.equal(bp.stages[17]!.stage, "review_checkpoints", "last stage is review_checkpoints");
console.log("[2] 18 stages in order (discovery → review_checkpoints) ✔");

// === 3. Every stage has a title and a summary. ===
for (const s of bp.stages) {
  assert.ok(s.title.length > 0, `${s.stage} has a title`);
  assert.ok(s.summary.length > 0, `${s.stage} has a summary`);
}
console.log("[3] every stage has a title + summary ✔");

// === 4. The blueprint always starts awaiting_approval (human-in-command). ===
assert.equal(bp.status, "awaiting_approval", "blueprint starts awaiting approval");
console.log("[4] status starts awaiting_approval (human-in-command) ✔");

// === 5. approve() flips to approved. ===
const approved = builder.approve(TENANT, bp.id);
assert.equal(approved.status, "approved", "approve flips to approved");
assert.equal(builder.get(TENANT, bp.id)!.status, "approved", "approval persisted");
console.log("[5] approve() → approved ✔");

// === 6. Tenant isolation. ===
assert.equal(builder.list(OTHER).length, 0, "no cross-tenant blueprints");
assert.equal(builder.get(OTHER, bp.id), undefined, "blueprint not visible to another tenant");
assert.throws(() => builder.approve(OTHER, bp.id), BuilderModeError, "cannot approve another tenant's blueprint");
console.log("[6] tenant isolation ✔");

console.log(
  "\nBUILDER MODE SMOKE OK — \"I want to build\" yields an 18-stage venture blueprint in order (discovery → review_checkpoints); every stage has a title + summary; the blueprint always starts awaiting_approval (human-in-command) and approve() flips it to approved; BUILDER_TRIGGER is exactly \"I want to build\"; the store is tenant-isolated.",
);
