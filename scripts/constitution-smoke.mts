/**
 * Runtime smoke for the Constitution of Alfy². Proves the ten principles are a frozen catalog, that an
 * irreversible action without approval is gated to human approval (and violates "act conservatively"),
 * that approval clears the gate, that abandoning approved work without a documented reason violates
 * "finish what was started", and that a missing explanation violates "explain important decisions".
 * Run with: `tsx scripts/constitution-smoke.mts`.
 */
import assert from "node:assert/strict";
import { Constitution, PRINCIPLES } from "@alfy2/core";
import { ConstitutionCheckInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
void TENANT;
void NOW;
const c = new Constitution();

const check = (input: Record<string, unknown>) => c.check(ConstitutionCheckInputSchema.parse(input));

// === 1. Exactly ten principles — a frozen, canonical catalog. ===
assert.equal(c.principles().length, 10, "ten principles");
assert.equal(PRINCIPLES.length, 10, "PRINCIPLES has ten entries");
assert.ok(Object.isFrozen(PRINCIPLES), "PRINCIPLES is frozen");
console.log("[1] ten frozen principles ✔");

// === 2. Irreversible + unapproved → requires approval AND violates act_conservatively. ===
const gated = check({ description: "Wire $5k to a vendor", irreversible: true, approved: false, has_explanation: true, improves_outcome: true });
assert.equal(gated.requires_approval, true, "irreversible + unapproved requires approval");
assert.ok(gated.violations.includes("act_conservatively"), "act_conservatively is violated");
assert.equal(gated.compliant, false, "not compliant while act_conservatively is violated");
console.log("[2] irreversible + unapproved → requires approval + act_conservatively violated ✔");

// === 3. Irreversible + approved → compliant, no approval gate. ===
const approved = check({ description: "Wire $5k to a vendor", irreversible: true, approved: true, has_explanation: true, improves_outcome: true });
assert.equal(approved.requires_approval, false, "approval clears the gate");
assert.equal(approved.compliant, true, "irreversible + approved is compliant");
assert.ok(!approved.violations.includes("act_conservatively"), "act_conservatively upheld once approved");
console.log("[3] irreversible + approved → compliant, no approval needed ✔");

// === 4. Abandoning approved work with no documented reason → finish_what_started violated. ===
const abandoned = check({ description: "Drop the migration mid-flight", abandons_approved_work: true, documented_reason: "", has_explanation: true, improves_outcome: true });
assert.ok(abandoned.violations.includes("finish_what_started"), "finish_what_started violated when reason is empty");
assert.equal(abandoned.compliant, false, "not compliant");
console.log("[4] abandon approved work w/o reason → finish_what_started violated ✔");

// === 5. Missing explanation → explain_important_decisions violated. ===
const unexplained = check({ description: "Make an important call", has_explanation: false, improves_outcome: true });
assert.ok(unexplained.violations.includes("explain_important_decisions"), "explain_important_decisions violated without an explanation");
console.log("[5] missing explanation → explain_important_decisions violated ✔");

console.log(
  "\nCONSTITUTION SMOKE OK — ten frozen principles; irreversible+unapproved actions are gated for human approval and violate act_conservatively; approval clears the gate; abandoning approved work without a documented reason violates finish_what_started; a missing explanation violates explain_important_decisions.",
);
