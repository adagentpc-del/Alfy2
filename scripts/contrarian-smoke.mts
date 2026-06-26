/**
 * Runtime smoke for the "Contrarian View" lens. Proves it constructs the strongest credible opposing view —
 * weaving in caller-supplied counter-evidence and surfacing ignored risks, questionable assumptions, and
 * execution risks — with a recommendation. A pure-compute read model: deterministic, stores nothing,
 * tenant-scoped at the call site. Run with: `tsx scripts/contrarian-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ContrarianViewEngine } from "@alfy2/core";
import { ContrarianInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
void NOW;
const engine = new ContrarianViewEngine();

const counter1 = "Margins compress as compute costs rise";
const counter2 = "Switching costs are higher than the hype admits";
const view = engine.evaluate(
  TENANT,
  ContrarianInputSchema.parse({
    subject: "Fully autonomous enterprise agents",
    mainstream_view: "They will replace most knowledge work within two years.",
    counter_evidence: [counter1, counter2],
  }),
);

// === 1. The contrarian view is constructed. ===
assert.ok(view.contrarian_view.length > 0, "contrarian_view non-empty");
console.log("[1] contrarian_view constructed ✔");

// === 2. Caller-supplied counter-evidence is woven into evidence_for_contrarian. ===
assert.ok(view.evidence_for_contrarian.includes(counter1), "counter-evidence 1 included");
assert.ok(view.evidence_for_contrarian.includes(counter2), "counter-evidence 2 included");
console.log("[2] caller counter-evidence woven into evidence_for_contrarian ✔");

// === 3. Blind-spot surfaces are populated. ===
assert.ok(view.ignored_risks.length > 0, "ignored_risks non-empty");
assert.ok(view.questionable_assumptions.length > 0, "questionable_assumptions non-empty");
assert.ok(view.execution_risks.length > 0, "execution_risks non-empty");
console.log("[3] ignored risks / questionable assumptions / execution risks populated ✔");

// === 4. A recommendation is present. ===
assert.ok(view.recommendation.length > 0, "recommendation present");
console.log("[4] recommendation present ✔");

console.log(
  "\nCONTRARIAN SMOKE OK — a constructed opposing view that weaves in caller counter-evidence and surfaces ignored risks, questionable assumptions, and execution risks, closing with a pressure-test recommendation.",
);
