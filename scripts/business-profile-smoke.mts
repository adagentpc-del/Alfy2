/**
 * Runtime smoke for the Business Operating Profile + Context Stack engine.
 * Proves: the five Tier-1 profiles seed (incl. Move Mi + StrataLogic), StrataLogic carries health
 * compliance caution + banned language, a Move Mi context stack assembles in the canonical 11-layer
 * order with security_compliance first and Move Mi's brand voice, and cross-business mixing is
 * BLOCKED (enforceNoCrossBusiness throws on a mismatch, passes on a match).
 * Run: `tsx scripts/business-profile-smoke.mts`.
 */
import assert from "node:assert/strict";
import { BusinessProfileEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new BusinessProfileEngine({ clock: () => NOW, idFactory: id });

// 1. Seed the five Tier-1 businesses.
const seeded = e.seedTier1Profiles(TENANT);
assert.equal(seeded.length, 5, "seeds exactly 5 Tier-1 profiles");
assert.equal(e.listProfiles(TENANT).length, 5, "5 profiles persisted");

const keys = new Set(e.listProfiles(TENANT).map((p) => p.business_key));
for (const k of ["alfie2", "move_mi", "divini_procure", "divini_partners", "stratalogic"]) {
  assert.ok(keys.has(k), `Tier-1 business "${k}" seeded`);
}
assert.ok(
  e.listProfiles(TENANT).every((p) => p.tier === "tier_1"),
  "all seeded profiles are tier_1",
);

// Idempotent re-seed does not duplicate.
e.seedTier1Profiles(TENANT);
assert.equal(e.listProfiles(TENANT).length, 5, "re-seed does not duplicate profiles");

// 2. StrataLogic carries the health compliance caution + banned language.
const strata = e.getProfile(TENANT, "stratalogic");
assert.ok(strata, "StrataLogic profile exists");
assert.ok(
  strata.compliance_caution.toLowerCase().includes("clinician") &&
    strata.compliance_caution.toLowerCase().includes("disclaimer"),
  "StrataLogic carries a health/wellness compliance caution",
);
assert.ok(
  strata.banned_language.includes("cure") && strata.banned_language.includes("guaranteed results"),
  "StrataLogic banned_language includes banned health terms",
);

// Spot-check Move Mi.
const moveMi = e.getProfile(TENANT, "move_mi");
assert.ok(moveMi, "Move Mi profile exists");
assert.equal(moveMi.brand_voice, "friendly, local, trustworthy", "Move Mi brand voice is set");

// 3. Build a context stack for a Move Mi task.
const stack = e.buildContextStack(TENANT, {
  business_key: "move_mi",
  task: "Draft a local social post promoting spring moving deals.",
  layer_content: { project_context: ["Spring 2026 referral campaign"] },
});

// Layer 1 is always security_compliance.
assert.equal(stack.layers[0]?.layer, "security_compliance", "layer 1 is security_compliance");
assert.equal(
  stack.layers[stack.layers.length - 1]?.layer,
  "task_instructions",
  "last layer is task_instructions",
);

// Layers are in the EXACT canonical order.
const CANONICAL = [
  "security_compliance",
  "global_rules",
  "founder_profile",
  "department_instructions",
  "role_instructions",
  "skill_playbook",
  "business_profile",
  "project_context",
  "relationship_history",
  "source_of_truth",
  "task_instructions",
];
assert.equal(stack.layers.length, 11, "context stack has all 11 layers");
assert.deepEqual(
  stack.layers.map((l) => l.layer),
  CANONICAL,
  "context stack layers are in canonical order",
);

// The stack carries Move Mi's brand voice (NOT another business's).
assert.equal(stack.brand_voice, "friendly, local, trustworthy", "stack carries Move Mi brand voice");
assert.equal(stack.business_key, "move_mi", "stack is scoped to Move Mi");

// Building a stack for a business with no profile throws.
assert.throws(
  () => e.buildContextStack(TENANT, { business_key: "no_such_business", task: "x" }),
  "building a stack for an unknown business throws",
);

// 4. Cross-business mixing is BLOCKED.
assert.throws(
  () => e.enforceNoCrossBusiness("move_mi", "divini_procure"),
  "enforceNoCrossBusiness throws across two different businesses",
);
assert.doesNotThrow(
  () => e.enforceNoCrossBusiness("move_mi", "move_mi"),
  "enforceNoCrossBusiness allows the same business",
);
assert.equal(
  e.wouldMixBusinessContext("move_mi", "divini_procure"),
  true,
  "wouldMixBusinessContext is true for different businesses",
);
assert.equal(
  e.wouldMixBusinessContext("move_mi", "move_mi"),
  false,
  "wouldMixBusinessContext is false for the same business",
);

console.log(
  "BUSINESS PROFILE SMOKE OK — 5 Tier-1 profiles, context stack ordered, cross-business mixing blocked",
);
