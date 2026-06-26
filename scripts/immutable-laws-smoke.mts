/**
 * Runtime smoke for the Five Immutable Laws. Proves the frozen catalog of 5 laws, that a clean recommendation
 * is compliant, that harming the human is a HARD violation (Law 1), and that solving a repeat problem with
 * manual heroics violates Law 4. Pure — no tenancy. Run with: `tsx scripts/immutable-laws-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ImmutableLaws, LAWS } from "@alfy2/core";
import { LawCheckInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001"; // declared for parity; the laws are pure/global
void TENANT;
const NOW = new Date("2026-06-25T12:00:00.000Z");
void NOW;
const laws = new ImmutableLaws();

// === 1. The frozen catalog has exactly 5 laws. ===
assert.equal(laws.laws().length, 5, "5 immutable laws");
assert.equal(LAWS.length, 5, "exported LAWS has 5");
console.log("[1] catalog has 5 immutable laws ✔");

// === 2. A clean recommendation is compliant with a non-empty explanation. ===
const ok = laws.check(
  LawCheckInputSchema.parse({
    recommendation: "Build a reusable lead-triage SOP",
    harms_human: false, produces_reusable_ip: true, considers_capital_allocation: true,
    is_repeat_problem: true, builds_system: true, increases_freedom: true,
  }),
);
assert.equal(ok.compliant, true, "clean recommendation is compliant");
assert.ok(ok.explanation.length > 0, "explanation present");
console.log("[2] clean recommendation → compliant, explanation present ✔");

// === 3. harms_human=true is a HARD violation of Law 1. ===
const harm = laws.check(
  LawCheckInputSchema.parse({ recommendation: "Skip sleep to ship faster", harms_human: true, produces_reusable_ip: true, considers_capital_allocation: true, is_repeat_problem: false, builds_system: false, increases_freedom: true }),
);
assert.equal(harm.compliant, false, "harming the human is non-compliant");
assert.ok(harm.violations.includes("protect_the_human"), "Law 1 in violations");
console.log("[3] harms_human → non-compliant, 'protect_the_human' violated ✔");

// === 4. A repeat problem solved manually (no system) violates Law 4. ===
const heroics = laws.check(
  LawCheckInputSchema.parse({ recommendation: "Hand-process the weekly report again", harms_human: false, produces_reusable_ip: false, considers_capital_allocation: false, is_repeat_problem: true, builds_system: false, increases_freedom: false }),
);
assert.equal(heroics.compliant, false, "manual heroics on a repeat problem is non-compliant");
assert.ok(heroics.violations.includes("prefer_systems_over_heroics"), "Law 4 in violations");
console.log("[4] repeat problem + no system → 'prefer_systems_over_heroics' violated ✔");

console.log(
  "\nIMMUTABLE LAWS SMOKE OK — the frozen catalog has 5 laws, a clean recommendation is compliant with an explanation, harming the human hard-violates Law 1, and solving a repeat problem with manual heroics violates Law 4.",
);
