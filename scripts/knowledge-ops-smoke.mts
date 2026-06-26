/**
 * Runtime smoke for Knowledge Ops. Proves the operating library — NOT a quote library:
 * a source pipeline, the weekly Elite Operator Digest (surface only likely-leverage),
 * the Alyssa Adaptation Filter (pass a good fit, fail a generic/too-manual one),
 * knowledge governance (classify + stage-fit warnings), the six-lens scenario simulator,
 * and the experiment + learning repository.
 * Run: `tsx scripts/knowledge-ops-smoke.mts`.
 */
import assert from "node:assert/strict";
import { KnowledgeOpsEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new KnowledgeOpsEngine({ clock: () => NOW, idFactory: id });

// 1. Source library + pipeline — add two sources, advance one.
const s1 = e.addSource(TENANT, { source_name: "How to price anything", expert: "Alex Hormozi", kind: "youtube", url_ref: "https://y/1" });
const s2 = e.addSource(TENANT, { source_name: "Naval on leverage", expert: "Naval Ravikant", kind: "podcast", url_ref: "https://y/2" });
assert.equal(e.listSources(TENANT).length, 2, "two sources added");
assert.ok(e.listSources(TENANT).every((s) => s.status === "added"), "sources start at 'added'");
const advanced = e.advanceSource(TENANT, s1.id, "extracted");
assert.equal(advanced.status, "extracted", "source advanced to extracted");
assert.ok(advanced.summarized && advanced.principles_extracted, "advancing flips passed gates");
assert.ok(!advanced.mapped_to_businesses && !advanced.tested, "future gates not yet flipped");
assert.equal(e.listSources(TENANT, { status: "added" }).length, 1, "filter by status works");
void s2;

// 2. Weekly Elite Operator Digest — only likely-leverage surfaces. Don't overwhelm Alyssa.
const digest = e.generateDigest(TENANT, {
  week: "2026-W26",
  items: [
    { source: "Hormozi", principle: "Add a guarantee to the core offer", why_it_matters: "Lifts conversion", business_it_applies_to: "advisory", recommended_test: "A/B the guarantee", effort: "low", upside: "high", risk: "low" },
    { source: "Random", principle: "Rebuild the entire billing stack from scratch", why_it_matters: "Maybe cleaner", business_it_applies_to: "saas", recommended_test: "Full migration", effort: "high", upside: "high", risk: "high" },
  ],
});
assert.equal(digest.length, 2, "all digest items returned");
const surfaced = digest.filter((d) => d.surfaced);
assert.equal(surfaced.length, 1, "only the likely-leverage item is surfaced");
assert.ok(surfaced[0]!.principle.includes("guarantee"), "high-upside/low-effort/low-risk item surfaced");
assert.ok(digest.some((d) => !d.surfaced && d.effort === "high" && d.risk === "high"), "high-effort/high-risk item NOT surfaced");

// 3. Alyssa Adaptation Filter — pass a good fit, fail a generic/too-manual one.
const good = e.runAdaptationFilter(TENANT, {
  principle: "Add a guarantee to the core offer",
  business_key: "advisory",
  fits_model: true, fits_brand: true, fits_energy: true, protects_trust: true,
  creates_leverage: true, risks_generic: false, too_manual: false, ai_automatable: true, cheaply_testable: true,
});
assert.equal(good.passed, true, "good fit passes the adaptation filter");
assert.ok(good.recommendation.toLowerCase().includes("adapt"), "passing recommendation says adapt + test");

const bad = e.runAdaptationFilter(TENANT, {
  principle: "Cold DM 500 strangers a day by hand",
  business_key: "media_personal_brand",
  fits_model: true, fits_brand: false, fits_energy: false, protects_trust: false,
  creates_leverage: false, risks_generic: true, too_manual: true, ai_automatable: false, cheaply_testable: true,
});
assert.equal(bad.passed, false, "generic + too-manual principle fails");
assert.ok(bad.recommendation.includes("generic") && bad.recommendation.includes("too manual"), "failure reasons explain why");

// 4. Knowledge governance — classify + stage-fit warnings.
const entry = e.classify(TENANT, {
  insight: "Hire a VP of Sales and build a 20-rep outbound team",
  discipline: "sales",
  company_stage: "scaling",
  business_model: "saas",
  expected_roi: "high",
  confidence: 0.8,
});
assert.equal(entry.discipline, "sales", "insight classified into a discipline");
assert.equal(entry.company_stage, "scaling", "company stage recorded");

const warnings = e.stageFitWarnings("scaling", "first_revenue");
assert.ok(warnings.length > 0, "stage mismatch produces warnings");
assert.ok(
  warnings.some((w) => w.includes("scaling") && w.includes("first_revenue")),
  "flags scaling-advice-on-first_revenue",
);
assert.equal(e.stageFitWarnings("first_revenue", "first_revenue").length, 0, "matching stage produces no warning");

// 5. Scenario simulator — always all six lenses, deterministic.
const sim = e.simulateScenarios(TENANT, { strategy: "launch a paid newsletter", business_key: "media_personal_brand" });
assert.equal(sim.scenarios.length, 6, "simulator returns all six scenario options");
const kinds = new Set(sim.scenarios.map((sc) => sc.kind));
assert.equal(kinds.size, 6, "all six ScenarioKind options are distinct");
assert.ok(["fastest_cash", "highest_margin", "lowest_effort", "best_long_term_asset", "best_brand", "highest_automation"].every((k) => kinds.has(k as never)), "every lens present");
assert.ok(sim.scenarios.every((sc) => sc.recommendation.length > 0 && sc.kpis.length > 0), "each scenario has a recommendation + KPIs");

// 6. Experiment + learning repository — design, then record a validated result.
const exp = e.designExperiment(TENANT, {
  hypothesis: "Adding a guarantee lifts advisory close rate by 15%",
  business_key: "advisory",
  audience: "warm leads",
  asset: "sales page",
  channel: "email",
  timeline: "14 days",
  kpi: "close_rate",
  success_threshold: ">= +15%",
  failure_threshold: "< +5%",
  next_if_works: "Roll the guarantee into all offers",
  next_if_fails: "Test a softer risk-reversal instead",
});
assert.equal(exp.status, "untested", "experiment starts untested");
const recorded = e.recordExperimentResult(TENANT, exp.id, { status: "validated", result_notes: "Close rate +18%, kept." });
assert.equal(recorded.status, "validated", "experiment recorded as validated");
assert.ok(recorded.result_notes.includes("+18%"), "learning notes captured");
assert.ok(recorded.updated_at !== null, "mutable experiment got an updated_at");

// 7. Tenant isolation.
assert.equal(e.listSources("00000000-0000-0000-0000-0000000000ff").length, 0, "another tenant sees nothing");

console.log(
  `KNOWLEDGE OPS SMOKE OK — ${e.listSources(TENANT).length} sources (1 advanced), ` +
    `${digest.length} digest items (${surfaced.length} surfaced), adaptation filter pass+fail, ` +
    `classify + stage-fit flagged scaling-on-first_revenue, ${sim.scenarios.length} scenario lenses, ` +
    `experiment designed → validated`,
);
